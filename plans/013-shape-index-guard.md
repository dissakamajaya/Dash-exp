# Plan 013: Add runtime shapeIndex uniqueness check

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- src/data/gateway.ts src/components/ShapeGrid.tsx`
> If the in-scope files changed, the plan may no longer apply — STOP and
> review.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (subsumed by plan 007 if that lands first)
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

`shapeIndex` is currently a `number`. The destinations use `0..6` and the
users use `7..9`. There is no compile-time guarantee that these ranges
don't overlap, and no runtime check. If someone adds a new destination
with `shapeIndex: 7` (colliding with `aldi`), `ShapeGrid.tsx:137`
(`SHAPES[item.shapeIndex]`) would either render the wrong SVG or throw
`undefined.shapeIndex` access.

Plan 007 replaces `shapeIndex: number` with a string ID — that subsumes
this finding. This plan covers the case where plan 007 is NOT executed
(priorities misaligned, scope reduced). If plan 007 lands first, skip this
plan.

## Current state

`src/data/gateway.ts:37-45` and 49-53 define destinations and users with
`shapeIndex: number`. There is no validation that the numbers are unique
or in expected ranges.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `bunx tsc --noEmit`  | exit 0              |
| Tests     | `bunx vitest run`    | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/data/gateway.ts` — add runtime validation
- `src/data/gateway.test.ts` (create) — test the validation

**Out of scope**:
- Refactoring to string IDs (that's plan 007)
- Any UI change

## Git workflow

- Branch: `advisor/013-shape-index-guard`
- One commit: `fix(data): validate shapeIndex uniqueness at module load`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add a runtime validation function

At the bottom of `src/data/gateway.ts`, add:

```ts
function validateShapeIndices(items: { shapeIndex: number }[]): void {
  const seen = new Set<number>();
  for (const item of items) {
    if (!Number.isInteger(item.shapeIndex) || item.shapeIndex < 0) {
      throw new Error(`Invalid shapeIndex: ${item.shapeIndex} (must be non-negative integer)`);
    }
    if (seen.has(item.shapeIndex)) {
      throw new Error(`Duplicate shapeIndex: ${item.shapeIndex}`);
    }
    seen.add(item.shapeIndex);
  }
}

// Combined check — destinations and users must not collide.
validateShapeIndices([...DESTINATIONS, ...USERS]);
```

**Verify**: `bunx tsc --noEmit` exits 0.

### Step 2: Test the validation

Create `src/data/gateway.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DESTINATIONS, USERS } from "./gateway";

describe("shape index uniqueness", () => {
  it("destinations and users do not collide", () => {
    const all = [...DESTINATIONS, ...USERS];
    const indices = all.map((item) => item.shapeIndex);
    const unique = new Set(indices);
    expect(unique.size).toBe(indices.length);
  });

  it("every shapeIndex is a non-negative integer", () => {
    for (const item of [...DESTINATIONS, ...USERS]) {
      expect(Number.isInteger(item.shapeIndex)).toBe(true);
      expect(item.shapeIndex).toBeGreaterThanOrEqual(0);
    }
  });
});
```

**Verify**: `bunx vitest run src/data/gateway.test.ts` exits 0; 2 tests pass.

### Step 3: Run full suite + build

```bash
bunx vitest run
bun run build
```

**Verify**: all tests pass; build exits 0.

### Step 4: Commit

```bash
git add src/data/gateway.ts src/data/gateway.test.ts
git commit -m "fix(data): validate shapeIndex uniqueness at module load"
```

**Verify**: `git log --oneline -1` shows the commit; `git status` clean.

## Test plan

The two new tests in `gateway.test.ts` cover:

| Test | Failure class caught |
|------|---------------------|
| No collisions | Future duplicate `shapeIndex` assignments |
| All non-negative integers | Future bad-value assignments (e.g. `shapeIndex: -1`) |

The runtime check throws synchronously at module load, which means a
duplicate would prevent the gateway from booting at all — fail-fast
behavior. This is intentional: silent rendering of the wrong shape is
worse than a loud startup failure.

## Done criteria

- [ ] `bunx vitest run` exits 0; new tests pass
- [ ] `bunx tsc --noEmit` exits 0
- [ ] `bun run build` exits 0
- [ ] `grep "validateShapeIndices" src/data/gateway.ts` matches
- [ ] `git status` clean
- [ ] `plans/README.md` row for plan 013 updated to `DONE` (or marked
  SUPERSEDED if plan 007 has landed)

## STOP conditions

Stop and report back if:
- The runtime check throws on the existing valid data (means the check
  logic is wrong; debug before continuing).
- Plan 007 has already landed and changed `shapeIndex` to a string — the
  numeric validation no longer makes sense. Mark this plan SUPERSEDED in
  the README rather than executing.

## Maintenance notes

- When migrating to string IDs (plan 007), the runtime check becomes a
  type-system check — no runtime needed because TS will catch missing
  registry entries if you use `Record<string, ...>` exhaustively.
- Consider adding a CI check that fails the build if any
  `gateway.test.ts` test fails. The `bun run build` script already
  doesn't run tests — if you add `bun run test` as a prebuild step, this
  guard runs on every deploy.
