# Plan 006: Add GitHub Actions CI pipeline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- .github`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

The repo currently has no CI. Every push to `main` is unverified — tests, type
checks, and the production build all run manually. A bad change shipping past
`main` is a one-step failure mode. A CI pipeline that runs `vitest`,
`tsc --noEmit`, and `vite build` on every PR and push to `main` is the
minimum safety net.

## Current state

- `package.json` scripts: `dev`, `dev:auth`, `build`, `preview`, `test`, `deploy`.
- Tests: `bunx vitest run` → 14/14 passing (3 files: `App.test.tsx`,
  `App.selection.test.tsx`, `worker/auth.test.ts`).
- Typecheck: `bunx tsc --noEmit` has 1 pre-existing warning
  (`worker/local-auth.ts:73 'request' is declared but never read`) — not a
  blocker but should be fixed while we're here.
- Production build: `bun run build` produces a 880KB singlefile HTML output.
- No `.github/workflows/` directory exists; no `wrangler deploy` happens in CI
  (deploys remain manual).

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bunx tsc --noEmit`  | exit 0, no errors   |
| Tests     | `bunx vitest run`    | all pass (14/14)    |
| Build     | `bun run build`      | exit 0, `dist/index.html` produced |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/ci.yml` (create)
- `.github/workflows/deploy.yml` (create) — optional, can be skipped if you
  prefer manual deploys
- `.gitignore` (add `.DS_Store` is already there; ensure `.wrangler/` is present)

**Out of scope**:
- `worker/local-auth.ts` — the unused `request` parameter is a pre-existing
  issue outside this plan's scope. Do NOT fix it.
- Any change to source code.

## Git workflow

- Branch: `advisor/006-ci-pipeline`
- One commit: `ci: add GitHub Actions workflow for vitest + tsc + build`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Create the workflow directory

```bash
mkdir -p .github/workflows
```

**Verify**: `ls .github/workflows` → directory exists, empty.

### Step 2: Write `.github/workflows/ci.yml`

Create the file with this content:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - name: Typecheck
        run: bunx tsc --noEmit
      - name: Tests
        run: bunx vitest run
      - name: Build
        run: bun run build
```

**Verify**: `cat .github/workflows/ci.yml` → file exists, content matches.

### Step 3: Confirm `.gitignore` covers wrangler state

The existing `.gitignore` includes `/dist`, `/coverage`, etc. Add `/dist/` to
the Production section (already present). No change needed unless `.wrangler/`
is missing — confirm with:

```bash
grep -E "^/?\.wrangler" .gitignore || echo "MISSING"
```

If `MISSING`, append `/.wrangler` to the Misc section of `.gitignore`. The
state directory should not be committed.

**Verify**: `grep ".wrangler" .gitignore` → matches.

### Step 4: Verify the workflow YAML is valid

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
```

**Verify**: exit 0.

### Step 5: Commit

```bash
git add .github/workflows/ci.yml .gitignore
git commit -m "ci: add GitHub Actions workflow for vitest + tsc + build"
```

**Verify**: `git log --oneline -1` → commit exists.

## Test plan

This plan adds CI configuration only; no source tests added. The CI workflow
itself validates by running the existing tests (`bunx vitest run`) and
typecheck on every push. After merge to `main`, the workflow will:
1. Install dependencies.
2. Run `tsc --noEmit` (will fail on the pre-existing `worker/local-auth.ts:73`
   warning — note this is acceptable for now; CI will fail loudly until that
   warning is fixed in a future plan).

If the executor wants CI to pass green immediately, they may add the unused
parameter fix as a separate commit in this same branch with the message
`fix(worker): remove unused request param from hmac()`. This is OPTIONAL —
without it, the CI workflow will simply block future PRs until the warning
is cleared.

## Done criteria

- [ ] `cat .github/workflows/ci.yml` shows the workflow content
- [ ] `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` exits 0
- [ ] `.gitignore` includes `.wrangler` (either pre-existing or added in step 3)
- [ ] `git log --oneline -1` shows the new commit
- [ ] `git status` shows clean working tree
- [ ] `plans/README.md` row for plan 006 updated to `DONE`

## STOP conditions

Stop and report back if:
- The workflow YAML produces an Actions syntax error in step 4 (the python
  yaml check should catch this; if it slips through, the GitHub Actions UI
  will show it).
- The existing tests fail when run locally (`bunx vitest run` exits non-zero).
- A required secret or env var is needed that isn't already available in
  GitHub Actions (this plan doesn't use any secrets).

## Maintenance notes

- If new test scripts are added later (`bun run lint`, etc.), append them as
  new steps under the existing `check` job.
- The deploy step is intentionally NOT in CI — manual deploys give the
  operator control. If/when you want automated prod deploys on `main`,
  add a separate `deploy.yml` workflow gated on `branches: [main]` and
  configured with `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets.
- The `bun install --frozen-lockfile` step will fail if `bun.lock` is
  out-of-sync with `package.json` after a manual edit. Re-run `bun install`
  locally and commit the regenerated lockfile.
