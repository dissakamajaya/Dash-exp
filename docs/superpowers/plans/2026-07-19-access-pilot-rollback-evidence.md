# Cloudflare Access Pilot — Rollback Evidence

**Captured:** 2026-07-19T06:51:33Z
**Account:** `9c6dc8ad66dcb29f5b83f8c3b411d6ea` (dissakamajaya@gmail.com)
**Team domain:** `broad-wood-0a79.cloudflareaccess.com`

## Pilot allowlist

Reusable policy `HouseOfExpStaff` (id `e3bc3a9c-9675-4669-8778-71e9f3704717`), decision `allow`, session `24h`:

- Aldi: `brutalinajah@gmail.com`
- Dissa: `dissakamajaya@gmail.com`
- Bil: `bilhaqyislam@gmail.com`

Legacy `gateway` policy (id `0cab0ac9-4550-4459-a2fa-7af15e8dfe90`) carries the same three emails and remains attached to `dash` only; functionally equivalent, left as-is to avoid an unnecessary app edit.

## Identity providers

- One-Time PIN (`onetimepin`) — enabled, no config changes needed.
- Cloudflare (`cloudflare`, restricted to account members) — enabled, not used by the pilot policy.

## Access applications (final state)

| App | Destinations | Session | Policy | AUD |
|---|---|---|---|---|
| `dash` | `dash.houseofexp.com` | 24h | `gateway` | `beb8249aba06052ac2ac70ae121cf3bac3eba7e6c5d2f5e8585bb8575dc47e5f` |
| `studio` | `studio.houseofexp.com` | 8h | `HouseOfExpStaff` | `fef269bdcc06a69e7a185af907bd68cb89b59d6b783fc5796966b77262106ce6` |
| `finance` | `finance.houseofexp.com` | 8h | `HouseOfExpStaff` | `7eca42599d9c47f1d32ee40ff13d5cda90aaa5f3630b5fbaaec40a45d7024912` |
| `finance-jwks-public` | `finance.houseofexp.com/api/auth/.well-known/jwks` | 8h | `Public JWKS` (bypass) | `22d9f7b33cbc768b982ad82a854a6b8bf1e5214260dbd95b041b07e9ce0f6be3` |
| `website-admin-ui` | `houseofexp.com/edit/*`, `houseofexp.com/api/admin/*` | 8h | `HouseOfExpStaff` | `820b6ab12f654177a42b27a476016d987ebd11966d923af801cc781671c36882` |
| `client-staff-ui` | `client.houseofexp.com/admin*`, `client.houseofexp.com/api/admin/*`, `client.houseofexp.com/api/media/upload-token` | 8h | `HouseOfExpStaff` | `bacf895a30ee5f34981f9b10f1d54a6ab9a280346ebb7fec0ee8b713c24e1234` |

Full API responses captured at `/tmp/access-rollback-evidence/{apps,policies,idps}-snapshot.json` (ephemeral — re-fetch via `GET /accounts/{id}/access/apps` if needed for a future diff).

## Changes made this session

1. Created `client-admin-api` and `client-admin-upload` apps, discovered they used **separate audience tags** from `client-staff-ui` — this would have broken JWT validation in `exp-vault/lib/access-auth.ts`, which checks a single `ACCESS_AUDIENCE`. Merged all three destinations into the original `client-staff-ui` app (one shared AUD) and deleted the two standalone apps.
2. Removed a stray `done` policy and an inline (non-reusable) `HouseOfExpStaff` copy from `website-admin-ui`; replaced with the single reusable `HouseOfExpStaff` policy.
3. Removed a stray `email` policy from `client-staff-ui`.
4. Fixed `client-staff-ui` session duration 6h → 8h to match the design spec.
5. Set `ACCESS_TEAM_DOMAIN`, `ACCESS_AUDIENCE`, `HOX_STAFF_{ALDI,DISSA,BIL}_EMAIL` as Wrangler secrets on `dash-exp-gateway`, `studio-staff-v2`, `house-of-exp` (Cloudflare Workers).
6. Discovered Finance's and Client Portal's (`exp-vault`) existing `ACCESS_*`/`HOX_STAFF_*` Vercel env vars were **empty strings** despite being marked "set 2-3 days ago" — Vercel's default-sensitive Production policy made prior entries write-only and apparently never received real values. Removed and re-added all five as `--no-sensitive` on both projects, verified via `vercel env pull` that every value now resolves correctly.
7. Confirmed `FINANCE_AUTH_PRIVATE_JWK` was untouched and intact (real RSA private JWK, `type=encrypted`, not sensitive).

## Live verification (edge-level, no staff login required)

- All 5 protected surfaces (`dash`, `studio`, `finance`, `houseofexp.com/edit/*`, `client.houseofexp.com/admin`) return `302` to `https://broad-wood-0a79.cloudflareaccess.com/cdn-cgi/access/login/...` with a `kid` matching the exact AUD configured for that app.
- Sub-paths `houseofexp.com/api/admin/*`, `client.houseofexp.com/api/admin/*`, `client.houseofexp.com/api/media/upload-token` also redirect to Access (inherit the parent app's protection).
- `dash.houseofexp.com/api/session/login` (the local-auth-only endpoint) is blocked at the Access edge in production — defense-in-depth beyond the Worker's own `ENVIRONMENT`/`AUTH_MODE` check.
- Public/unprotected paths remain open: `houseofexp.com/` (200), `client.houseofexp.com/` (200), Finance JWKS (200, bypass policy).

## Not yet verified (requires staff email access)

Per the design's browser smoke flow, the following need one of Aldi/Dissa/Bil to actually complete an Access One-Time PIN login (I do not have access to their inboxes):

1. Gateway login → mapped identity displayed, no password prompt.
2. Studio/Finance/Website Admin/Client Admin opened from the gateway without a second login prompt.
3. One representative authenticated read + write in each active app.
4. Client Portal `/` external client login unaffected by staff Access.
5. Per-app logout and global logout re-require Access.
6. Gateway local mode (generated test passwords) rejected in production — confirmed indirectly above (endpoint blocked at the Access edge), not via an actual password attempt against a live local-mode deployment.

## Rollback procedure

Each platform retains its own deployment history natively:

- **Cloudflare Workers** (Gateway, Studio, Website): `npx wrangler rollback [version-id]` from the respective repo, or redeploy the prior git commit. Removing the `ACCESS_*`/`HOX_STAFF_*` secrets makes the app fail closed with `503` (per Global Constraints — never falls back to local mode in production).
- **Vercel** (Finance, Client Portal): roll back via `vercel rollback` or the dashboard's Deployments tab to the previous production deployment.
- **Access policy rollback**: disable the specific app's `HouseOfExpStaff` policy attachment (`PATCH` the app with an empty `policies` array, or delete the app) to stop protecting that surface — this does **not** widen the allow policy or affect other apps. Never broaden `HouseOfExpStaff` beyond the three staff emails; never enable local password mode in production.
