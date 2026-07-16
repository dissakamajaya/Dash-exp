import { getAccessIdentity } from "./access";
import { clearLocalSessionCookie, getLocalIdentity, verifyLocalLogin } from "./local-auth";
import { AuthFailure, publicSession, type PublicSession, type StaffId, type WorkerEnv } from "./types";

type SessionResponse = PublicSession | { error: string; message: string };

function jsonResponse(body: SessionResponse, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function isStaffId(value: unknown): value is StaffId {
  return value === "aldi" || value === "dissa" || value === "bil";
}

async function readLoginBody(request: Request): Promise<{ staffId: StaffId; password: string } | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!body || typeof body !== "object" || !("staffId" in body) || !("password" in body)) return null;
  if (!isStaffId(body.staffId) || typeof body.password !== "string") return null;
  return { staffId: body.staffId, password: body.password };
}

async function readIdentity(request: Request, env: WorkerEnv) {
  if (env.ENVIRONMENT === "local" && env.AUTH_MODE === "local") {
    const identity = await getLocalIdentity(request, env);
    if (!identity) throw new AuthFailure(401, "local_session_required", "Local login is required.");
    return identity;
  }
  return getAccessIdentity(request, env);
}

async function handleSession(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed", message: "Method not allowed." }, 405);
  const identity = await readIdentity(request, env);
  return jsonResponse(publicSession(identity));
}

async function handleLocalLogin(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed", message: "Method not allowed." }, 405);
  const body = await readLoginBody(request);
  if (!body) return jsonResponse({ error: "invalid_login_body", message: "Invalid login request." }, 400);
  const { identity, cookie } = await verifyLocalLogin(request, env, body.staffId, body.password);
  return jsonResponse(publicSession(identity), 200, { "Set-Cookie": cookie });
}

function handleLocalLogout(request: Request, env: WorkerEnv): Response {
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed", message: "Method not allowed." }, 405);
  if (env.ENVIRONMENT !== "local" || env.AUTH_MODE !== "local") {
    throw new AuthFailure(404, "local_auth_unavailable", "Local auth is not available.");
  }
  const hostname = new URL(request.url).hostname;
  const localhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  if (!localhost) throw new AuthFailure(404, "local_auth_unavailable", "Local auth is not available.");
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearLocalSessionCookie(), "Cache-Control": "no-store" },
  });
}

function failureResponse(error: unknown): Response {
  if (error instanceof AuthFailure) {
    return jsonResponse({ error: error.code, message: error.message }, error.status);
  }
  console.error(error);
  return jsonResponse({ error: "internal_error", message: "Internal server error." }, 500);
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/session") return await handleSession(request, env);
      if (url.pathname === "/api/session/login") return await handleLocalLogin(request, env);
      if (url.pathname === "/api/session/logout") return handleLocalLogout(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      return failureResponse(error);
    }
  },
} satisfies ExportedHandler<WorkerEnv>;
