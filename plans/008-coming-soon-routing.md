# Plan 008: Allow coming-soon hash routes to render without a session

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- src/App.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

The gateway's hash-routed splash screen (e.g. `dash.houseofexp.com/#/rental`)
is meant to show a destination's name + "Segera hadir" message for
coming-soon apps. The current guard at `App.tsx:227`
(`if (routeApp && session)`) requires an authenticated session to render
the splash. Pre-auth users hitting a coming-soon URL see the auth gate
("Akses ditolak") instead, which is wrong: coming-soon info should be
public — it's literally "this app isn't ready yet."

## Current state

Relevant code in `src/App.tsx`:

```ts
// ~line 192
if (authLoading || blockedByAuth) {
  // Render "Akses ditolak" / "Memeriksa sesi" full-screen
}

// ~line 227
if (routeApp && session) {
  // Render splash with destination name + "Segera hadir" / selected user name
}

// Fall through to grid view
```

`routeApp` is derived from the URL hash via `DESTINATIONS.find(... route)`.
For coming-soon destinations, the URL alone should be enough to render the
splash — no auth needed because the splash reveals no private state.

The current behavior: if you visit `/#/rental` while logged out, you see
"Akses ditolak" instead of "Rental — Segera hadir."

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `bunx tsc --noEmit`  | exit 0              |
| Tests     | `bunx vitest run`    | all pass (14/14)    |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/App.tsx` — single-line guard change at the route-splash check
- `src/App.test.tsx` or a new test file — add a test for the new behavior

**Out of scope**:
- The auth gate (`authLoading || blockedByAuth`) — leave that alone.
- Any change to `data/gateway.ts` or the splash render body.

## Git workflow

- Branch: `advisor/008-coming-soon-routing`
- One commit: `fix(routing): render coming-soon splash without requiring session`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Update the guard at `src/App.tsx`

Find the line:

```ts
if (routeApp && session) {
```

Change to:

```ts
if (routeApp && (session || routeApp.comingSoon)) {
```

This allows the splash to render when:
- The user is authenticated (current behavior), OR
- The destination is marked `comingSoon: true` (new behavior — public info card).

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 2: Verify the auth gate still runs first

Confirm the auth-gate branch (`if (authLoading || blockedByAuth)`) appears
BEFORE the route-splash branch in `App.tsx`. This ensures blocked users
still see "Akses ditolak" instead of any splash. Read lines 190-230 to
verify ordering.

**Verify**: `grep -n "if (authLoading\|if (routeApp" src/App.tsx` shows the
auth gate at a lower line number than the route-splash.

### Step 3: Add a test for the new behavior

Create `src/App.route.test.tsx` (new file) with the following structure.
Use `App.test.tsx` as the exemplar for imports and setup.

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock session to return null (logged out)
// Mock hash to "#/rental" (a coming-soon destination)
describe("coming-soon route splash", () => {
  beforeEach(() => {
    window.location.hash = "#/rental";
    // ... session mocks
  });

  it("renders the destination name when route is coming-soon", async () => {
    render(<App />);
    expect(await screen.findByText("Rental")).toBeDefined();
  });

  it("does not render for active destinations without a session", async () => {
    window.location.hash = "#/portal";
    render(<App />);
    // Should show the auth gate, NOT the portal splash
    expect(screen.queryByText("Portal")).toBeNull();
  });
});
```

You will need to match the mocks already used in `App.test.tsx:1-45` for
`useCuelume`, `getSession`, and `localLogin`. Read that file first.

**Verify**: `bunx vitest run src/App.route.test.tsx` → 2 tests pass.

### Step 4: Run full test suite + build

```bash
bunx vitest run
bun run build
```

**Verify**: all tests pass; build succeeds.

### Step 5: Commit

```bash
git add src/App.tsx src/App.route.test.tsx
git commit -m "fix(routing): render coming-soon splash without requiring session"
```

**Verify**: `git log --oneline -1` shows the commit; `git status` clean.

## Test plan

Two new tests:
1. Coming-soon route (`#/rental`) renders the splash with destination name when logged out.
2. Active route (`#/portal`) does NOT render the splash when logged out (still shows auth gate).

These tests are the safety net for the guard change. Without them, a future
edit could silently regress the public-coming-soon behavior.

## Done criteria

- [ ] `bunx tsc --noEmit` exits 0
- [ ] `bunx vitest run` exits 0; new route tests pass
- [ ] `bun run build` exits 0
- [ ] `grep "routeApp && (session || routeApp.comingSoon)" src/App.tsx` matches
- [ ] `git status` clean
- [ ] `plans/README.md` row for plan 008 updated to `DONE`

## STOP conditions

Stop and report back if:
- The auth-gate ordering check in step 2 fails (the gate appears AFTER the
  route-splash branch). Don't reorder — STOP and report.
- The new test setup can't reuse mocks from `App.test.tsx` (signals
  the test file needs its own refactor first; that's a separate plan).
- `vitest run` shows the existing App.test.tsx tests now fail (means the
  guard change has wider blast radius than this plan anticipated).

## Maintenance notes

- If you add a future feature that requires auth even for coming-soon routes
  (e.g. a beta-access flag), put the check inside the splash body, not on the
  guard. The guard should remain `routeApp && (session || routeApp.comingSoon)`
  with a single meaning: "this route's info card is public."
- The `selectedUser` line in the splash body (`{routeApp.comingSoon ? "Segera hadir" : selectedUser?.name}`)
  already handles the missing-user case correctly; no change needed there.
