import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";
import { AuthFailure, configuredStaffByEmail, normalizeEmail, type StaffIdentity, type WorkerEnv } from "./types";

const jwksByIssuer = new Map<string, JWTVerifyGetKey>();

function requiredBinding(value: string | undefined, code: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new AuthFailure(503, code, "Access runtime configuration is missing.");
  return normalized;
}

function teamIssuer(teamDomain: string): string {
  const candidate = teamDomain.includes("://") ? teamDomain : `https://${teamDomain}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new AuthFailure(503, "invalid_access_team_domain", "Access team domain is invalid.");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new AuthFailure(503, "invalid_access_team_domain", "Access team domain is invalid.");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new AuthFailure(503, "invalid_access_team_domain", "Access team domain must not include a path.");
  }

  return url.origin;
}

function remoteJwks(issuer: string): JWTVerifyGetKey {
  const cached = jwksByIssuer.get(issuer);
  if (cached) return cached;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  jwksByIssuer.set(issuer, jwks);
  return jwks;
}

function isJwksServiceFailure(error: errors.JOSEError): boolean {
  if (
    error.code === "ERR_JWKS_TIMEOUT" ||
    error.code === "ERR_JWKS_INVALID" ||
    error.code === "ERR_JWKS_MULTIPLE_MATCHING_KEYS" ||
    error.code === "ERR_JWK_INVALID" ||
    error.code === "ERR_JOSE_NOT_SUPPORTED"
  ) {
    return true;
  }
  return error.code === "ERR_JOSE_GENERIC" && /JSON Web Key Set|JWKS|JWK|200 OK/i.test(error.message);
}

export async function getAccessIdentity(request: Request, env: WorkerEnv): Promise<StaffIdentity> {
  if (env.ENVIRONMENT === "production" && env.AUTH_MODE === "local") {
    throw new AuthFailure(503, "local_mode_in_production", "Local auth mode is not available in production.");
  }

  const teamDomain = requiredBinding(env.ACCESS_TEAM_DOMAIN, "missing_access_team_domain");
  const audience = requiredBinding(env.ACCESS_AUDIENCE, "missing_access_audience");
  const issuer = teamIssuer(teamDomain);
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    throw new AuthFailure(401, "missing_access_assertion", "Missing Cloudflare Access assertion.");
  }

  let payloadEmail: string | null = null;
  try {
    const { payload } = await jwtVerify(token, remoteJwks(issuer), {
      issuer,
      audience,
      algorithms: ["RS256"],
      requiredClaims: ["email"],
    });
    payloadEmail = typeof payload.email === "string" ? normalizeEmail(payload.email) : null;
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      if (isJwksServiceFailure(error)) {
        throw new AuthFailure(503, "access_jwks_unavailable", "Cloudflare Access JWKS is unavailable.");
      }
      throw new AuthFailure(401, "invalid_access_assertion", "Invalid Cloudflare Access assertion.");
    }
    throw new AuthFailure(503, "access_jwks_unavailable", "Cloudflare Access JWKS is unavailable.");
  }

  if (!payloadEmail) {
    throw new AuthFailure(403, "missing_access_email", "Cloudflare Access identity is not mapped.");
  }

  const identity = configuredStaffByEmail(env).get(payloadEmail);
  if (!identity) {
    throw new AuthFailure(403, "unmapped_access_email", "Cloudflare Access identity is not mapped.");
  }

  return identity;
}
