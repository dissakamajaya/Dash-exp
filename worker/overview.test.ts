import { describe, expect, test, vi } from "vitest";
import { handleOverview } from "./overview";
import type { WorkerEnv } from "./types";

const identity = { staffId: "dissa" as const, name: "Pak Dissa", email: "dissa@example.com" };

function env(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return { ENVIRONMENT: "production", AUTH_MODE: "access", EXP_GATEWAY_TOKEN: "gateway-test-token", ...overrides } as WorkerEnv;
}

function fakeCache(entry?: { body: unknown; builtAt: number }) {
  const store = new Map<string, Response>();
  if (entry) store.set("k", new Response(JSON.stringify(entry.body), { headers: { "x-built-at": String(entry.builtAt) } }));
  return {
    store,
    match: vi.fn(async () => store.get("k")?.clone()),
    put: vi.fn(async (_key: string, response: Response) => { store.set("k", response); }),
  };
}

describe("overview endpoint caching", () => {
  test("serves a fresh cached overview without rebuilding", async () => {
    const cache = fakeCache({ body: { generatedAt: "cached" }, builtAt: Date.now() - 60_000 });
    const build = vi.fn();
    const waitUntil = vi.fn();
    const response = await handleOverview(new Request("https://dash.example/api/overview"), env(), { identify: async () => identity, build, cache, ctx: { waitUntil } });
    await expect(response.json()).resolves.toEqual({ generatedAt: "cached" });
    expect(build).not.toHaveBeenCalled();
    expect(waitUntil).not.toHaveBeenCalled();
  });

  test("serves a stale overview immediately and rebuilds it in the background", async () => {
    const cache = fakeCache({ body: { generatedAt: "old" }, builtAt: Date.now() - 20 * 60_000 });
    const build = vi.fn(async () => ({ generatedAt: "new" }));
    const pending: Promise<unknown>[] = [];
    const response = await handleOverview(new Request("https://dash.example/api/overview"), env(), { identify: async () => identity, build, cache, ctx: { waitUntil: (p) => { pending.push(p); } } });
    await expect(response.json()).resolves.toEqual({ generatedAt: "old" });
    expect(pending).toHaveLength(1);
    await Promise.all(pending);
    expect(build).toHaveBeenCalledOnce();
    expect(cache.put).toHaveBeenCalledOnce();
  });

  test("builds and stores when nothing is cached yet", async () => {
    const cache = fakeCache();
    const build = vi.fn(async () => ({ generatedAt: "first" }));
    const response = await handleOverview(new Request("https://dash.example/api/overview"), env(), { identify: async () => identity, build, cache, ctx: { waitUntil: vi.fn() } });
    await expect(response.json()).resolves.toEqual({ generatedAt: "first" });
    expect(cache.put).toHaveBeenCalledOnce();
  });
});

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
