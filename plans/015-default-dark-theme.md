# Plan 015: Default the gateway to dark theme

> **Executor instructions**: This plan is a DIRECTION item — an option
> presented for the maintainer's judgment, not a confirmed improvement.
> Before executing, confirm with the operator that they want to proceed.
> The current dark-default was a deliberate convention (see `AGENTS.md:79`:
> "Dark-first: Default dark theme with light toggle"). Changing it is a UX
> policy decision, not just a code change.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- src/App.tsx src/hooks/useCuelume.ts`
> If either changed, stop and re-read the affected files before proceeding.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: MED (UX-policy change)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

`App.tsx:73` initializes `useState(false)` for `dark`, meaning the gateway
defaults to light theme on first load. AGENTS.md contradicts this: line 79
says "Dark-first: Default dark theme with light toggle". This is a small
UX policy mismatch with the docs.

Two options:
- **A: Default dark (match AGENTS.md).** Change `useState(false)` to
  `useState(true)`. Aligned with docs and current "agency" aesthetic.
- **B: Default light (current code).** Update AGENTS.md to remove the
  "dark-first" claim. Aligned with progressive enhancement — most modern
  sites default to user system theme and let them toggle.

This plan executes option A. If the maintainer prefers B, instead update
`AGENTS.md` and `useCuelume.ts` (which has a similar default) to remove
"dark-first" claims — that's a docs-only change, no plan needed.

## Current state

`src/App.tsx:73`:

```ts
const [dark, setDark] = useState(false);
```

`src/App.tsx:96-100`:

```ts
useEffect(() => {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
}, [dark]);
```

The toggle currently shows the *opposite* theme in the toggle button
(moon vs sun). If `dark` defaults to `true`, the toggle would show a sun
icon (i.e. "click to switch to light").

`src/hooks/useCuelume.ts:9` initializes the sound-enabled preference to
`true` (sound on by default). Same pattern as the dark default.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `bunx tsc --noEmit`  | exit 0              |
| Tests     | `bunx vitest run`    | all pass (existing tests) |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/App.tsx` — single-line default change
- `src/App.test.tsx` — update tests that assert the default theme (if any)

**Out of scope**:
- `src/components/ThemeToggle.tsx` — toggle component already works for
  any initial state
- `useCuelume.ts` — sound preference is orthogonal

## Git workflow

- Branch: `advisor/015-default-dark-theme`
- One commit: `feat(theme): default gateway to dark theme`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Change the default

In `src/App.tsx`, find:

```ts
const [dark, setDark] = useState(false);
```

Change to:

```ts
const [dark, setDark] = useState(true);
```

**Verify**: `bunx tsc --noEmit` exits 0.

### Step 2: Update affected tests

Run tests:

```bash
bunx vitest run
```

If any test asserts on the default theme (e.g. `expect(dark).toBe(false)`),
update it to `toBe(true)`. The most likely file is `src/App.test.tsx`.

**Verify**: all tests pass.

### Step 3: Verify dev server renders dark by default

```bash
bun run dev
```

Open `http://localhost:5173/` in a browser. The background should be the
dark Paper-grain variant. Toggle the theme button — it should switch to
light and the icon should flip.

**Verify**: dark on first paint; toggle works.

### Step 4: Build

```bash
bun run build
```

**Verify**: build exits 0.

### Step 5: Commit

```bash
git add src/App.tsx
# Plus any test files updated in step 2
git commit -m "feat(theme): default gateway to dark theme"
```

**Verify**: `git log --oneline -1` shows the commit; `git status` clean.

## Test plan

This plan has minimal test changes. The App component tests likely don't
assert on default theme — they test user-driven state changes. Confirm in
step 2; if any test breaks, that's the test bug, not the policy.

If you want to lock in the policy with a test:

```tsx
it("defaults to dark theme on mount", () => {
  // ... render <App />
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});
```

This is OPTIONAL — the existing tests + visual verification cover it.

## Done criteria

- [ ] `bunx vitest run` exits 0
- [ ] `bunx tsc --noEmit` exits 0
- [ ] `bun run build` exits 0
- [ ] Dev server renders dark theme on first paint
- [ ] `grep "useState(true)" src/App.tsx` matches the new default
- [ ] `git status` clean
- [ ] `plans/README.md` row for plan 015 updated to `DONE` (or
  REJECTED if the maintainer prefers option B)

## STOP conditions

Stop and report back if:
- Multiple tests fail after the change and you can't quickly identify
  which assertion is theme-related — STOP and ask the maintainer which
  option (A or B) they prefer.
- The visual comparison shows the dark default is materially worse than
  the light default (e.g. contrast issues) — STOP and reconsider.

## Maintenance notes

- If you want to add `prefers-color-scheme` support, that's a separate
  enhancement: read `window.matchMedia("(prefers-color-scheme: dark)")`
  in the initial state. Don't bundle that with this default change.
- The user can persist their toggle preference via localStorage if you
  add it later; right now each visit resets to the default.
- After landing, deploy and observe whether users toggle to light
  frequently (suggests the default is wrong); if many users do, revisit.
