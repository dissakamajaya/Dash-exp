import { buildOverview } from "./overview-core.mjs";
import type { StaffIdentity, WorkerEnv } from "./types";

const DEFAULT_GATEWAY_ORIGIN = "https://api.houseofexp.com";
const CACHE_SECONDS = 300;
const CACHE_KEY = "https://dash.houseofexp.com/__overview";

type Deps = {
  identify: (request: Request, env: WorkerEnv) => Promise<StaffIdentity>;
  build?: typeof buildOverview;
  ctx?: Pick<ExecutionContext, "waitUntil">;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}

/**
 * Founder overview data for /overview/. Staff-only (same identity check as the
 * gateway session), built from read-only gateway operations with the Worker's
 * own gateway token, and shared across viewers for five minutes at the edge so
 * page loads don't fan out to every app.
 */
export async function handleOverview(request: Request, env: WorkerEnv, deps: Deps): Promise<Response> {
  if (request.method !== "GET") return json({ error: "method_not_allowed", message: "Method not allowed." }, 405);

  try {
    await deps.identify(request, env);
  } catch (error) {
    const failure = error as { status?: number; code?: string; message?: string };
    return json({ error: failure.code ?? "unauthorized", message: failure.message ?? "Unauthorized." }, failure.status ?? 401);
  }

  if (!env.EXP_GATEWAY_TOKEN) {
    return json({ error: "overview_not_configured", message: "The overview gateway token is not configured." }, 503);
  }

  const cache = typeof caches === "undefined" ? null : (caches as unknown as { default: Cache }).default;
  const cached = await cache?.match(CACHE_KEY);
  if (cached) return json(await cached.json());

  const data = await (deps.build ?? buildOverview)({
    origin: env.EXP_GATEWAY_ORIGIN ?? DEFAULT_GATEWAY_ORIGIN,
    token: env.EXP_GATEWAY_TOKEN,
    analyticsToken: env.CF_ANALYTICS_TOKEN,
    accountId: env.CF_ACCOUNT_ID,
  });
  const body = JSON.stringify(data);
  const store = cache?.put(CACHE_KEY, new Response(body, { headers: { "Cache-Control": `max-age=${CACHE_SECONDS}` } }));
  if (store) deps.ctx?.waitUntil(store);
  return json(data);
}
