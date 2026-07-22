# 004 — Replace `transition-all` on password input with explicit properties

- **Status**: DONE
- **Commit**: a86bf25
- **Severity**: LOW-MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file, 1 line

## Problem

The password input at `src/App.tsx:343` uses `transition-all duration-300`. Per `AUDIT.md` category 5: `transition: all` animates unintended properties off-GPU — always a finding. Here the only properties that actually change are border-color, background-color, and color (driven by the `dark` toggle and `:focus` states). Animating `all` includes width/padding/margin/font/etc., which can't transition anyway but still costs selector-matching work, and is a footgun for any future style addition.

```tsx
// src/App.tsx:343 — current
className="gateway-input w-full rounded-xl px-4 py-2.5 text-sm outline-none backdrop-blur-sm transition-all duration-300"
```

## Target

```tsx
// target
className="gateway-input w-full rounded-xl px-4 py-2.5 text-sm outline-none backdrop-blur-sm transition-colors duration-300"
```

- `transition-all` → `transition-colors` — explicit properties only (background-color, border-color, color, fill, stroke).
- Duration stays 300ms (transition is barely perceptible on focus anyway).

## Repo conventions to follow

- The other transitions in this repo already use `transition-colors` (e.g. `src/index.css:47`, `src/components/SoundToggle.tsx:19`, `src/components/ThemeToggle.tsx:17`, `src/App.tsx:255` — the "Kembali" button on the coming-soon screen). This change brings the password input into the existing convention.

## Steps

1. In `src/App.tsx:343`, replace `transition-all` with `transition-colors`.

## Boundaries

- Do NOT change the duration or any other className.
- Do NOT touch the other `transition-colors` usages — they're already correct.
- No new dependencies.

## Verification

- **Mechanical**: `bun run build` succeeds; `bun run test` 14/14 pass.
- **Feel check**: hard reload `http://localhost:5173/`, trigger the password input (must reach the confirm panel — requires a session). Focus the input: border/background color transitions over 300ms as before. No visible change.
- **Done when**: identical visual behavior, but only the intended properties are listed in computed styles' transition-property (verifiable via DevTools Computed pane).
