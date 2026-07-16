import { describe, expect, test } from "vitest";
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

  test("local endpoints are unavailable away from localhost", async () => {
    const env = await localEnv("aldi-password");
    const response = await worker.fetch(
      new Request("https://gateway.houseofexp.com/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: "aldi", password: "aldi-password" }),
      }),
      env,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "local_auth_unavailable" });
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
});
