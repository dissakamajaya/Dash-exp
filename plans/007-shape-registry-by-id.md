# Plan 007: Refactor ShapeGrid to key-by-id shape registry

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- src/components/ShapeGrid.tsx src/data/gateway.ts src/data/shapes.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

`ShapeGrid.tsx` looks up shapes via positional index: `SHAPES[item.shapeIndex]`
where `SHAPES = [PortalShape, JournalShape, RentalShape, StudioStaffShape,
AcademyShape, ResearchShape, AdminShape]`. Adding or reordering a destination
in `data/gateway.ts` requires matching array-position edits in `ShapeGrid.tsx`
or the wrong SVG renders. There is no compiler check enforcing that
`shapeIndex` values stay in `[0..6]` (destinations) or `[7..9]` (staff),
making index collisions a real risk.

## Current state

The relevant files:

- `src/data/gateway.ts:37-45` — 7 destinations with `shapeIndex: 0..6`:
  ```
  { id: "portal", shapeIndex: 0 }
  { id: "journal", shapeIndex: 1 }
  { id: "rental", shapeIndex: 2 }
  { id: "studiostaff", shapeIndex: 3 }
  { id: "academy", shapeIndex: 4 }
  { id: "research", shapeIndex: 5 }
  { id: "admin", shapeIndex: 6 }
  ```
- `src/data/gateway.ts:49-53` — 3 users with `shapeIndex: 7..9`
- `src/components/ShapeGrid.tsx:110-118` — `SHAPES = [PortalShape, JournalShape, ...]`
- `src/components/ShapeGrid.tsx:137` — `const Shape = SHAPES[item.shapeIndex]`
- `App.tsx:296` — items passed to `<ShapeGrid items={SELECTOR_ITEMS.filter(...)} />`

The current contract is positional: `shapeIndex` is the position of the
shape component in the `SHAPES` array. Refactor target: `shapeIndex` becomes
a string ID that maps to a registry.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Tests     | `bunx vitest run`    | all pass (14/14)    |
| Typecheck | `bunx tsc --noEmit`  | exit 0              |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/data/shapes.ts` (create) — shape registry keyed by string id
- `src/data/gateway.ts` — change `shapeIndex: number` to `shapeIndex: string`
  on `Destination`, `GatewayUser`, and `SelectorItem`
- `src/components/ShapeGrid.tsx` — look up `SHAPE_REGISTRY[item.shapeIndex]`
  instead of `SHAPES[item.shapeIndex]`; rename the array
- `src/components/ShapeGrid.tsx` — internal shape functions remain inline in
  this file (or move to `shapes.ts` if you prefer; choose one approach and
  stay consistent)

**Out of scope**:
- `App.tsx` — the `selectedIndices` filter (`(value): value is number => ...`)
  will need its type updated. **Update this too** — it's in scope despite
  not being listed above.
- Any change to the actual SVG paths.

## Git workflow

- Branch: `advisor/007-shape-registry`
- One commit per logical step (suggest: data refactor → component refactor
  → build/test pass). Conventional commit messages.
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Create `src/data/shapes.ts`

Create a new file that exports a map of string ids to shape components:

```ts
import type { ComponentType } from "react";

/**
 * Shape registry. Each entry is keyed by the stable string id used in
 * `data/gateway.ts:Destination.shapeIndex`. Adding a new shape:
 *   1. Define the SVG component (see ShapeGrid.tsx for current shape functions).
 *   2. Import it here and add to SHAPE_REGISTRY with a stable string id.
 *   3. Reference the id in your destination's `shapeIndex` field.
 */
export const SHAPE_REGISTRY: Record<string, ComponentType> = {
  portal: PortalShape,
  journal: JournalShape,
  rental: RentalShape,
  studiostaff: StudioStaffShape,
  academy: AcademyShape,
  research: ResearchShape,
  admin: AdminShape,
  "user-aldi": AldiShape,
  "user-dissa": DissaShape,
  "user-bil": BilShape,
};
```

The shape components currently live inside `ShapeGrid.tsx`. Move them to this
new file (copy the function bodies). If the bodies reference any
`lineProps` constant from `ShapeGrid.tsx`, also move that constant.

**Verify**: `bunx tsc --noEmit` → may show errors about unused shape
components; that's fine, step 4 will remove them from ShapeGrid.tsx.

### Step 2: Update `Destination.shapeIndex` and friends in `src/data/gateway.ts`

Change the `shapeIndex` field type from `number` to `string` in three
places: `Destination`, `GatewayUser`, `SelectorItem`. Then change each
literal:

```ts
{ id: "portal", shapeIndex: "portal", ... }
{ id: "journal", shapeIndex: "journal", ... }
{ id: "rental", shapeIndex: "rental", ... }
{ id: "studiostaff", shapeIndex: "studiostaff", ... }
{ id: "academy", shapeIndex: "academy", ... }
{ id: "research", shapeIndex: "research", ... }
{ id: "admin", shapeIndex: "admin", ... }
// USERS:
{ id: "aldi", shapeIndex: "user-aldi", ... }
{ id: "dissa", shapeIndex: "user-dissa", ... }
{ id: "bil", shapeIndex: "user-bil", ... }
```

Use kebab-case for the ids (matches the existing pattern in the destination
`route` field).

**Verify**: `bunx tsc --noEmit` → no new errors. (May still show
unresolved-component errors from step 1; those resolve in step 4.)

### Step 3: Update `App.tsx` `selectedIndices` typing

The current line is around `App.tsx:90`:

```ts
const selectedIndices = [selectedApp?.shapeIndex, selectedUser?.shapeIndex].filter(
  (value): value is number => value !== undefined,
);
```

Change to:

```ts
const selectedIndices = [selectedApp?.shapeIndex, selectedUser?.shapeIndex].filter(
  (value): value is string => value !== undefined,
);
```

**Verify**: `bunx tsc --noEmit` → no errors from this file.

### Step 4: Refactor `src/components/ShapeGrid.tsx`

Remove the `SHAPES` array. Change the `items.map` block to:

```ts
const Shape = SHAPE_REGISTRY[item.shapeIndex];
```

(Add the import at the top of the file:
`import { SHAPE_REGISTRY } from "@/data/shapes";`.)

Delete the shape function definitions that were moved to `shapes.ts` in
step 1, plus the now-unused `SHAPES` constant.

If the shape components are still inline here and not moved to `shapes.ts`,
the SHAPE_REGISTRY should be in this file instead. Pick one location and
stay consistent. The plan above assumes they live in `shapes.ts`.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 5: Run tests + build

```bash
bunx vitest run
bun run build
```

**Verify**: all tests pass (14/14); build produces `dist/index.html`.

### Step 6: Commit

```bash
git add src/data/shapes.ts src/data/gateway.ts src/components/ShapeGrid.tsx src/App.tsx
git commit -m "refactor: key shape registry by string id, decouple from array position"
```

**Verify**: `git log --oneline -1` shows the commit; `git status` is clean.

## Test plan

This refactor changes a contract but does not change observable behavior;
existing tests are sufficient. No new tests required.

If the executor wants extra safety: add a single test in a new file
`src/data/shapes.test.ts` that asserts every id in `DESTINATIONS` and
`USERS` resolves to a registered shape. Example skeleton:

```ts
import { describe, expect, it } from "vitest";
import { DESTINATIONS, USERS } from "@/data/gateway";
import { SHAPE_REGISTRY } from "@/data/shapes";

describe("shape registry coverage", () => {
  it("covers every destination", () => {
    for (const dest of DESTINATIONS) {
      expect(SHAPE_REGISTRY[dest.shapeIndex]).toBeDefined();
    }
  });
  it("covers every user", () => {
    for (const user of USERS) {
      expect(SHAPE_REGISTRY[user.shapeIndex]).toBeDefined();
    }
  });
});
```

This is RECOMMENDED — it's the test that would have caught the original
"wrong shape renders" bug.

## Done criteria

- [ ] `bunx tsc --noEmit` exits 0
- [ ] `bunx vitest run` exits 0; new test for registry coverage passes (if added)
- [ ] `bun run build` exits 0
- [ ] `git grep "shapeIndex: [0-9]" src/data/gateway.ts` returns no matches
- [ ] `git status` clean
- [ ] `plans/README.md` row for plan 007 updated to `DONE`

## STOP conditions

Stop and report back if:
- The shape components in `ShapeGrid.tsx` depend on each other or on shared
  helpers that aren't obvious from reading — moving them will require
  additional helper extraction first.
- `tsc --noEmit` produces errors in files outside the in-scope list (probably
  means the shape-component move also moved something else they depend on).
- The build succeeds but visually a different shape renders than before
  (check: open dev server, click each destination, verify the icon matches
  its `id`).

## Maintenance notes

- When adding a new destination, define the SVG, register it in
  `SHAPE_REGISTRY`, and reference the id in `gateway.ts`. The compiler will
  not enforce coverage — that's why plan 007's recommended test exists.
- Shape components may grow long; consider co-locating the SVG paths in
  separate files (e.g. `src/components/shapes/Portal.tsx`) once you have
  more than 10.
- If a destination's icon needs to vary by theme (e.g. different stroke
  color in light mode), the shape registry key could carry a sub-id like
  `portal--dark` / `portal--light` and the component receives the `dark` prop
  itself. Today the parent passes `dark` and the SVG uses `currentColor`,
  so this is not a current concern.
