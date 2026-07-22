# 005 — Extract shared motion tokens (EASE_OUT + duration scale)

- **Status**: DONE
- **Commit**: a86bf25
- **Severity**: LOW-MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 new file + 6 call-site updates

## Problem

The cubic-bezier `[0.22, 1, 0.36, 1]` is hand-typed verbatim **4 times** in `src/App.tsx` (lines 205, 235, 288, 323). Durations `0.35` / `0.42` / `0.5` / `0.55` / `0.7` are scattered without a shared scale. No `--ease-*` or `--duration-*` CSS custom properties exist; no shared JS constants either. Per `AUDIT.md` category 7: hand-typed near-identical curves and durations are a consolidation finding.

## Target

Create a tiny local module with the project's shared curves and a small named duration scale. Replace the 4 hand-typed easing literals with the constant and the 5 unrelated durations with the appropriate scale value.

### New file: `src/lib/motion.ts`

```ts
// Shared motion tokens for the gateway. Keep this file the single source of
// truth for curves and durations — call sites import from here, never re-type.

// The project's strong ease-out. Used for entrances, accent shifts, fade-ins.
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Duration scale (seconds). Use the closest named match rather than free-form
// values so the whole app sits in the same register.
export const DURATION = {
  instant: 0.1,   // press feedback, color flips
  fast:    0.2,   // tooltip / hover swaps
  base:    0.3,   // small UI transitions (input, toggles)
  medium:  0.4,   // panel entrances, hint text
  slow:    0.55,  // modal-scale entrances (rare state changes)
} as const;
```

### Call-site updates in `src/App.tsx`

```tsx
// line 205 (was: ease: [0.22, 1, 0.36, 1], duration: 0.5)
import { EASE_OUT, DURATION } from "@/lib/motion";
...
transition={{ duration: DURATION.medium, ease: EASE_OUT }}

// line 235 (was: duration: 0.55, ease: [0.22, 1, 0.36, 1])
transition={{ duration: DURATION.slow, ease: EASE_OUT }}

// line 288 (was: duration: 0.4, ease: [0.22, 1, 0.36, 1]) — already 0.4 after plan 001
transition={{ duration: DURATION.medium, ease: EASE_OUT }}

// line 323 (was: duration: 0.42, ease: [0.22, 1, 0.36, 1])
transition={{ duration: DURATION.medium, ease: EASE_OUT }}
```

```tsx
// line 307 — hint text AnimatePresence (was: transition={{ duration: 0.35 }})
transition={{ duration: DURATION.medium, ease: EASE_OUT }}
```

```tsx
// src/components/ThemeToggle.tsx:25 (unchanged shape — already a spring, not in scope)
```

## Repo conventions to follow

- File path: `src/lib/motion.ts` — matches the existing `src/lib/session.ts` pattern (small, focused, no React deps).
- Export style: named exports, `const`, no default. Matches `src/lib/session.ts`.
- Type: `[number, number, number, number]` literal tuple — Motion accepts this shape verbatim, matches the inline literals being replaced.
- The duration values map to the existing in-file durations: 0.35→medium, 0.42→medium, 0.5→medium, 0.55→slow, 0.7→medium (after plan 001 cuts it). This is a *renaming* exercise, not a value change.

## Steps

1. Create `src/lib/motion.ts` with the two exports above.
2. In `src/App.tsx`, add `import { EASE_OUT, DURATION } from "@/lib/motion";` to the existing import block at the top.
3. In `src/App.tsx:205`, replace `ease: [0.22, 1, 0.36, 1]` → `ease: EASE_OUT` and `duration: 0.5` → `duration: DURATION.medium`.
4. In `src/App.tsx:235`, replace `ease: [0.22, 1, 0.36, 1]` → `ease: EASE_OUT` and `duration: 0.55` → `duration: DURATION.slow`.
5. In `src/App.tsx:288`, replace `ease: [0.22, 1, 0.36, 1]` → `ease: EASE_OUT` and `duration: 0.4` → `duration: DURATION.medium`.
6. In `src/App.tsx:307`, replace `transition={{ duration: 0.35 }}` → `transition={{ duration: DURATION.medium, ease: EASE_OUT }}`.
7. In `src/App.tsx:323`, replace `ease: [0.22, 1, 0.36, 1]` → `ease: EASE_OUT` and `duration: 0.42` → `duration: DURATION.medium`.

## Boundaries

- Do NOT change any duration *value* — only the names. The renames must produce visually identical motion to the current state. (Plan 001 already cuts 0.7→0.4 before this plan runs.)
- Do NOT touch ThemeToggle's spring config (`stiffness: 200, damping: 20`) — that's a spring, not a duration curve, and stays in component-local state.
- Do NOT touch ShapeGrid.tsx's `stiffness: 290, damping: 24` spring either — same reason.
- Do NOT add CSS custom properties (`--ease-out`) — the repo has no design-token CSS layer; introducing one for two callers is over-engineering. JS constants are the right level here.
- Do NOT add `DURATION.instant` or `DURATION.fast` call sites in this plan — those are pre-allocated for future motion work, not used now.
- No new dependencies.

## Verification

- **Mechanical**: `bun run build` succeeds; `bun run test` 14/14 pass.
- **Mechanical (grep)**: `rg "\\[0\\.22, 1, 0\\.36, 1\\]" src/` returns no matches inside `App.tsx`. (May still match in `src/lib/motion.ts` where the constant lives.)
- **Feel check**: hard reload `http://localhost:5173/`. Every entrance, swap, and fade in the three screen modes (auth-blocked, coming-soon, main grid + confirm panel) should look identical to before this plan. If anything feels different, a duration value was changed in translation — STOP and check step numbering.
- **Done when**: 4 inline easing literals replaced with `EASE_OUT`; 5 inline duration literals replaced with named `DURATION.*` values; new `src/lib/motion.ts` exists with the two named exports.
