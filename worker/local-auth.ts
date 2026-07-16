import { AuthFailure, STAFF_NAMES, staffIdentity, type StaffId, type StaffIdentity, type WorkerEnv } from "./types";

const COOKIE_NAME = "hox_local_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 1_000_000;
const DEFAULT_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const DERIVED_BITS = 256;
const DERIVED_BYTES = DERIVED_BITS / 8;
const encoder = new TextEncoder();

type PasswordVerifier = {
  staffId: StaffId;
  salt: string;
  iterations: number;
  hash: string;
};

type LocalSessionClaims = {
  staffId: StaffId;
  exp: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStaffId(value: unknown): value is StaffId {
  return value === "aldi" || value === "dissa" || value === "bil";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw new Error("Invalid base64url value.");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    DERIVED_BITS,
  );
  return new Uint8Array(bits);
}

async function hmac(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

export function assertLocalEndpoint(request: Request, env: WorkerEnv): void {
  const hostname = new URL(request.url).hostname;
  const localhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  if (env.ENVIRONMENT !== "local" || env.AUTH_MODE !== "local" || !localhost) {
    throw new AuthFailure(404, "local_auth_unavailable", "Local auth is not available.");
  }
}

function parseVerifier(value: unknown): PasswordVerifier | null {
  if (!isRecord(value)) return null;
  if (!isStaffId(value.staffId)) return null;
  if (typeof value.salt !== "string" || typeof value.hash !== "string") return null;
  if (
    typeof value.iterations !== "number" ||
    !Number.isSafeInteger(value.iterations) ||
    value.iterations < MIN_ITERATIONS ||
    value.iterations > MAX_ITERATIONS
  ) {
    return null;
  }
  let salt: Uint8Array;
  let hash: Uint8Array;
  try {
    salt = base64UrlDecode(value.salt);
    hash = base64UrlDecode(value.hash);
  } catch {
    return null;
  }
  if (salt.length !== SALT_BYTES || hash.length !== DERIVED_BYTES) return null;
  return { staffId: value.staffId, salt: value.salt, iterations: value.iterations, hash: value.hash };
}

function parseVerifiers(env: WorkerEnv): Map<StaffId, PasswordVerifier> {
  const raw = env.LOCAL_PASSWORD_VERIFIERS?.trim();
  if (!raw) throw new AuthFailure(503, "missing_local_verifiers", "Local password verifiers are not configured.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AuthFailure(503, "invalid_local_verifiers", "Local password verifiers are invalid.");
  }

  if (!Array.isArray(parsed)) {
    throw new AuthFailure(503, "invalid_local_verifiers", "Local password verifiers are invalid.");
  }

  const verifiers = new Map<StaffId, PasswordVerifier>();
  for (const item of parsed) {
    const verifier = parseVerifier(item);
    if (!verifier || verifiers.has(verifier.staffId)) {
      throw new AuthFailure(503, "invalid_local_verifiers", "Local password verifiers are invalid.");
    }
    verifiers.set(verifier.staffId, verifier);
  }

  for (const staffId of Object.keys(STAFF_NAMES)) {
    if (!verifiers.has(staffId as StaffId)) {
      throw new AuthFailure(503, "invalid_local_verifiers", "Local password verifiers are incomplete.");
    }
  }

  return verifiers;
}

function parseCookie(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) continue;
    cookies[name] = valueParts.join("=");
  }
  return cookies;
}

function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function sessionCookie(token: string, maxAge: number): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

async function createSignedSession(staffId: StaffId, env: WorkerEnv): Promise<string> {
  const secret = env.LOCAL_SESSION_SECRET?.trim();
  if (!secret) throw new AuthFailure(503, "missing_local_session_secret", "Local session secret is not configured.");
  const claims: LocalSessionClaims = { staffId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const payload = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const signature = base64UrlEncode(await hmac(payload, secret));
  return `${payload}.${signature}`;
}

async function verifySignedSession(token: string, env: WorkerEnv): Promise<LocalSessionClaims | null> {
  const secret = env.LOCAL_SESSION_SECRET?.trim();
  if (!secret) throw new AuthFailure(503, "missing_local_session_secret", "Local session secret is not configured.");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  let decodedSignature: Uint8Array;
  try {
    decodedSignature = base64UrlDecode(signature);
  } catch {
    return null;
  }
  const expected = await hmac(payload, secret);
  if (!constantTimeEqual(decodedSignature, expected)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch {
    return null;
  }
  if (!isRecord(decoded) || !isStaffId(decoded.staffId) || typeof decoded.exp !== "number") return null;
  if (decoded.exp <= Math.floor(Date.now() / 1000)) return null;
  return { staffId: decoded.staffId, exp: decoded.exp };
}

export async function createLocalPasswordVerifier(
  staffId: StaffId,
  password: string,
  salt = crypto.getRandomValues(new Uint8Array(16)),
  iterations = DEFAULT_ITERATIONS,
): Promise<PasswordVerifier> {
  const hash = await pbkdf2(password, salt, iterations);
  return { staffId, salt: base64UrlEncode(salt), iterations, hash: base64UrlEncode(hash) };
}

export async function getLocalIdentity(request: Request, env: WorkerEnv): Promise<StaffIdentity | null> {
  assertLocalEndpoint(request, env);
  const token = parseCookie(request.headers.get("Cookie"))[COOKIE_NAME];
  if (!token) return null;
  const claims = await verifySignedSession(token, env);
  if (!claims) return null;
  return staffIdentity(claims.staffId, `${claims.staffId}@local.houseofexp.test`);
}

export async function verifyLocalLogin(
  request: Request,
  env: WorkerEnv,
  staffId: StaffId,
  password: string,
): Promise<{ identity: StaffIdentity; cookie: string }> {
  assertLocalEndpoint(request, env);
  const verifier = parseVerifiers(env).get(staffId);
  if (!verifier) throw new AuthFailure(401, "invalid_local_login", "Invalid staff ID or password.");
  const attemptedHash = await pbkdf2(password, base64UrlDecode(verifier.salt), verifier.iterations);
  if (!constantTimeEqual(attemptedHash, base64UrlDecode(verifier.hash))) {
    throw new AuthFailure(401, "invalid_local_login", "Invalid staff ID or password.");
  }
  const identity = staffIdentity(staffId, `${staffId}@local.houseofexp.test`);
  return { identity, cookie: sessionCookie(await createSignedSession(staffId, env), SESSION_TTL_SECONDS) };
}

export function clearLocalSessionCookie(): string {
  return clearCookie();
}
