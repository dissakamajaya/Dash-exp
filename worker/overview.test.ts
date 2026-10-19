import { describe, expect, test, vi } from "vitest";
import { handleOverview } from "./overview";
import type { WorkerEnv } from "./types";

const identity = { staffId: "dissa" as const, name: "Pak Dissa", email: "dissa@example.com" };

function env(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return { ENVIRONMENT: "production", AUTH_MODE: "access", EXP_GATEWAY_TOKEN: "gateway-test-token", ...overrides } as WorkerEnv;
}

describe("overview endpoint", () => {
  test("requires a signed-in staff identity before reading anything", async () => {
    const build = vi.fn();
    const response = await handleOverview(new Request("https://dash.example/api/overview"), env(), {
      identify: async () => { throw Object.assign(new Error("no"), { status: 401, code: "access_required" }); },
      build,
    });
    expect(response.status).toBe(401);
    expect(build).not.toHaveBeenCalled();
  });

  test("reports missing configuration without calling the gateway", async () => {
    const build = vi.fn();
    const response = await handleOverview(new Request("https://dash.example/api/overview"), env({ EXP_GATEWAY_TOKEN: undefined }), {
      identify: async () => identity,
      build,
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "overview_not_configured" });
    expect(build).not.toHaveBeenCalled();
  });

  test("builds the overview with the gateway token and never caches it in the browser", async () => {
    const build = vi.fn(async () => ({ generatedAt: "2026-10-19T00:00:00Z" }));
    const response = await handleOverview(new Request("https://dash.example/api/overview"), env({ CF_ANALYTICS_TOKEN: "analytics-test-token" }), {
      identify: async () => identity,
      build,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ generatedAt: "2026-10-19T00:00:00Z" });
    expect(build).toHaveBeenCalledWith({
      origin: "https://api.houseofexp.com",
      token: "gateway-test-token",
      analyticsToken: "analytics-test-token",
      accountId: undefined,
    });
  });

  test("rejects other methods", async () => {
    const response = await handleOverview(new Request("https://dash.example/api/overview", { method: "POST" }), env(), {
      identify: async () => identity,
      build: vi.fn(),
    });
    expect(response.status).toBe(405);
  });
});
