# Cloudflare Access Pilot Runbook

**Owner:** You (Cloudflare account holder). Source code is already fail-closed and cannot pass identity to any app without the resources below.

## Prerequisites

- Zero Trust account already active for `houseofexp.com` (verified: existing certs endpoint reachable).
- Real staff emails for Aldi, Dissa, and Bil.
- Access application AUD tags copied for each protected resource.
- Wrangler / Vercel / Convex CLI logged in as the account owner.

## Step 1 — Enable One-Time PIN identity provider

Zero Trust → Settings → Authentication → Login methods → Add One-Time PIN. Global session 24h, application session 8h.

## Step 2 — Create the reusable allow policy

Access → Access Policies → Create policy `HouseOfExpStaff`, action Allow, rule "Include Emails" listing the three staff emails, lowercased.

## Step 3 — Create seven self-hosted applications

Access → Applications → Add self-hosted. Reuse `HouseOfExpStaff` policy on each. Recommended session duration: application 8h.

| Application name | Hostname / path |
|---|---|
| gateway | `dash.houseofexp.com/*` |
| studio | `studio.houseofexp.com/*` |
| finance | `finance.houseofexp.com/*` |
| website-admin-ui | `houseofexp.com/edit/*` |
| website-admin-api | `houseofexp.com/api/admin/*` |
| client-staff-ui | `client.houseofexp.com/admin*` |
| client-staff-api | `client.houseofexp.com/api/admin/*` + `client.houseofexp.com/api/media/upload-token` |

Do not add `houseofexp.com/*`, `client.houseofexp.com/*`, or `finance.houseofexp.com/api/auth/.well-known/jwks` to Access — those must stay public.

## Step 4 — Record the AUD tags

For each application, Additional settings → Application Audience (AUD) Tag. Copy the value; each app receives its own tag.

## Step 5 — Set application runtime bindings

Replace `TEAM_DOMAIN` with the account's `<team>.cloudflareaccess.com` hostname (no scheme). Replace `EMAIL_*` with the staff addresses. Replace `AUD_*` with the AUD tags from Step 4.

### Gateway Worker (Cloudflare)

```
wrangler secret put ACCESS_TEAM_DOMAIN     # TEAM_DOMAIN
wrangler secret put ACCESS_AUDIENCE        # AUD_gateway
wrangler secret put HOX_STAFF_ALDI_EMAIL   # EMAIL_ALDI
wrangler secret put HOX_STAFF_DISSA_EMAIL  # EMAIL_DISSA
wrangler secret put HOX_STAFF_BIL_EMAIL    # EMAIL_BIL
wrangler deploy
```

### Studio Worker

```
cd "STUDIOSTAFF V2"
wrangler secret put ACCESS_TEAM_DOMAIN
wrangler secret put ACCESS_AUDIENCE        # AUD_studio
wrangler secret put HOX_STAFF_ALDI_EMAIL
wrangler secret put HOX_STAFF_DISSA_EMAIL
wrangler secret put HOX_STAFF_BIL_EMAIL
pnpm worker:deploy
```

### Website Worker

```
cd website
wrangler secret put ACCESS_TEAM_DOMAIN
wrangler secret put ACCESS_AUDIENCE        # AUD_website_admin_ui, same as AUD_website_admin_api if you kept one policy
wrangler secret put HOX_STAFF_ALDI_EMAIL
wrangler secret put HOX_STAFF_DISSA_EMAIL
wrangler secret put HOX_STAFF_BIL_EMAIL
npm run cf:deploy
```

(Website `wrangler.jsonc` now has `keep_vars: true`; dashboard secrets stay intact across deploys.)

### Client Portal (Vercel)

Vercel → Project → Settings → Environment Variables (Production):

```
ACCESS_TEAM_DOMAIN
ACCESS_AUDIENCE      # AUD_client_staff_ui (reused by both admin apps if policy identical)
HOX_STAFF_ALDI_EMAIL
HOX_STAFF_DISSA_EMAIL
HOX_STAFF_BIL_EMAIL
```

Redeploy.

### Finance (Vercel + Convex)

Vercel Production env:

```
ACCESS_TEAM_DOMAIN
ACCESS_AUDIENCE           # AUD_finance
HOX_STAFF_ALDI_EMAIL
HOX_STAFF_DISSA_EMAIL
HOX_STAFF_BIL_EMAIL
FINANCE_AUTH_PRIVATE_JWK  # RS256 JWK generated per docs; keep private
```

Convex dashboard → Environment → set matching `ACCESS_TEAM_DOMAIN` / `ACCESS_AUDIENCE`. Deploy `convex/auth.config.ts` with `npx convex deploy`.

## Step 6 — Smoke matrix

Sign in once through the gateway with One-Time PIN, then verify each app in a single session without a second prompt:

1. `dash.houseofexp.com/` → identity hydrates; select an app; redirect contains no `gateway_user`.
2. `studio.houseofexp.com/` → member auto-selected; one read + one authored write.
3. `finance.houseofexp.com/` → Convex reads and one write succeed; direct anonymous Convex call denied.
4. `houseofexp.com/edit/` → dashboard loads; one settings save succeeds.
5. `client.houseofexp.com/admin` → admin view; one guarded admin write succeeds.
6. Separate unauthenticated browser: `client.houseofexp.com/` external client login unchanged.
7. `dash.houseofexp.com/cdn-cgi/access/logout` → global logout forces re-authentication everywhere.

If a target fails: disable only its Access application, roll back its deploy, keep the other apps live. Never re-enable local password mode in production.

## Step 7 — Retire the temporary test passwords

Regenerate all local `.dev.vars` verifier files after Cloudflare Access is verified, or delete the `local://auth-test-passwords.json` artifact from the harness. Production paths already ignore local mode; this step just retires the test credentials.
