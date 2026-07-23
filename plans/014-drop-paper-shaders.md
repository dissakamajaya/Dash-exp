# Plan 014: Drop @paper-design/shaders-react, replace with pure CSS gradient layers

> **Executor instructions**: This plan is a DIRECTION item — an option
> presented for the maintainer's judgment, not a confirmed improvement.
> Before executing, confirm with the operator that they want to proceed.
> When confirmed, follow the steps. When done, update the status row for
> this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- src/components/AnimatedBackground.tsx package.json bun.lock`
> If any of these changed, stop and re-read the affected files before
> proceeding.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

`@paper-design/shaders-react` is a third-party shader library (added in
PR #7) that renders the animated background via a fragment shader running
on `<canvas>`. The current visual effect is a 3-color grain gradient with
shape="corners". The library adds ~5KB of dependencies plus a `<canvas>`
element to every page mount.

Pure CSS gradients with layered radial-blends can achieve a similar
moody-grain effect (as in the pre-PR-#7 `AnimatedBackground.tsx`) at:
- Zero new dependencies
- GPU-composited transforms (cheaper than canvas rerenders)
- Static SVG noise overlay for grain (no shader compile cost)

Trade-off: the Paper shader has a specific "shape" (corners) and motion
control that's harder to replicate exactly with CSS. If you value the
exact Paper aesthetic, keep the dep. If you want a similar look with
cheaper runtime and one fewer dep, swap.

## Current state

`src/components/AnimatedBackground.tsx` (85 lines):

```ts
import { GrainGradient } from "@paper-design/shaders-react";
// ...
return (
  <div className="pointer-events-none fixed inset-0 overflow-hidden" style={rootStyle}>
    <GrainGradient
      colors={colors}
      colorBack={base}
      shape="corners"
      scale={1.3}
      softness={0}
      intensity={0.15}
      noise={0.5}
      speed={reducedMotion ? 0 : 1}
      // ... more props
    />
    {/* Fine white grain */}
    <div ... />
  </div>
);
```

`package.json:15` declares the dependency.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Tests     | `bunx vitest run`    | all pass (no test changes) |
| Typecheck | `bunx tsc --noEmit`  | exit 0              |
| Build     | `bun run build`      | exit 0              |
| Remove dep | `bun pm rm @paper-design/shaders-react` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/components/AnimatedBackground.tsx` — rewrite without `GrainGradient`
- `package.json` + `bun.lock` — remove the dependency

**Out of scope**:
- `src/App.tsx` — the `<AnimatedBackground>` consumer is unchanged
- Any other component

## Git workflow

- Branch: `advisor/014-drop-paper-shaders`
- One commit: `refactor(bg): drop @paper-design/shaders-react, replace with CSS layers`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Pre-check: confirm Paper shader effect is documented

Before removing, capture the current visual state. Take a screenshot of
the deployed gateway in both dark and light modes so you can compare
against the post-removal version.

**Verify**: two screenshots saved at `/tmp/bg-paper-dark.png` and `/tmp/bg-paper-light.png`.

### Step 2: Remove the dependency

```bash
bun pm rm @paper-design/shaders-react
```

**Verify**: `bun pm ls @paper-design/shaders-react` returns empty; `package.json` no longer contains it.

### Step 3: Rewrite `AnimatedBackground.tsx`

Replace the entire file with a CSS-only version. The pre-PR-#7 design
(seen in commit history before `e0a7900`) used:

- A base `<div>` with a dark/light `background-color`.
- Two or three `<div>` layers each with a `radial-gradient(...)` background
  and an `animation: bg-drift-{a,b}` CSS animation.
- One or two grain layers using inline SVG `feTurbulence` data URLs.

Restore that approach. Use the palette and dark/light branching from the
current file (lines 36-50) but apply them via CSS gradients instead of the
shader.

Reference excerpt (from commit `85e6c6d`'s grandparent, the pre-refactor
background):

```tsx
const NOISE_FINE = "url(\"data:image/svg+xml,...\")";

<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ backgroundColor: base }}>
  <div ref={meshRef} className="absolute -inset-[12%]">
    <div className="vault-bg-liquid absolute inset-0" style={{ backgroundImage: "...", animation: "bg-drift-a 28s ease-in-out infinite" }} />
    <div className="vault-bg-liquid absolute inset-0" style={{ backgroundImage: "...", animation: "bg-drift-b 34s ease-in-out infinite" }} />
  </div>
  <div className="absolute inset-0" style={{ backgroundImage: NOISE_FINE, mixBlendMode: dark ? "screen" : "multiply" }} />
</div>
```

You'll also need the corresponding CSS keyframes in `src/index.css`
(`bg-drift-a`, `bg-drift-b`). If they're not already present, add them.
See git history (`git log --oneline -- src/index.css`).

**Verify**: `bunx tsc --noEmit` exits 0; no `GrainGradient` references remain.

### Step 4: Build + test

```bash
bunx vitest run
bun run build
```

**Verify**: tests pass; build succeeds.

### Step 5: Visual comparison

Run the dev server and screenshot. Compare to step 1's saved screenshots.

**Verify**: the mood is comparable (vivid hue blobs on dark/light canvas
with film grain). The exact look will differ — that's expected. If the
result is materially worse (no visible blobs, muddy grain, harsh
edges), STOP and revert.

### Step 6: Commit

```bash
git add src/components/AnimatedBackground.tsx package.json bun.lock
git commit -m "refactor(bg): drop @paper-design/shaders-react, replace with CSS layers"
```

**Verify**: `git log --oneline -1` shows the commit; `git status` clean.

## Test plan

No tests added. The verification is visual + bundle size.

```bash
# Compare bundle size before/after
bun run build
ls -la dist/index.html
```

Expected: 880KB → ~830KB (the shader library alone is ~50KB minified).

## Done criteria

- [ ] `grep "@paper-design" package.json bun.lock` returns no matches
- [ ] `grep "GrainGradient" src/` returns no matches
- [ ] `bunx vitest run` exits 0
- [ ] `bun run build` exits 0
- [ ] Bundle size decreased (compare `dist/index.html` size)
- [ ] Visual screenshot in dev matches the reference mood
- [ ] `git status` clean
- [ ] `plans/README.md` row for plan 014 updated to `DONE` (or marked
  REJECTED if visual comparison fails)

## STOP conditions

Stop and report back if:
- The CSS-only version can't match the shader's mood (this is a
  judgment call; the maintainer should weigh in).
- Removing the dep breaks some other code path you didn't anticipate.
- The bundle size increase from the dep removal is less than 20KB (means
  the library is already mostly tree-shaken and the dep isn't worth the
  effort of removing).

## Maintenance notes

- If you want a middle ground: keep the shader dep but only use it on
  devices that can handle it (use a feature detection or `prefers-reduced-motion`
  fallback to CSS). The shader cost is the compile + canvas allocation,
  not the per-frame render.
- The pre-PR-#7 background approach used `mouse parallax` on the mesh
  container — preserve that if you re-introduce the CSS layers.
- If you ever need a different grain style (e.g. finer, color-tinted),
  the SVG `feTurbulence` approach is much more flexible than the Paper
  shader's `noise` parameter.
