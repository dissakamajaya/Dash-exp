# Animation Improvement Plans

Commit stamp: **a86bf25**
Source: `improve-animations` audit on `src/App.tsx`, `src/components/ShapeGrid.tsx`, `src/components/AnimatedBackground.tsx`, `src/components/ThemeToggle.tsx`, `src/components/SoundToggle.tsx`, `src/index.css`.

| # | Title | Severity | Status | Depends on |
|---|---|---|---|---|
| 001 | Cut app entrance duration to 400ms | HIGH | DONE | — |
| 002 | Add tap feedback to ShapeGrid icon buttons | MEDIUM | DONE | — |
| 003 | Switch AnimatePresence to popLayout for hint + confirm panel | MEDIUM | DONE | — |
| 004 | Replace `transition-all` on password input with `transition-colors` | LOW-MEDIUM | DONE | — |
| 005 | Extract shared motion tokens (EASE_OUT + DURATION scale) | LOW-MEDIUM | DONE | 001 (renames 0.7→medium) |

## Recommended execution order

Strictly **top-down** by file/dependency:

1. **001** — single-line edit, no prerequisites. Do first; lands the bigger perceived-fix and gives a clean duration for plan 005 to rename.
2. **002** — single-line edit, independent.
3. **003** — independent (2 single-prop changes).
4. **004** — independent (1 single-token change).
5. **005** — depends on 001 because plan 001 sets `App.tsx:288` to `duration: 0.4` (which plan 005 renames to `DURATION.medium`). Do 001 first; doing 005 before 001 produces a slight mismatch.

All plans touch only files already named in the audit. Plans 001-004 are isolated to one location each; plan 005 touches 6 call sites in `src/App.tsx` after creating one new file (`src/lib/motion.ts`).

## Out of scope (called out in the audit but not planned)

- **Framer Motion shorthand `y`/`scale` → full `transform` string** (LOW, AUDIT.md cat 5). Would require touching every `motion.div`/`motion.button` in the app. Effort/reward not justified at this codebase size — flagging for awareness only.
- **Per-icon stagger on grid mount** (missed opportunity, AUDIT.md cat 8). Worth doing as a *separate* plan once the high/mid-severity items land; out of scope for this batch.
- **Glow filter animation** on `ShapeGrid.tsx:255-261` (the drop-shadow snaps while sibling props ease — small physicality mismatch). LOW polish; no plan written.
- **Spatial icon → confirm-panel connection** (missed opportunity, cat 8). Requires layout-id bridging; not a quick win.

## Theme-default change (separate request from this audit batch)

A user request concurrent with this audit also asked for: light mode default + black icon when selected in light mode + new arrow-style "Buka" button matching Paper design (DL-0 dark, DP-0 light). Those are visual/design changes, not motion findings — they live in `src/App.tsx` and `src/components/AnimatedBackground.tsx` and don't overlap with any plan above. Apply them as a separate batch.
