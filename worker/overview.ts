import { buildOverview } from "./overview-core.mjs";
import type { StaffIdentity, WorkerEnv } from "./types";

const DEFAULT_GATEWAY_ORIGIN = "https://api.houseofexp.com";
/** Rebuild in the background once the stored overview is older than this. */
const FRESH_MS = 5 * 60_000;
/** Keep serving a stored overview for a day so nobody waits on a cold build. */
const KEEP_SECONDS = 24 * 60 * 60;
const CACHE_KEY = "https://dash.houseofexp.com/__overview";

type OverviewCache = Pick<Cache, "match" | "put">;
type Deps = {
  identify: (request: Request, env: WorkerEnv) => Promise<StaffIdentity>;
  build?: typeof buildOverview;
  cache?: OverviewCache | null;
  ctx?: Pick<ExecutionContext, "waitUntil">;
};

// One background rebuild at a time per isolate.
let rebuilding: Promise<void> | null = null;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}

/**
 * Founder overview data for /overview/. Staff-only (same identity check as the
 * gateway session), built from read-only gateway operations with the Worker's
 * own gateway token. A build fans out to ~45 slow reads (Workers allow 6 open
 * connections at a time), so the last build is served immediately and refreshed
 * in the background once it is older than five minutes.
 */
export async function handleOverview(request: Request, env: WorkerEnv, deps: Deps): Promise<Response> {
  if (request.method !== "GET") return json({ error: "method_not_allowed", message: "Method not allowed." }, 405);

  try {
    await deps.identify(request, env);
  } catch (error) {
    const failure = error as { status?: number; code?: string; message?: string };
    return json({ error: failure.code ?? "unauthorized", message: failure.message ?? "Unauthorized." }, failure.status ?? 401);
  }

  const token = env.EXP_GATEWAY_TOKEN;
  if (!token) {
    return json({ error: "overview_not_configured", message: "The overview gateway token is not configured." }, 503);
  }

  const cache = deps.cache !== undefined ? deps.cache : typeof caches === "undefined" ? null : (caches as unknown as { default: Cache }).default;
  const rebuild = async () => {
    const data = await (deps.build ?? buildOverview)({
      origin: env.EXP_GATEWAY_ORIGIN ?? DEFAULT_GATEWAY_ORIGIN,
      token,
      analyticsToken: env.CF_ANALYTICS_TOKEN,
      accountId: env.CF_ACCOUNT_ID,
    });
    await cache?.put(CACHE_KEY, new Response(JSON.stringify(data), {
      headers: { "Cache-Control": `max-age=${KEEP_SECONDS}`, "x-built-at": String(Date.now()) },
    }));
    return data;
  };

  const cached = await cache?.match(CACHE_KEY);
  if (cached) {
    const age = Date.now() - Number(cached.headers.get("x-built-at") ?? 0);
    if (age > FRESH_MS && !rebuilding) {
      rebuilding = rebuild().then(() => undefined, (error) => console.error("overview rebuild failed", error)).finally(() => { rebuilding = null; });
      deps.ctx?.waitUntil(rebuilding);
    }
    return json(await cached.json());
  }

  return json(await rebuild());
}
