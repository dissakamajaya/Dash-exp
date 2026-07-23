# Plan 010: Add tests for worker/access.ts Cloudflare JWT verify path

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 85e6c6d..HEAD -- worker/access.ts worker/types.ts worker/auth.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `85e6c6d`, 2026-07-23

## Why this matters

The auth path that handles production identity (`worker/access.ts`, JWT
verification via `jose`) has zero tests. The local-auth path has 256 lines
of tests; the production auth path has none. Production identity is the
higher-impact surface (every user logs in through it in production), so the
test gap is the inverse of the risk profile. This plan adds the minimum
coverage that would catch the regression classes most likely in this file:
missing JWT header, invalid audience, invalid issuer, missing email,
unmapped email.

## Current state

`worker/access.ts` (96 lines) exports one function: `getAccessIdentity(request, env)`.
It depends on:

- `worker/types.ts` — `AuthFailure`, `configuredStaffByEmail`, `normalizeEmail`,
  `StaffIdentity`, `WorkerEnv`.
- `jose` — `createRemoteJWKSet`, `errors`, `jwtVerify`.

The function flow:

1. Reject if `ENVIRONMENT === "production" && AUTH_MODE === "local"` (403).
2. Read `ACCESS_TEAM_DOMAIN` + `ACCESS_AUDIENCE` from env (503 if missing).
3. Validate `teamDomain` is HTTPS without path/userinfo/query/hash (503).
4. Read `Cf-Access-Jwt-Assertion` header (401 if missing).
5. Call `jwtVerify(token, jwks, { issuer, audience, algorithms: ["RS256"], requiredClaims: ["email"] })`.
6. On `JOSEError`: if JWKS service failure → 503, else → 401.
7. Read `payload.email`, normalize, look up in `configuredStaffByEmail(env)` → 403 if unmapped.
8. Return `StaffIdentity`.

The existing `worker/auth.test.ts` covers `local-auth.ts` exhaustively
(cookie parse, PBKDF2 verify, session token verify, etc.). Use it as the
structural pattern for the new test file.

`worker/types.ts:51-71` exports `configuredStaffByEmail(env)`. The test
needs a `WorkerEnv` fixture with the three `HOX_STAFF_*_EMAIL` vars set.

## Commands you will need

| Purpose   | Command                 | Expected on success |
|-----------|-------------------------|---------------------|
| Tests     | `bunx vitest run`       | all pass (existing 14 + new tests) |
| Typecheck | `bunx tsc --noEmit`     | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `worker/access.test.ts` (create) — new test file
- `worker/types.ts` — ONLY if you need to expose testable seams (likely not;
  the existing exports are sufficient)

**Out of scope**:
- `worker/access.ts` — this plan tests, does not refactor.
- `worker/index.ts` — separately covered in plan 011.
- Production deployment config.

## Git workflow

- Branch: `advisor/010-access-tests`
- One commit: `test(worker): cover access.ts JWT verify path`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Understand the existing test pattern

Read `worker/auth.test.ts:1-50` to learn:

- How `WorkerEnv` fixtures are constructed
- How `Request` objects are built
- How `AuthFailure` is asserted
- The import patterns used (`describe`, `it`, `expect`, `vi`)

**Verify**: mental model of test structure clear.

### Step 2: Create `worker/access.test.ts`

Start with the imports:

```ts
import { describe, expect, it, vi } from "vitest";
import { AuthFailure, type WorkerEnv } from "./types";
import { getAccessIdentity } from "./access";
```

Then a fixture helper:

```ts
function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ENVIRONMENT: "production",
    AUTH_MODE: "access",
    ACCESS_TEAM_DOMAIN: "https://myteam.cloudflareaccess.com",
    ACCESS_AUDIENCE: "aud-123",
    HOX_STAFF_ALDI_EMAIL: "aldi@example.com",
    HOX_STAFF_DISSA_EMAIL: "dissa@example.com",
    HOX_STAFF_BIL_EMAIL: "bil@example.com",
    ...overrides,
  } as WorkerEnv;
}

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://dash.houseofexp.com/", { headers });
}
```

The hard part: `jwtVerify` hits a real Cloudflare JWKS endpoint
(`{teamDomain}/cdn-cgi/access/certs`). Use `vi.mock("jose", ...)` to stub
it. The pattern:

```ts
vi.mock("jose", async () => {
  const actual = await vi.importActual<typeof import("jose")>("jose");
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(() => () => ({ /* public key */ })),
    jwtVerify: vi.fn(),
  };
});
```

Then each test calls `vi.mocked(jwtVerify).mockResolvedValue({ payload: { email: "aldi@example.com" } })`
or `mockRejectedValue(new errors.JOSEError("...", "ERR_JWT_INVALID"))`.

### Step 3: Write the test cases

Six tests, in this order:

```ts
describe("getAccessIdentity", () => {
  it("throws 401 when Cf-Access-Jwt-Assertion header is missing", async () => {
    await expect(getAccessIdentity(makeRequest(), makeEnv())).rejects.toMatchObject({
      status: 401,
      code: "missing_access_assertion",
    });
  });

  it("throws 503 when ACCESS_TEAM_DOMAIN is not configured", async () => {
    const env = makeEnv({ ACCESS_TEAM_DOMAIN: undefined });
    const req = makeRequest({ "Cf-Access-Jwt-Assertion": "fake.jwt.token" });
    await expect(getAccessIdentity(req, env)).rejects.toMatchObject({
      status: 503,
      code: "missing_access_team_domain",
    });
  });

  it("throws 503 when ACCESS_AUDIENCE is not configured", async () => {
    const env = makeEnv({ ACCESS_AUDIENCE: undefined });
    const req = makeRequest({ "Cf-Access-Jwt-Assertion": "fake.jwt.token" });
    await expect(getAccessIdentity(req, env)).rejects.toMatchObject({
      status: 503,
      code: "missing_access_audience",
    });
  });

  it("throws 401 when JWT verify fails for non-JWKS reason", async () => {
    const jose = await import("jose");
    vi.mocked(jose.jwtVerify).mockRejectedValueOnce(
      new jose.errors.JOSEError("invalid signature", "ERR_JWS_INVALID"),
    );
    const req = makeRequest({ "Cf-Access-Jwt-Assertion": "fake.jwt.token" });
    await expect(getAccessIdentity(req, makeEnv())).rejects.toMatchObject({
      status: 401,
      code: "invalid_access_assertion",
    });
  });

  it("throws 503 when JWKS service is unavailable", async () => {
    const jose = await import("jose");
    vi.mocked(jose.jwtVerify).mockRejectedValueOnce(
      new jose.errors.JOSEError("jwks timeout", "ERR_JWKS_TIMEOUT"),
    );
    const req = makeRequest({ "Cf-Access-Jwt-Assertion": "fake.jwt.token" });
    await expect(getAccessIdentity(req, makeEnv())).rejects.toMatchObject({
      status: 503,
      code: "access_jwks_unavailable",
    });
  });

  it("returns identity when JWT verifies and email is mapped", async () => {
    const jose = await import("jose");
    vi.mocked(jose.jwtVerify).mockResolvedValueOnce({
      payload: { email: "aldi@example.com" },
    } as never);
    const req = makeRequest({ "Cf-Access-Jwt-Assertion": "fake.jwt.token" });
    const identity = await getAccessIdentity(req, makeEnv());
    expect(identity.staffId).toBe("aldi");
    expect(identity.email).toBe("aldi@example.com");
  });

  it("throws 403 when JWT email is not mapped to any staff", async () => {
    const jose = await import("jose");
    vi.mocked(jose.jwtVerify).mockResolvedValueOnce({
      payload: { email: "unknown@example.com" },
    } as never);
    const req = makeRequest({ "Cf-Access-Jwt-Assertion": "fake.jwt.token" });
    await expect(getAccessIdentity(req, makeEnv())).rejects.toMatchObject({
      status: 403,
      code: "unmapped_access_email",
    });
  });
});
```

If `vi.mock("jose", ...)` is too invasive, an alternative is to stub
`globalThis.fetch` and let the real `jose` flow run against a local mock
JWKS server. Prefer `vi.mock` — it's cleaner.

**Verify**: `bunx vitest run worker/access.test.ts` → all 7 tests pass.

### Step 4: Run full test suite

```bash
bunx vitest run
```

**Verify**: all 21 tests pass (existing 14 + 7 new).

### Step 5: Commit

```bash
git add worker/access.test.ts
git commit -m "test(worker): cover access.ts JWT verify path"
```

**Verify**: `git log --oneline -1` shows the commit; `git status` clean.

## Test plan

This plan IS the test plan. The 7 tests above cover:

| Test | Failure class caught |
|------|---------------------|
| Missing JWT header | Regressions in header extraction |
| Missing team domain | Config error in production |
| Missing audience | Config error in production |
| JWT verify fails (non-JWKS) | Token tampering / expiry |
| JWKS unavailable | Cloudflare outage handling |
| Happy path | Whole auth chain |
| Unmapped email | Rejecting unconfigured identities |

## Done criteria

- [ ] `bunx vitest run worker/access.test.ts` exits 0; 7 new tests pass
- [ ] `bunx vitest run` exits 0; 21 tests total pass
- [ ] `bunx tsc --noEmit` exits 0
- [ ] `git status` clean
- [ ] `plans/README.md` row for plan 010 updated to `DONE`

## STOP conditions

Stop and report back if:
- `vi.mock("jose", ...)` doesn't restore between tests — the test file
  becomes order-dependent. Fix by adding `vi.restoreAllMocks()` to a
  `beforeEach` block.
- The real `jose` library can't be loaded under vitest due to ESM issues
  (uncommon but possible). Switch to a heavier stub that doesn't import
  `jose` at all — define a fake `createRemoteJWKSet` and `jwtVerify`
  directly in the mock factory.
- `worker/types.ts` exports don't support a useful test fixture (you need
  to construct a `WorkerEnv` that isn't fully typed). Check whether
  `WorkerEnv` is `export type WorkerEnv = ... & AccessBindings`; if yes,
  the test fixture cast above should work.

## Maintenance notes

- The `vi.mock` of `jose` will need updating if `jose` v7 changes its
  export surface. Watch for breakages after `bun pm ls jose` updates.
- New branches in `getAccessIdentity` (e.g. a future scope check, audience
  array support) need a corresponding test here. The plan's coverage is
  minimal — once this lands, follow-up plans can add deeper cases (empty
  email payload, audience mismatch, etc.).
- The mock approach (`vi.mock` + `mockResolvedValue`) is the same pattern
  used for any external JWT-verifier library; the next time the auth path
  changes (e.g. swap `jose` for `oslo`), the test will need a one-line
  factory update.
