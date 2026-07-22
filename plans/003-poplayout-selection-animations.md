# 003 — Switch AnimatePresence to popLayout for hint + confirm panel

- **Status**: DONE
- **Commit**: a86bf25
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 1 file, 2 ranges

## Problem

Both the hint text and the destination-confirm panel use `AnimatePresence mode="wait"`, which serializes exit-then-enter animations. The destination-confirm panel swap (hint-out → confirm-in) is the action users will do most often after landing on the gateway — select an app, see the confirm panel, deselect, see the hint again, pick another. With `mode="wait"`, each cycle stacks exit (0.35s) + enter (0.42s) = **~770ms of perceived lag** during rapid selection churn.

Per `AUDIT.md` category 4: rapidly-triggered reversible UI must use transitions (or springs) that retarget, not serialize.

```tsx
// src/App.tsx:300-314 — current
<AnimatePresence mode="wait">
  {!(selectedApp && selectedUser) && (
    <motion.p
      key={selectedApp ? "pending-user" : "pick-app"}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35 }}
```

```tsx
// src/App.tsx:316-369 — current
<AnimatePresence mode="wait">
  {selectedApp && selectedUser && (
    <motion.div
      key={`${selectedApp.id}-${selectedUser.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
```

## Target

```tsx
// target — both AnimatePresence blocks
<AnimatePresence mode="popLayout">
```

Just removing the explicit `mode="wait"` (Motion's default is to crossfade) would also work, but `mode="popLayout"` is better here because:
- It removes the exiting element from the layout flow immediately, so the incoming element can position itself without waiting.
- It avoids the two-panel vertical-overlap double-render that plain crossfade would cause (hint text and confirm panel occupy the same vertical slot).
- It still keeps exit animations running (the panel fades/slides out *as* the new one comes in), preserving spatial coherence.

## Repo conventions to follow

- No existing precedent for `mode` in this repo — both blocks currently use `mode="wait"`. Default Motion behavior (crossfade) is the fallback; `popLayout` is one of Motion's three valid modes (`sync` | `popLayout` | `wait`), used when layout-displacing components swap in/out.

## Steps

1. In `src/App.tsx:300`, change `<AnimatePresence mode="wait">` → `<AnimatePresence mode="popLayout">`.
2. In `src/App.tsx:316`, change `<AnimatePresence mode="wait">` → `<AnimatePresence mode="popLayout">`.

That's the only change required. The `initial`, `animate`, `exit`, `transition` props on the inner `motion.p` and `motion.div` stay as-is — `popLayout` only changes *when* they're sequenced, not the animations themselves.

## Boundaries

- Do NOT change the inner motion components' `initial`/`animate`/`exit`/`transition` — the y-offset fade is correct.
- Do NOT switch to `mode="sync"` — that would render both at once, causing double-height layout.
- Do NOT touch the route-app screen's `motion.div` (`src/App.tsx:232-235`) — that's a one-shot entrance, no AnimatePresence around it.
- No new dependencies.

## Verification

- **Mechanical**: `bun run build` succeeds; `bun run test` 14/14 pass.
- **Feel check**: hard reload `http://localhost:5173/`. Click Portal → confirm panel appears; click background to deselect → hint text appears; click Journal → confirm panel swaps in for the new app. Spamming this cycle should feel continuous, not queued. In DevTools Animations panel: outgoing and incoming animations should overlap in time, not run back-to-back.
- **Visual**: confirm there is no frame where both the hint text and the confirm panel are visible at full opacity (popLayout removes the outgoing element from layout immediately; the visual fade-out is graceful but the layout reflows as soon as exit starts).
- **Done when**: the perceived delay between selecting a different destination and seeing the new confirm panel drops to ~the exit-or-enter duration alone (~0.42s), not their sum.
