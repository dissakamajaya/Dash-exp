# 001 — Cut app entrance duration to 400ms

- **Status**: DONE
- **Commit**: a86bf25
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 1 file, 1 line

## Problem

The main app container (wraps the entire icon grid + confirm panel) animates with `duration: 0.7` (700ms). This fires on **every page load** and is the first animation every user sees. Per `AUDIT.md` category 2: general UI animations stay under 300ms; even modal/drawer ceiling is 500ms. 700ms exceeds both by 200ms+.

```tsx
// src/App.tsx:285-288 — current
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
```

## Target

```tsx
// target
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
```

- Duration: **0.7 → 0.4** (sits comfortably between 300ms and the modal ceiling, brisk enough to feel like the app "lands" not "drifts in").
- Y offset stays at 16 — gives it presence without feeling heavy.
- Easing unchanged — same strong ease-out curve already in use.

## Repo conventions to follow

- The exact easing `[0.22, 1, 0.36, 1]` is the repo's house curve (used 4× in `App.tsx`). Keep it.
- Duration 0.4 puts the entrance in the same register as the destination-confirm panel (`:323` = 0.42s) — cohesion between entrance types.

## Steps

1. In `src/App.tsx:288`, change `duration: 0.7` → `duration: 0.4`.

## Boundaries

- Do NOT touch the other two entrance blocks at `:205` (auth-blocked, 0.5s) and `:235` (coming-soon, 0.55s) — those are state-driven, occasional, and already inside the modal budget.
- Do NOT change the y offset or easing — only the duration value.
- No new dependencies.

## Verification

- **Mechanical**: `bun run build` succeeds; `bun run test` 14/14 pass.
- **Feel check**: hard reload `http://localhost:5173/`. Confirm the icon row fades+rises in noticeably faster — should feel like the app is *ready*, not *arriving*. In DevTools Animations panel slow to 25% — entrance should finish within ~1.6s playback at that speed.
- **Done when**: hard reload feels snappier; the animation no longer registers as a "load delay" to a first-time visitor.
