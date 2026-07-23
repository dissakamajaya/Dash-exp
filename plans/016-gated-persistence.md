# Plan 016: Persist gateway selection only for authenticated users

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- src/App.tsx`
> If the in-scope file changed, the plan may no longer apply — STOP and
> review.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction, privacy
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

`App.tsx:102-109` persists the user's selection (`{appId, userId}`) to
`localStorage` under `hox-gateway-selection`. This happens whenever the
selection state changes — including when the user is NOT logged in.

Two concerns:

1. **Privacy**: even unauthenticated users get their selection persisted.
   If a user selects "Finance" on a shared device (laptop at a coffee
   shop), the next person to open the gateway sees the same selection
   in the password form. The selection isn't secret, but it's a UX
   papercut and a minor data-residue concern.

2. **Stale state**: pre-auth selections persist across sessions. If the
   user makes a selection, closes the tab without logging in, then opens
   the gateway again — the password form shows the OLD selection. This
   surprises users (they wanted to start fresh).

Fix: gate persistence behind an authenticated session. Pre-auth selection
is in-memory only; post-auth it persists.

## Current state

`src/App.tsx:102-109`:

```ts
useEffect(() => {
  try {
    if (!selection.appId && !selection.userId) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // The gateway still works when storage is unavailable.
  }
}, [selection]);
```

The effect runs whenever `selection` changes. There's no session check.

`src/App.tsx:74`:

```ts
const [selection, setSelection] = useState<SavedSelection>(loadSelection);
```

`loadSelection()` (defined at lines 37-51) reads from localStorage at
mount and validates the values against `DESTINATIONS` and `USERS`. This
runs on every mount, regardless of auth state.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `bunx tsc --noEmit`  | exit 0              |
| Tests     | `bunx vitest run`    | all pass            |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/App.tsx` — gate the persist effect and the initial load

**Out of scope**:
- The persistence key (`hox-gateway-selection`) — keep it
- Other localStorage uses (sound preference in `useCuelume.ts`) — orthogonal

## Git workflow

- Branch: `advisor/016-gated-persistence`
- One commit: `feat(privacy): only persist selection for authenticated sessions`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Modify the persist effect

In `src/App.tsx`, find:

```ts
useEffect(() => {
  try {
    if (!selection.appId && !selection.userId) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // The gateway still works when storage is unavailable.
  }
}, [selection]);
```

Change to:

```ts
useEffect(() => {
  if (!session) return;
  try {
    if (!selection.appId && !selection.userId) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // The gateway still works when storage is unavailable.
  }
}, [selection, session]);
```

The `session` dependency ensures the effect re-runs (and re-evaluates the
guard) whenever auth state changes. Without auth, no localStorage write
happens.

**Verify**: `bunx tsc --noEmit` exits 0.

### Step 2: Modify the initial load

`loadSelection()` runs at mount and reads localStorage. If the user has a
session but the stored selection is stale (e.g. someone logged out and back
in as a different user), the load could bring back the wrong userId.

Find:

```ts
const [selection, setSelection] = useState<SavedSelection>(loadSelection);
```

Change to:

```ts
const [selection, setSelection] = useState<SavedSelection>(() =>
  session ? loadSelection() : { appId: null, userId: null }
);
```

The `session` here is from the closure when `App()` first renders —
which is the initial `null`. So this initializer effectively always
returns `{ appId: null, userId: null }` on mount. That's fine because the
session is loaded asynchronously (the `getSession()` effect at line 117).

The actual session-aware load happens in the existing `useEffect` at line
117:

```ts
.then((value) => {
  // ...
  setSelection((current) => ({ ...current, userId: value.staffId }));
})
```

This already overwrites `userId` when session loads. So step 2 may be
optional — verify by running tests.

**Verify**: `bunx vitest run` exits 0.

### Step 3: Add a test

In `src/App.test.tsx` (or new file), add a test that asserts:

```tsx
it("does not persist selection to localStorage when not authenticated", () => {
  localStorage.removeItem("hox-gateway-selection");
  render(<App />);
  // Simulate user clicking a destination shape (without authenticating).
  // This is implementation-detail-dependent — read App.test.tsx for the
  // existing selection-click helper.
  // ...click...
  expect(localStorage.getItem("hox-gateway-selection")).toBeNull();
});
```

**Verify**: new test passes.

### Step 4: Run full suite + build

```bash
bunx vitest run
bun run build
```

**Verify**: all tests pass; build exits 0.

### Step 5: Commit

```bash
git add src/App.tsx
# Plus test file if updated in step 3
git commit -m "feat(privacy): only persist selection for authenticated sessions"
```

**Verify**: `git log --oneline -1` shows the commit; `git status` clean.

## Test plan

The new test in step 3 covers:

| Test | Failure class caught |
|------|---------------------|
| Selection NOT persisted when unauth | Reverting the `session` guard |
| (Optional) Selection persists when authenticated | Forgetting to wire up the session-aware path |

## Done criteria

- [ ] `bunx vitest run` exits 0; new test passes
- [ ] `bunx tsc --noEmit` exits 0
- [ ] `bun run build` exits 0
- [ ] `grep "if (!session) return;" src/App.tsx` matches
- [ ] `git status` clean
- [ ] `plans/README.md` row for plan 016 updated to `DONE`

## STOP conditions

Stop and report back if:
- Removing the persist effect breaks the existing selection-load
  flow (i.e. post-login the user's prior selection doesn't restore). If
  this happens, the fix is to set the initial `userId` from `session`
  at the right moment — that's a more invasive change and deserves its
  own plan.
- The test setup can't simulate a selection click without auth (means
  the test file needs a richer mock for the auth state). STOP and ask.

## Maintenance notes

- If you ever add a "remember me" feature, this gate becomes
  `session || rememberMeFlag`. Keep the storage key; add the flag.
- A future improvement: store only `{ appId }` for the pre-auth path
  (so the grid opens with the destination selected but no user), saving
  the userId for post-auth. That's out of scope for this plan.
- This plan removes a subtle footgun: if a user selects "Finance" on a
  shared kiosk, logs out, walks away, the next user sees the same
  selection in the password form. Not a security issue, but a UX wart.
