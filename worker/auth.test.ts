import { afterEach, describe, expect, test, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import worker from "./index";
import { createLocalPasswordVerifier } from "./local-auth";
import type { WorkerEnv } from "./types";

const ASSETS: Fetcher = {
  fetch: async () => new Response("asset fallback"),
  connect: () => {
    throw new Error("Unexpected asset socket connection in auth tests.");
  },
};

async function localEnv(password: string): Promise<WorkerEnv> {
  const verifier = await createLocalPasswordVerifier("aldi", password, undefined, 100_000);
  return {
    ASSETS,
    ENVIRONMENT: "local",
    AUTH_MODE: "local",
    LOCAL_PASSWORD_VERIFIERS: JSON.stringify([
      verifier,
      await createLocalPasswordVerifier("dissa", "dissa-password", undefined, 100_000),
      await createLocalPasswordVerifier("bil", "bil-password", undefined, 100_000),
    ]),
    LOCAL_SESSION_SECRET: "test-local-session-secret",
  };
}

const accessEnv: WorkerEnv = {
  ASSETS,
  ENVIRONMENT: "production",
  AUTH_MODE: "access",
  ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
  ACCESS_AUDIENCE: "audience",
  HOX_STAFF_ALDI_EMAIL: "aldi@example.com",
  HOX_STAFF_DISSA_EMAIL: "dissa@example.com",
  HOX_STAFF_BIL_EMAIL: "bil@example.com",
};

function accessEnvFor(hostname: string, overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ...accessEnv,
    ACCESS_TEAM_DOMAIN: `https://${hostname}`,
    ...overrides,
  };
}

async function accessAssertion({
  issuer,
  audience = "audience",
  email = "aldi@example.com",
  expiresAt = Math.floor(Date.now() / 1000) + 120,
  jwksStatus = 200,
}: {
  issuer: string;
  audience?: string;
  email?: string;
  expiresAt?: number;
  jwksStatus?: number;
}): Promise<string> {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  const kid = `kid-${crypto.randomUUID()}`;
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.origin === issuer && url.pathname === "/cdn-cgi/access/certs") {
      return new Response(jwksStatus === 200 ? JSON.stringify({ keys: [{ ...jwk, kid, alg: "RS256", use: "sig" }] }) : "upstream unavailable", {
        status: jwksStatus,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`Unexpected fetch ${url.toString()}`);
  });

  return new SignJWT({ email })
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(privateKey);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gateway auth worker", () => {
  test("local login issues an HttpOnly session and GET /api/session returns the server identity", async () => {
    const env = await localEnv("aldi-password");
    const login = await worker.fetch(
      new Request("http://localhost/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: "aldi", password: "aldi-password" }),
      }),
      env,
    );

    expect(login.status).toBe(200);
    expect(login.headers.get("Set-Cookie")).toContain("HttpOnly");
    await expect(login.json()).resolves.toEqual({ staffId: "aldi", name: "Pak Aldi" });

    const session = await worker.fetch(
      new Request("http://localhost/api/session", { headers: { Cookie: login.headers.get("Set-Cookie") ?? "" } }),
      env,
    );

    expect(session.status).toBe(200);
    await expect(session.json()).resolves.toEqual({ staffId: "aldi", name: "Pak Aldi" });
  });

  test("local login rejects wrong passwords without issuing a cookie", async () => {
    const env = await localEnv("aldi-password");
    const response = await worker.fetch(
      new Request("http://localhost/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: "aldi", password: "wrong-password" }),
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Set-Cookie")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_local_login" });
  });

  test("local endpoints accept any hostname when ENVIRONMENT=local and AUTH_MODE=local", async () => {
    const env = await localEnv("aldi-password");
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: "aldi", password: "aldi-password" }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ staffId: "aldi", name: "Pak Aldi" });
  });

  test("local login rejects bad method/body regardless of hostname", async () => {
    const env = await localEnv("aldi-password");
    const cases: [Request, number, Record<string, string>][] = [
      [new Request("https://gateway.houseofexp.com/api/session/login", { method: "GET" }), 405, { error: "method_not_allowed" }],
      [new Request("https://gateway.houseofexp.com/api/session/login", { method: "POST", body: "not json" }), 400, { error: "invalid_login_body" }],
      [new Request("https://gateway.houseofexp.com/api/session/logout", { method: "GET" }), 405, { error: "method_not_allowed" }],
    ];

    for (const [request, expectedStatus, expectedBody] of cases) {
      const response = await worker.fetch(request, env);
      expect(response.status).toBe(expectedStatus);
      await expect(response.json()).resolves.toMatchObject(expectedBody);
    }
  });

  test("malformed local verifier config is a typed service configuration failure", async () => {
    const env = await localEnv("aldi-password");
    env.LOCAL_PASSWORD_VERIFIERS = JSON.stringify([
      { staffId: "aldi", salt: "not base64url", iterations: 100_000, hash: "short" },
      await createLocalPasswordVerifier("dissa", "dissa-password", undefined, 100_000),
      await createLocalPasswordVerifier("bil", "bil-password", undefined, 100_000),
    ]);

    const response = await worker.fetch(
      new Request("http://localhost/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: "aldi", password: "aldi-password" }),
      }),
      env,
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_local_verifiers" });
  });

  test("valid Access assertion returns the mapped staff session", async () => {
    const hostname = "valid.team.cloudflareaccess.com";
    const issuer = `https://${hostname}`;
    const token = await accessAssertion({ issuer });
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session", { headers: { "Cf-Access-Jwt-Assertion": token } }),
      accessEnvFor(hostname),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ staffId: "aldi", name: "Pak Aldi" });
  });

  test("Access assertions with the wrong audience are rejected as invalid credentials", async () => {
    const hostname = "wrong-audience.team.cloudflareaccess.com";
    const issuer = `https://${hostname}`;
    const token = await accessAssertion({ issuer, audience: "other-audience" });
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session", { headers: { "Cf-Access-Jwt-Assertion": token } }),
      accessEnvFor(hostname),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_access_assertion" });
  });

  test("expired Access assertions are rejected as invalid credentials", async () => {
    const hostname = "expired.team.cloudflareaccess.com";
    const issuer = `https://${hostname}`;
    const token = await accessAssertion({ issuer, expiresAt: Math.floor(Date.now() / 1000) - 60 });
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session", { headers: { "Cf-Access-Jwt-Assertion": token } }),
      accessEnvFor(hostname),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_access_assertion" });
  });

  test("unmapped Access email is denied after JWT validation", async () => {
    const hostname = "unmapped.team.cloudflareaccess.com";
    const issuer = `https://${hostname}`;
    const token = await accessAssertion({ issuer, email: "other@example.com" });
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session", { headers: { "Cf-Access-Jwt-Assertion": token } }),
      accessEnvFor(hostname),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "unmapped_access_email" });
  });

  test("JWKS upstream outages are typed service failures", async () => {
    const hostname = "jwks-outage.team.cloudflareaccess.com";
    const issuer = `https://${hostname}`;
    const token = await accessAssertion({ issuer, jwksStatus: 503 });
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session", { headers: { "Cf-Access-Jwt-Assertion": token } }),
      accessEnvFor(hostname),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "access_jwks_unavailable" });
  });

  test("production ignores browser-claimed identity without a validated Access JWT", async () => {
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session?gateway_user=dissa", {
        headers: { "Cf-Access-Authenticated-User-Email": "dissa@example.com" },
      }),
      accessEnv,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "missing_access_assertion" });
  });

  test("missing Access team domain is a typed configuration failure", async () => {
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session"),
      { ...accessEnv, ACCESS_TEAM_DOMAIN: undefined },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "missing_access_team_domain" });
  });

  test("missing Access audience is a typed configuration failure", async () => {
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session"),
      { ...accessEnv, ACCESS_AUDIENCE: undefined },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "missing_access_audience" });
  });
});
