# Plan 012: Add .mcp.json to .gitignore

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- .gitignore`
> If the file changed since this plan was written, stop and review the
> change before proceeding.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

`.mcp.json` is currently untracked in the repo (`git status` shows
`?? .mcp.json`). It's a harness-generated artifact from the local coding
tool, not project config. Leaving it untracked means it shows up in
`git status` for every agent session, adding noise to diff context.
Adding it to `.gitignore` removes the noise without changing repo behavior.

## Current state

```
$ git status --short
?? .mcp.json
?? nothing added to commit but untracked files present (use "git add" to track)
```

`.gitignore` (current content, lines 1-20):

```
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist
/.next/
/out/

# Misc
.DS_Store
*.pem
```

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Status    | `git status --short` | no `.mcp.json` line |

## Scope

**In scope** (the only files you should modify):
- `.gitignore` — append `/.mcp.json` (or appropriate pattern)

**Out of scope**:
- Any other ignore pattern (this plan only addresses `.mcp.json`)
- `mcp.json` files outside the repo root

## Git workflow

- Branch: `advisor/012-gitignore-mcp-json`
- One commit: `chore: add .mcp.json to .gitignore`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Verify `.mcp.json` exists at the repo root

```bash
ls -la .mcp.json
```

**Verify**: file exists, ~100 bytes (it's a small JSON config).

### Step 2: Confirm it's not project config

```bash
cat .mcp.json
```

**Verify**: contains tool/server config for the local harness, not project
settings. If it contains project-relevant config, STOP and report — the
plan's premise is wrong.

### Step 3: Append to `.gitignore`

Append this line at the end of `.gitignore`:

```
# Local harness artifacts
/.mcp.json
```

(The leading `/` anchors the pattern to the repo root, so `.mcp.json` files
inside subdirectories are not matched — that's intentional, in case future
project configs live at e.g. `packages/foo/.mcp.json`.)

**Verify**: `tail -3 .gitignore` shows the new pattern.

### Step 4: Verify git no longer reports it

```bash
git status --short
```

**Verify**: no `.mcp.json` line in the output.

### Step 5: Confirm file still exists

```bash
ls -la .mcp.json
```

**Verify**: file still on disk (gitignore only affects tracking, not
files).

### Step 6: Commit

```bash
git add .gitignore
git commit -m "chore: add .mcp.json to .gitignore"
```

**Verify**: `git log --oneline -1` shows the commit; `git status` clean.

## Test plan

No tests added. The verification is purely mechanical (file presence +
`git status` output).

## Done criteria

- [ ] `git status --short` shows no `.mcp.json`
- [ ] `.mcp.json` still exists on disk
- [ ] `git log --oneline -1` shows the new commit
- [ ] `git status` clean
- [ ] `plans/README.md` row for plan 012 updated to `DONE`

## STOP conditions

Stop and report back if:
- `.mcp.json` contains project-relevant config that should be tracked.
- The file doesn't exist (then nothing to ignore — skip the plan).

## Maintenance notes

- If the harness later creates other artifact files (e.g. `.superpowers/`,
  `.sc/` — both already in `.gitignore`?), add them in the same pattern.
- This is a one-line change. Re-bundle with other `.gitignore` updates
  if they come up later.
