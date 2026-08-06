# Secret Registry — House of EXP ecosystem

> The single record of every secret across the ecosystem: where it lives, who shares it,
> and when it was last rotated. **Values NEVER go in this file** — it holds references and
> rotation dates only; the real values live in the platform stores listed under "Lives in".
> Audit: `bun run secret-audit` (`scripts/secret-audit.mjs`) — zero-dependency, flags any
> secret whose `Next rotation` has passed (exit 1, CI/cron gate) or is due within 30 days,
> and lists secrets with no rotation date so nothing silently goes untracked.

## Running the audit on a schedule

The audit is only useful if it runs — wire it into whatever cadence fits:

- Daily terminal reminder (launchd, macOS — same pattern as the wiki's
  morning cron): point a launchd job at
  `cd ~/Documents/GitHub/Dash-exp && bun run secret-audit` and surface the
  exit code (1 = overdue).
- Or plain `crontab`: `0 9 * * * cd ~/Documents/GitHub/Dash-exp && bun run secret-audit >> ~/.secret-audit.log 2>&1`
- Or a GitHub Actions scheduled workflow in the Dash repo
  (`schedule: cron`) — the script's exit code gates the job red.

Any one of those turns "know when it expired" from a memory into a signal.

## Rotation policy

- Shared worker-to-worker keys: **90 days** (record the next date when you rotate).
- Cloudflare API tokens: set a **TTL at creation** — and record the date here anyway.
- Platform credentials (Supabase service key, Convex deploy keys, Google service
  account): follow the platform's schedule; record the date here when you rotate.
- `Next rotation` blank = not scheduled yet — the audit reports it as untracked.

## The Infisical vault (source of truth going forward)

Org **EXP** → project **house-of-exp** (`18c4abe3-2532-4755-af60-d7cc6624ce0d`),
environments `dev` / `staging` / `prod`. App folders: `/crm`, `/staff-v2`,
`/finance`, `/dash`, `/website`, `/shared` (platform tokens).

Seeded 2026-08-06 (prod):

| Folder | Secret | Value state |
|---|---|---|
| `/crm` | STUDIO_STAFF_API_KEY, FINANCE_API_TOKEN | live values (also on exp-crm worker) |
| `/staff-v2` | CRM_API_KEY | live value (V2 worker, deployed) |
| `/finance` | CRM_READ_TOKEN | live value (Finance convex, pending) |
| `/shared` | CLOUDFLARE_API_TOKEN (workers), CLOUDFLARE_API_TOKEN_R2_ZONE, CLOUDFLARE_API_TOKEN_FULL, R2_S3_ACCESS_KEY_ID, R2_S3_SECRET_ACCESS_KEY, VERCEL_TOKEN | live values |

CLI access from any repo: `infisical init` (link once), then
`infisical secrets --env prod --recursive --plain`. The working link lives in
`/tmp/infisical-ctl/.infisical.json` (ephemeral scratch — re-link per repo).

**Not yet imported** (do via dashboard Integrations → "Import" before enabling
any sync, so the sync never deletes them): the workers' existing secrets
(exp-crm: ACCESS_AUDIENCE, SESSION_SECRET, INGEST_CRON_SECRET; V2:
ACCESS_AUDIENCE, JWT_SECRET, EXP_VAULT_READ_KEY, STUDIOSTAFF_API_KEY,
STAFF_PASSWORD_HASHES, GOOGLE_SERVICE_ACCOUNT, …) and the Vercel project envs.
Only then configure the Cloudflare Workers + Vercel syncs — a sync with an
incomplete source will overwrite/remove secrets on the target worker.

## The registry

| Secret | Lives in | Shared with | Rotated | Next rotation | Status |
|---|---|---|---|---|---|
| STUDIO_STAFF_API_KEY / CRM_API_KEY | exp-crm: `wrangler secret put STUDIO_STAFF_API_KEY`; V2: `wrangler secret put CRM_API_KEY` | exp-crm ↔ STUDIOSTAFF V2 (project check + auto-create) | 2026-08-06 | 2026-11-04 | **LIVE end-to-end** 2026-08-06 — both workers deployed, Access `/api/crm` bypass added, existence check verified against real prod projects (id 4/5 → 200) |
| FINANCE_API_TOKEN / CRM_READ_TOKEN | exp-crm: `wrangler secret put FINANCE_API_TOKEN`; Finance: `npx convex env set CRM_READ_TOKEN` | exp-crm ↔ STUDIOSTAFF-FINANCE (quotation existence check) | 2026-08-06 | 2026-11-04 | **LIVE on exp-crm** 2026-08-06; Finance side pending — `npx convex env set CRM_READ_TOKEN` blocked on Finance repo ledger drift |
| ACCESS_AUDIENCE | Cloudflare Access app AUD, per worker secret (exp-crm, V2, Dash) | all apps behind Cloudflare Access | | | per-app; rotate by recreating the Access application |
| SESSION_SECRET / LOCAL_SESSION_SECRET | exp-crm + Dash: dev `.dev.vars` / worker secrets | local dev sessions only | | | prod runs Access, so this stays dev-scoped |
| INGEST_CRON_SECRET | exp-crm worker secret | exp-crm `/api/leads/ingest` admin route | | | |
| EXP_VAULT_READ_KEY | V2 worker secret | exp-vault → V2 (`/api/exp-vault/projects`) | | | must match exp-vault's `STUDIOSTAFF_V2_API_KEY` |
| STUDIOSTAFF_API_KEY | V2 worker secret | V2 → exp-vault (portfolio sync, agent route) | | | must match exp-vault's `STUDIOSTAFF_API_KEY` |
| JWT_SECRET | V2 worker secret | V2 local-auth JWTs | | | fail-closed — worker refuses to run without it |
| STAFF_PASSWORD_VERIFIERS / STAFF_PASSWORD_HASHES | V2 + Dash dev secrets | staff local passwords (aldi/dissa/bill) | | | |
| GOOGLE_SERVICE_ACCOUNT | V2 `.dev.vars` / worker secret (JSON) | V2 Google Calendar sync | | | Google flags keys older than ~2 years |
| DEVICE_TOKEN | Finance Convex env | Finance `/device/dashboard` (EXP32 desk display) | | | |
| DEEPSEEK_API_KEY | Finance Convex env | Finance `convex/ai.ts` | | | |
| Convex CLI access token | this Mac: `~/.convex/config.json` | Convex deploys from this machine | | | rotate via Convex dashboard / `npx convex login` |
| Cloudflare API token (account) | Infisical `/shared` → `CLOUDFLARE_API_TOKEN`; also shell env | all wrangler deploys from this machine | | | set TTL at creation; verify with `bunx wrangler whoami`. **Missing `Zone → Workers Routes: Edit`** — uploads the script then fails on route sync (half-finished deploy), verified on exp-crm 2026-08-06. The shell-exported copy is older/weaker still and shadows `wrangler login` — prefer the vault value |
| Cloudflare API token (full) | Infisical `/shared` → `CLOUDFLARE_API_TOKEN_FULL` | wrangler deploys that touch zone routes or triggers (exp-crm, V2, Dash) | | | the working deploy token until the workers token's permissions are widened: `CLOUDFLARE_API_TOKEN="$(infisical secrets get CLOUDFLARE_API_TOKEN_FULL --env prod --path /shared --plain --silent)" bunx wrangler deploy --env=""` |
| Supabase service key (EXP Vault) | Supabase project → Vercel env | EXP Vault backend | | | unverified — confirm location, then fill dates |
| Vercel tokens | Vercel project envs | Finance + Vault frontends | | | unverified — confirm location, then fill dates |

## Non-secret config worth tracking (not audited)

| Item | Location |
|---|---|
| D1 database ids | `wrangler.toml`: exp-crm `373ceea2-1e2a-47ff-b38f-88b2fc8dc4ad`, V2 `cb013cc3-2e8e-4972-bac9-a2c431d47ae2`, website `0b3930a7-9160-4c43-8b98-74b416c9ca33` (WEBSITE_CONTENT) |
| Finance Convex deployment | `rosy-mongoose-61.convex.site` (VITE_CONVEX_SITE_URL, Finance `.env.local`) |

## How to rotate a secret

1. Generate a new value — shared keys: `openssl rand -hex 24`.
2. Update **every** target under "Lives in" (platform stores / `wrangler secret put` /
   `npx convex env set` / Vercel env).
3. Update this file: `Rotated` = today, `Next rotation` = today + policy (90 days for
   shared keys).
4. `bun run secret-audit` to confirm the registry is clean.
