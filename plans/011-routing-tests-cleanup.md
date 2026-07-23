# Plan 011: Add tests for worker/index.ts routing + remove dead SELECTOR_ITEMS

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- worker/index.ts src/App.tsx src/data/gateway.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests, tech-debt
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

Two related cleanups bundled into one plan:

1. **`worker/index.ts` has no tests.** It's the entry point that routes
   `/api/session`, `/api/session/login`, `/api/session/logout`, and serves
   static assets. A regression in routing logic ships silently. Routing
   bugs would manifest as 404s or wrong-endpoint dispatch — both catchable
   with the right tests.

2. **`SELECTOR_ITEMS` from `data/gateway.ts` is exported but unused at
   runtime.** `App.tsx:296` filters it down to destinations only:
   `SELECTOR_ITEMS.filter((item) => item.kind === "destination")`. The
   `kind: "user"` branch is dead. Removing the dead union simplifies
   `SelectorItem` and reduces imports.

The bundling is justified because both touch `data/gateway.ts` and the tests
in (1) cover the same files. Two separate plans would add an extra
rebase step.

## Current state

`worker/index.ts` (89 lines):

```ts
export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/session") return await handleSession(request, env);
      if (url.pathname === "/api/session/login") return await handleLocalLogin(request, env);
      if (url.pathname === "/api/session/logout") return handleLocalLogout(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      return failureResponse(error);
    }
  },
};
```

The fetch handler is hard to test directly because it's inside a `default
export` object. The cleanest approach: extract the handler into a named
function `handleFetch(request, env, assetsFetch)` that takes the asset
fetcher as a dependency. Then test it with a stub.

`src/data/gateway.ts:55-58`:

```ts
export const SELECTOR_ITEMS: SelectorItem[] = [
  ...DESTINATIONS.map((item) => ({ ...item, kind: "destination" as const })),
  ...USERS.map((item) => ({ ...item, kind: "user" as const })),
];
```

`App.tsx:296`:

```tsx
<ShapeGrid items={SELECTOR_ITEMS.filter((item) => item.kind === "destination")} />
```

The user items are dropped on the floor.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `bunx tsc --noEmit`  | exit 0              |
| Tests     | `bunx vitest run`    | all pass (existing 21 + new tests) |

## Scope

**In scope** (the only files you should modify):
- `worker/index.ts` — extract handler for testability, add test file
- `worker/index.test.ts` (create)
- `src/data/gateway.ts` — remove dead `SELECTOR_ITEMS` export
- `src/App.tsx` — update import + filter to use `DESTINATIONS` directly
- Any test file that imports `SELECTOR_ITEMS` — adjust imports

**Out of scope**:
- The auth handlers (`handleSession`, `handleLocalLogin`, `handleLocalLogout`)
  are not tested here — they're integration-tested via `worker/auth.test.ts`
  already. This plan only covers the routing layer.
- `data/gateway.ts` field renames (those go in plan 007).

## Git workflow

- Branch: `advisor/011-routing-tests-cleanup`
- Two commits (one per cleanup):
  1. `test(worker): cover index.ts fetch routing`
  2. `refactor(data): remove dead SELECTOR_ITEMS export`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Extract `handleFetch` from `worker/index.ts`

Refactor `worker/index.ts`:

```ts
import { ... } from "./...";

export async function handleFetch(
  request: Request,
  env: WorkerEnv,
  assetsFetch: (req: Request) => Promise<Response>,
): Promise<Response> {
  const url = new URL(request.url);
  try {
    if (url.pathname === "/api/session") return await handleSession(request, env);
    if (url.pathname === "/api/session/login") return await handleLocalLogin(request, env);
    if (url.pathname === "/api/session/logout") return handleLocalLogout(request, env);
    return assetsFetch(request);
  } catch (error) {
    return failureResponse(error);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleFetch(request, env, (req) => env.ASSETS.fetch(req));
  },
} satisfies ExportedHandler<WorkerEnv>;
```

**Verify**: `bunx tsc --noEmit` exits 0.

### Step 2: Create `worker/index.test.ts`

```ts
import { describe, expect, it, vi } from "vitest";
import { handleFetch } from "./index";
import { AuthFailure } from "./types";
import type { WorkerEnv } from "./types";

const env = { ENVIRONMENT: "local" } as WorkerEnv;
const assetsFetch = vi.fn(async () => new Response("asset", { status: 200 }));

describe("handleFetch routing", () => {
  it("dispatches GET /api/session to handleSession", async () => {
    // Stub handleSession by making it throw a known AuthFailure, then check
    // the response is the corresponding JSON. The simplest test is "GET
    // /api/session is not 404 and not an asset fetch".
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    // Easier: just verify the URL is recognized by the dispatch — assetsFetch
    // is called only when no API route matches. For the API routes, we mock
    // the underlying handler chain.
  });

  it("calls assetsFetch for non-API paths", async () => {
    assetsFetch.mockClear();
    await handleFetch(new Request("https://example.com/"), env, assetsFetch);
    expect(assetsFetch).toHaveBeenCalled();
  });

  it("does NOT call assetsFetch for /api/session", async () => {
    assetsFetch.mockClear();
    // This will throw (no real session), but that's OK — we just verify
    // assetsFetch was not called.
    try {
      await handleFetch(new Request("https://example.com/api/session"), env, assetsFetch);
    } catch {}
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it("converts AuthFailure to JSON response", async () => {
    // /api/session/login without a body triggers an AuthFailure in
    // handleLocalLogin → readLoginBody returns null → throws AuthFailure(400).
    const req = new Request("https://example.com/api/session/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await handleFetch(req, env, assetsFetch);
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
  });
});
```

Adjust the test setup to match `worker/auth.test.ts` patterns. Use the
fixture env from that file. The exact mocks depend on how the auth
handlers behave in the test env.

**Verify**: `bunx vitest run worker/index.test.ts` exits 0.

### Step 3: Remove `SELECTOR_ITEMS` from `src/data/gateway.ts`

Delete lines 55-58 (the `SELECTOR_ITEMS` export). Also delete the
`SelectorItem` type alias (lines 28-35) — it's only used to construct the
dead union.

**Verify**: `git grep "SELECTOR_ITEMS" src/` returns no matches.

### Step 4: Update `src/App.tsx`

Find the line:

```tsx
<ShapeGrid items={SELECTOR_ITEMS.filter((item) => item.kind === "destination")} />
```

Change to:

```tsx
<ShapeGrid items={DESTINATIONS} />
```

Remove `SELECTOR_ITEMS` from the import list (line 13). If the import order
changes as a result, leave a one-line gap or sort alphabetically — match
the existing style.

**Verify**: `bunx tsc --noEmit` exits 0; `bunx vitest run` exits 0.

### Step 5: Update other imports

Run `git grep "SELECTOR_ITEMS"` and `git grep "SelectorItem"`. Anything
remaining needs updating. Likely candidates:

- Any test file (`src/App.test.tsx`, `src/App.selection.test.tsx`,
  `src/App.route.test.tsx`) that imports the dead export. Replace with
  `DESTINATIONS` or `USERS` as appropriate.

**Verify**: `git grep "SELECTOR_ITEMS\|SelectorItem" src/` returns no
matches.

### Step 6: Run full test suite + build

```bash
bunx vitest run
bun run build
```

**Verify**: all tests pass (21 + new); build exits 0.

### Step 7: Commit (two commits)

```bash
git add worker/index.ts worker/index.test.ts
git commit -m "test(worker): cover index.ts fetch routing"

git add src/data/gateway.ts src/App.tsx
# Plus any test files that needed import updates
git commit -m "refactor(data): remove dead SELECTOR_ITEMS export"
```

**Verify**: `git log --oneline -2` shows both commits; `git status` clean.

## Test plan

This plan adds tests for `worker/index.ts` covering:

| Test | Failure class caught |
|------|---------------------|
| Asset path → ASSETS.fetch called | Routing regression |
| API path → ASSETS.fetch NOT called | Dispatcher leaks |
| Auth failure → JSON response | Error handler regression |

The `SELECTOR_ITEMS` cleanup is bundling for unrelated reasons (same files
touched). It's verified by `git grep` finding no remaining references.

## Done criteria

- [ ] `bunx vitest run` exits 0; new index tests pass
- [ ] `bunx tsc --noEmit` exits 0
- [ ] `bun run build` exits 0
- [ ] `git grep "SELECTOR_ITEMS\|SelectorItem" src/ worker/` returns no matches
- [ ] `git status` clean
- [ ] `plans/README.md` row for plan 011 updated to `DONE`

## STOP conditions

Stop and report back if:
- Extracting `handleFetch` breaks the wrangler deploy (test with `bun run
  deploy --dry-run` if available; otherwise just `bun run build`). The
  `default export { fetch }` is what wrangler binds — keep that signature.
- The test fixture env doesn't have all required fields, causing throws
  in handlers unrelated to routing. Stub the auth handlers instead of
  calling them — `vi.mock("./auth", ...)` if needed.
- Removing `SELECTOR_ITEMS` breaks a third test file in an unexpected way
  (e.g. test imports it for setup data). Update the imports and continue;
  if the test logic depended on the user-kind shape being present, that's
  a test bug — STOP and report.

## Maintenance notes

- If you add a new API route to `worker/index.ts`, add a routing test in
  the same commit. The test file is small (~30 lines); extending it is cheap.
- The `assetsFetch` parameter was added to make the function testable. If
  someone refactors the default export to call `env.ASSETS.fetch` directly,
  the tests will break — that's the point: the dependency injection makes
  routing logic observable.
- The `SELECTOR_ITEMS` cleanup is small. If the data shape ever needs to
  express "destination + paired user" (e.g. for a future preset), reintroduce
  it as `pairedItems` or similar and keep the type union explicit.
