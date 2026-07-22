# 002 — Add tap feedback to ShapeGrid icon buttons

- **Status**: DONE
- **Commit**: a86bf25
- **Severity**: MEDIUM
- **Category**: Physicality & origin (press feedback)
- **Estimated scope**: 1 file, 1 line

## Problem

The ShapeGrid icon buttons — the app's primary, most-frequent interaction (hit every selection in every session) — have hover state via `animate={{ scale: hovered ? 1.08 : ... }}` but **no `whileTap`**. Clicking gives zero tactile response. Per `AUDIT.md` category 3: pressable elements must have press feedback; recommended `transform: scale(0.95–0.98)` on `:active` / `whileTap`.

The submit button at `src/App.tsx:356-365` already does this correctly — same scale, same pattern, established as the in-repo convention:

```tsx
// src/App.tsx:356-365 — current (exemplar)
<motion.button
  type="submit"
  disabled={loading || (!session && !password)}
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.98 }}
```

## Target

```tsx
// src/components/ShapeGrid.tsx:213-285 — target
<motion.button
  key={`${item.kind}-${item.id}`}
  type="button"
  ...
  whileTap={{ scale: 0.97 }}
  animate={{
    opacity,
    scale: hovered
      ? 1.08
      ...
```

- `whileTap={{ scale: 0.97 }}` — slightly more aggressive than the submit button (0.98) because icons are larger touch targets and benefit from a more visible press; stays in the audit's recommended 0.95–0.98 range.
- The `whileTap` is composable with the existing `animate={{ scale: ... }}` — Motion handles the precedence (whileTap overrides animate during press).
- No `whileHover` change needed — already correct via animate.

## Repo conventions to follow

- In-repo exemplar: `src/App.tsx:356-365` (submit button). Use `whileTap={{ scale: 0.98 }}` shape and naming.
- Spring transition on `animate` stays untouched (`{ type: "spring", stiffness: 290, damping: 24 }`) — applies to hover/select state changes. `whileTap` uses Motion's default press spring unless specified.

## Steps

1. In `src/components/ShapeGrid.tsx`, add `whileTap={{ scale: 0.97 }}` to the `motion.button` at line 213. Place it on its own line between `aria-pressed={selected}` (line 220) and `onMouseEnter` (line 221), matching the exemplar's prop ordering convention from the submit button.

## Boundaries

- Do NOT change `whileHover`, `animate`, or `transition` props — those handle hover/select state correctly.
- Do NOT add `whileTap` to the user-icon pulse animation (line 264) — user icons no longer render (per earlier removal); the pulse code is dead and out of scope here.
- Do NOT touch the submit button — already correct.
- No new dependencies.

## Verification

- **Mechanical**: `bun run build` succeeds; `bun run test` 14/14 pass.
- **Feel check**: hard reload `http://localhost:5173/`. Press and hold a destination icon — should scale down to 0.97 immediately (snappy press) and spring back to 1.0 on release (overrides the hover scale). Spam-click across multiple icons: each press visibly compresses — no missed tactile response.
- **Reduced motion**: toggle OS reduced-motion on. The `whileTap` scale should be dropped (Motion's reducedMotion="user" handles this automatically via the `MotionConfig` in `App.tsx:274`). Verify no jarring scale-down on press under reduced motion.
- **Done when**: every destination button visibly compresses on press; release springs back smoothly.
