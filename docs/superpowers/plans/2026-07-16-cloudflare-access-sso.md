# House of EXP Cloudflare Access SSO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Aldi, Dissa, and Bil one Cloudflare Access login that opens every authorized House of EXP staff application without another password prompt, while preserving external Client Portal authentication.

**Architecture:** Cloudflare Access protects each staff-facing hostname/path and supplies a signed application JWT. Every backend validates that identity or exchanges it for a narrowly scoped native session. Production identity is an explicit email-to-staff mapping; local generated passwords remain server-side, localhost-only test credentials.

**Tech Stack:** React 19, Vite 7/8, Cloudflare Workers and Access, `jose`, Astro 6, Next.js 15, Convex 1.41+, Vitest, Playwright.

## Global Constraints

- Canonical staff IDs are exactly `aldi`, `dissa`, and `bil`; Studio maps canonical `bil` to existing database ID `bill`.
- Production identity comes only from a validated `Cf-Access-Jwt-Assertion`.
- Validate RS256 signature, issuer, application audience, time claims, and explicit lowercased email mapping.
- Required shared bindings are `ACCESS_TEAM_DOMAIN`, `ACCESS_AUDIENCE`, `HOX_STAFF_ALDI_EMAIL`, `HOX_STAFF_DISSA_EMAIL`, and `HOX_STAFF_BIL_EMAIL`.
- Missing production config, duplicate mappings, absent email claims, and unmapped identities fail closed.
- Local passwords are random, server-verified, localhost-only, and absent from browser-exposed variables, committed files, and production fallback paths.
- Client Portal `/` keeps external client auth; staff SSO enters through `/admin`.
- Cloudflare Access policy is defense in depth, not a replacement for backend authorization.
- Preserve unrelated working-tree changes, including the current sound/Cuelume work in `Dash-exp`.

---

### Task 1: Gateway Worker Identity Boundary

**Files:**
- Create: `worker/access.ts`
- Create: `worker/local-auth.ts`
- Create: `worker/index.ts`
- Create: `worker/types.ts`
- Create: `src/lib/session.ts`
- Create: `wrangler.jsonc`
- Create: `.dev.vars.example`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/App.tsx`
- Modify: `src/data/gateway.ts`

**Interfaces:**
- Produces: `getAccessIdentity(request, env): Promise<StaffIdentity>` and `getLocalIdentity(request, env): Promise<StaffIdentity | null>`.
- Produces: `GET /api/session -> { staffId: StaffId; name: string }`.
- Produces: local-only `POST /api/session/login` body `{ staffId, password }` and `POST /api/session/logout`.
- Consumes: Access team/audience and staff email bindings from Global Constraints.

- [x] **Step 1: Add Worker runtime and auth dependencies**

Use Bun, matching the active `bun.lock`:

```bash
bun add jose
bun add -d wrangler @cloudflare/workers-types vitest
```

Add scripts:

```json
{
  "dev": "vite",
  "dev:auth": "bun run build && wrangler dev",
  "build": "vite build",
  "test": "vitest run",
  "deploy": "bun run build && wrangler deploy"
}
```

- [x] **Step 2: Implement fail-closed Access validation**

`worker/types.ts` owns the shared contract:

```ts
export type StaffId = "aldi" | "dissa" | "bil";
export type StaffIdentity = { staffId: StaffId; name: string; email: string };

export interface Env {
  ASSETS: Fetcher;
  AUTH_MODE?: "access" | "local";
  ENVIRONMENT: "production" | "local";
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUDIENCE?: string;
  HOX_STAFF_ALDI_EMAIL?: string;
  HOX_STAFF_DISSA_EMAIL?: string;
  HOX_STAFF_BIL_EMAIL?: string;
  LOCAL_PASSWORD_VERIFIERS?: string;
  LOCAL_SESSION_SECRET?: string;
}
```

`worker/access.ts` must build a `createRemoteJWKSet` URL from `ACCESS_TEAM_DOMAIN`, call `jwtVerify` with exact issuer and audience, normalize the email claim, map it to one staff ID, and throw typed `401`, `403`, or `503` failures. Never accept a plain identity header or query parameter.

- [x] **Step 3: Implement localhost-only password sessions**

`worker/local-auth.ts` parses salted verifiers from `LOCAL_PASSWORD_VERIFIERS`, verifies the selected password with Web Crypto PBKDF2, and issues an HMAC-signed HttpOnly `hox_local_session` cookie. It must require both `ENVIRONMENT === "local"` and `AUTH_MODE === "local"`; either production or a non-local host returns `404`.

- [x] **Step 4: Serve the SPA and session API from one Worker**

`worker/index.ts` routes only the three session endpoints and delegates every other request to `env.ASSETS.fetch(request)`. `wrangler.jsonc` binds `dist` assets with SPA fallback and declares `ENVIRONMENT: "production"`, `AUTH_MODE: "access"` as non-secret vars. Access and staff mappings remain secrets/configuration outside source.

- [x] **Step 5: Replace browser-claimed identity in the gateway UI**

`src/lib/session.ts` exports:

```ts
export type Session = { staffId: "aldi" | "dissa" | "bil"; name: string };
export async function getSession(): Promise<Session>;
export async function localLogin(staffId: Session["staffId"], password: string): Promise<Session>;
export async function logout(): Promise<void>;
```

In production, `App.tsx` hydrates `GET /api/session`, derives `selectedUser` from the returned staff ID, prevents user-shape reassignment, removes `gateway_user` from redirects, and shows a deterministic denied/configuration state. In local mode, retain the existing selector/password experience and submit to `/api/session/login`. Preserve sound, theme, shapes, motion, coming-soon behavior, and current user edits.

- [x] **Step 6: Smoke the gateway behavior**

Run:

```bash
bun run build
bun run dev:auth
```

Exercise local mode through the Worker, not Vite alone: correct generated password selects the server-returned identity; wrong password stays on the gateway; changing the selected shape cannot impersonate another identity after login; active destinations redirect without `gateway_user`; coming-soon destinations stay in-page.

---

### Task 2: Studio Access Identity Cutover

**Files:**
- Create: `../STUDIOSTAFF V2/worker/access-auth.ts`
- Modify: `../STUDIOSTAFF V2/worker/types.ts`
- Modify: `../STUDIOSTAFF V2/worker/index.ts`
- Modify: `../STUDIOSTAFF V2/wrangler.toml`
- Modify: `../STUDIOSTAFF V2/src/lib/api/generic.ts`
- Modify: `../STUDIOSTAFF V2/src/lib/api/index.ts`
- Modify: `../STUDIOSTAFF V2/src/App.tsx`
- Modify: `../STUDIOSTAFF V2/src/pages/LoginPage.tsx`
- Modify: `../STUDIOSTAFF V2/.env.example`
- Modify: `../STUDIOSTAFF V2/.dev.vars.example`
- Modify: `../STUDIOSTAFF V2/package.json`

**Interfaces:**
- Consumes: the Access validation and email mapping contract from Global Constraints.
- Produces: `authenticateStaff(request, env): Promise<{ canonicalId: StaffId; memberId: "aldi" | "dissa" | "bill" }>`.
- Produces: existing `GET /api/auth/verify` response `{ ok: true, member }` from Access identity.

- [x] **Step 1: Add `jose` and Access runtime bindings**

Use the repository's package manager to add `jose`. Extend `WorkerEnv` with Access settings, `ENVIRONMENT`, and `AUTH_MODE`. Configure the Worker route `studio.houseofexp.com/api/*` so SPA and API share the Access application and origin.

- [x] **Step 2: Validate Access JWT and preserve Studio member IDs**

`worker/access-auth.ts` validates issuer/audience/signature/time/email and applies:

```ts
const STUDIO_MEMBER_BY_STAFF = {
  aldi: "aldi",
  dissa: "dissa",
  bil: "bill",
} as const;
```

All production `/api/*` handlers derive `authenticatedMember` from this function. `POST /api/auth/login` and `/api/auth/change-password` return `404` outside explicit local mode. `GET /api/auth/verify` remains the frontend bootstrap.

- [x] **Step 3: Remove deployed bearer-token login assumptions**

Use same-origin `/api` requests with credentials. Production `api.verify()` relies on the Access cookie/header path and no longer requires `ss2-token`. Keep the existing local JWT only when the Worker reports local mode. On logout, clear local state and navigate to `/cdn-cgi/access/logout`.

- [ ] **Step 4: Smoke Studio through the same-origin Worker route**

Confirm Access identity hydrates the correct existing member, one representative read and write record that member in audit data, `bill` remains the database ID for Bil, and an unmapped identity cannot reach any business API.

---

### Task 3: Website Admin Access Guard

**Files:**
- Modify: `../website/src/content/server/auth.ts`
- Modify: `../website/src/content/server/bindings.ts`
- Modify: `../website/src/env.d.ts`
- Modify: `../website/src/content/server/test-fixtures.ts`
- Modify: `../website/src/components/edit/AdminLogin.tsx`
- Modify: `../website/src/pages/edit/login.astro`
- Modify: `../website/src/pages/edit/index.astro`
- Modify: `../website/src/pages/api/admin/logout.ts`
- Modify: `../website/.env.example`
- Modify: `../website/wrangler.jsonc`

**Interfaces:**
- Consumes: Access bindings and staff mapping from Global Constraints.
- Produces: `requireAdmin(request, bindings): Promise<string>` returning the mapped canonical staff ID/email provenance for Access, while retaining local password sessions only in local mode.

- [x] **Step 1: Add Access validation to the existing auth seam**

Use the existing `jose` dependency. Split `requireAdmin` into explicit Access and local-session branches. Production tries only Access and validates the application JWT. Remove production dependency on `ADMIN_PASSWORD_HASH`; keep `SESSION_SECRET` only where existing local sessions need it.

- [x] **Step 2: Replace deployed password UX**

`/edit/login` becomes an Access bootstrap/denied screen rather than a password form. Admin pages continue calling guarded APIs. Logout clears any native local cookie and redirects to the Access logout endpoint.

- [ ] **Step 3: Smoke public/admin separation**

Verify public pages still load without Access, `/edit/*` and `/api/admin/*` require Access, one content read and write succeeds for mapped staff, private media remains guarded, and password login is unavailable in production mode.

---

### Task 4: Client Portal Staff Route Split

**Files:**
- Create: `../exp-vault/lib/access-auth.ts`
- Create: `../exp-vault/app/api/auth/access/route.ts`
- Create: `../exp-vault/app/admin/page.tsx`
- Modify: `../exp-vault/lib/session.ts`
- Modify: `../exp-vault/middleware.ts`
- Modify: `../exp-vault/components/UntitledExpVault.tsx`
- Modify: `../exp-vault/components/hooks/use-vault-auth.ts`
- Modify: `../exp-vault/.env.local.example`

**Interfaces:**
- Consumes: Access assertion and canonical staff mapping.
- Produces: `AccessAdminSession = { user: StaffId; role: "admin"; authSource: "cloudflare-access" }`.
- Produces: `GET /api/auth/access?returnTo=/admin`, accepting no other redirect target.
- Preserves: existing `{ user, role: "client" }` external client sessions and root login.

- [x] **Step 1: Extend session provenance without broadening roles**

Update `SessionPayload` to make `authSource` explicit for new staff sessions. Existing external client login writes `authSource: "password"`. `requireAdmin` still checks `role === "admin"`; no request body or query parameter can set the role.

- [x] **Step 2: Implement Access exchange and fixed redirect**

`lib/access-auth.ts` validates Access JWT and maps staff. `app/api/auth/access/route.ts` creates the admin session and redirects only to `/admin`. `app/admin/page.tsx` initiates the exchange when there is no valid Access-backed admin session and renders the admin view otherwise.

- [x] **Step 3: Preserve external client behavior**

Do not protect `/`, `/api/profile`, or client-note routes with Access. Existing client usernames/passwords, project scoping, and remember-session behavior remain unchanged. Protect `/admin*`, `/api/admin/*`, and `/api/media/upload-token` with Access plus existing app guards.

- [ ] **Step 4: Smoke both trust domains**

Verify an external client can log in at `/`, sees only assigned projects, and cannot enter `/admin`; mapped Access staff enters `/admin` without a client password and can perform one guarded admin read/write; the agent API still requires its service key.

---

### Task 5: Finance Convex Authorization

**Files:**
- Create: `../STUDIOSTAFF-FINANCE/api/auth/token.ts`
- Create: `../STUDIOSTAFF-FINANCE/api/auth/.well-known/jwks.ts`
- Create: `../STUDIOSTAFF-FINANCE/api/lib/access-auth.ts`
- Create: `../STUDIOSTAFF-FINANCE/api/lib/bridge-jwt.ts`
- Create: `../STUDIOSTAFF-FINANCE/src/hooks/useConvexAccessAuth.js`
- Create: `../STUDIOSTAFF-FINANCE/convex/lib/auth.ts`
- Modify: `../STUDIOSTAFF-FINANCE/src/main.jsx`
- Modify: `../STUDIOSTAFF-FINANCE/src/components/AuthProvider.jsx`
- Modify: `../STUDIOSTAFF-FINANCE/src/components/AppShell.jsx`
- Modify: `../STUDIOSTAFF-FINANCE/src/pages/Login.jsx`
- Modify: `../STUDIOSTAFF-FINANCE/src/lib/api.js`
- Modify: `../STUDIOSTAFF-FINANCE/convex/auth.config.ts`
- Modify: every public handler under `../STUDIOSTAFF-FINANCE/convex/*.ts`
- Modify: `../STUDIOSTAFF-FINANCE/.env.example`
- Modify: `../STUDIOSTAFF-FINANCE/package.json`

**Interfaces:**
- Produces: `POST /api/auth/token -> { token: string }`, five-minute RS256 bridge JWT, same-origin and `no-store`.
- Produces: `GET /api/auth/.well-known/jwks -> { keys: JsonWebKey[] }` containing public keys only.
- Produces: `requireStaffIdentity(ctx): Promise<{ staffId: StaffId; tokenIdentifier: string }>`.
- Consumes: `FINANCE_AUTH_PRIVATE_JWK`, Access bindings, exact issuer `https://finance.houseofexp.com/api/auth`, audience `house-of-exp-finance`.

- [x] **Step 1: Remove browser-bundled authentication secrets**

Delete `VITE_APP_PASSWORD` use and the production local-storage sentinel. Add `jose` and server function typings. Local password verification occurs only in the server function during localhost development and returns a bridge token; it never compares a `VITE_*` value.

- [x] **Step 2: Implement Access-to-Convex bridge**

Validate the Access assertion, enforce same-origin, sign a five-minute RS256 JWT with headers `{ alg: "RS256", typ: "JWT", kid }`, and claims `{ sub, staffId, email, iss, aud, iat, exp }`. Return `Cache-Control: no-store`. The JWKS handler derives and returns only the public JWK.

- [x] **Step 3: Configure Convex custom JWT auth**

Use the documented provider shape:

```ts
export default {
  providers: [{
    type: "customJwt",
    applicationID: "house-of-exp-finance",
    issuer: "https://finance.houseofexp.com/api/auth",
    jwks: "https://finance.houseofexp.com/api/auth/.well-known/jwks",
    algorithm: "RS256",
  }],
};
```

`useConvexAccessAuth` exposes `isLoading`, `isAuthenticated`, and `fetchAccessToken({ forceRefreshToken })`. `src/main.jsx` uses `ConvexProviderWithAuth`.

- [x] **Step 4: Enforce identity in every Convex function**

`convex/lib/auth.ts` calls `ctx.auth.getUserIdentity()`, rejects null identity, validates canonical `staffId`, and returns it. Every exported query, mutation, and action invokes it before database or external-service access. Do not accept user IDs from function arguments for authorization.

- [x] **Step 5: Replace password login UI with Access state**

Production Login becomes a bootstrap/error view. `AuthProvider` reflects Convex/Access state rather than arbitrary local storage. Logout clears in-memory state and navigates to Access logout.

- [ ] **Step 6: Smoke direct and browser access**

Exercise a representative finance read and write through the browser, then call the same Convex functions without an identity and confirm both reject. Confirm expired bridge tokens refresh once, invalid Access audience cannot mint a bridge, and the public JWKS contains no private key material.

---

### Task 6: Cloudflare Access Pilot Configuration

**Files:**
- No source files. This task changes Cloudflare Zero Trust configuration after all five application bridges smoke successfully in local/test mode.

**Interfaces:**
- Consumes: deployed hostnames, each Access AUD tag, actual staff email addresses, and the path map in the approved design.
- Produces: one reusable three-email allow policy and the seven protected application/path resources.

- [ ] **Step 1: Inspect account state before mutation**

Use authenticated Cloudflare account access to list existing identity providers, Access applications, policies, DNS records, and current custom domains. Reuse matching resources; do not create duplicate applications or guess IDs.

- [ ] **Step 2: Configure a three-user pilot**

Enable Access One-Time PIN, create or reuse a reusable allow policy containing only Aldi, Dissa, and Bil's actual lowercased email addresses, then apply the exact resource/path table from the design spec. Set global session to 24 hours and application sessions to 8 hours. Keep the Finance JWKS route publicly readable while its token endpoint remains Access-protected.

- [ ] **Step 3: Propagate runtime configuration**

Set each app's team domain, own audience tag, and staff email mappings in its deployment secret/config system. Set Finance bridge private JWK only in the Vercel server environment and expose no private key through JWKS or frontend variables.

- [ ] **Step 4: Run the approved browser smoke matrix**

Authenticate once at the gateway and open Studio, Finance, Website Admin, and Client Admin without a second prompt. Perform one representative authenticated read and write in each app. Verify an unauthorized email receives Access denial, external Client Portal login still works, and global logout requires Access again everywhere.

- [ ] **Step 5: Record rollback evidence**

Capture the pre-change Access/application settings and deployment revisions. If a target fails its smoke flow, disable only that target's Access application and roll back its deployment; never enable local password mode in production or broaden the allow policy.

## Plan Self-Review

- Every approved scope item maps to one task.
- Production identity and role derivation are server-side and fail closed.
- The Client Portal external trust domain remains separate.
- Finance's bridge contract matches Convex custom JWT requirements and avoids returning the raw Access assertion.
- Local passwords are implementation-only test credentials; no plaintext or verifier is committed.
- Cloudflare mutations occur only after account/resource inspection and use a three-user pilot.
