import { describe, expect, test, vi } from "vitest";
import worker, { handleFetch } from "./index";
import type { WorkerEnv } from "./types";

function testEnv(): WorkerEnv {
  return {
    ASSETS: {
      fetch: vi.fn(async () => new Response("asset fallback", { status: 200 })),
      connect: () => {
        throw new Error("Unexpected asset socket connection in routing tests.");
      },
    },
    ENVIRONMENT: "local",
    AUTH_MODE: "local",
  };
}

describe("gateway worker routing", () => {
  test("serves non-API requests through the static asset binding", async () => {
    const env = testEnv();
    const response = await worker.fetch(new Request("https://gateway.example/unknown"), env);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("asset fallback");
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });
  test("dispatches API requests without touching static assets", async () => {
    const env = testEnv();
    const request = new Request("https://gateway.example/api/session");
    const response = await handleFetch(request, env, (assetRequest) => env.ASSETS.fetch(assetRequest));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "local_session_required" });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  test("returns a typed response when an API handler rejects input", async () => {
    const env = testEnv();
    const response = await handleFetch(
      new Request("https://gateway.example/api/session/login", { method: "POST", body: "{}" }),
      env,
      (assetRequest) => env.ASSETS.fetch(assetRequest),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_login_body" });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  test("dispatches logout requests to the local endpoint handler", async () => {
    const env = testEnv();
    const response = await handleFetch(
      new Request("https://gateway.example/api/session/logout"),
      env,
      (assetRequest) => env.ASSETS.fetch(assetRequest),
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toMatchObject({ error: "method_not_allowed" });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });
});
