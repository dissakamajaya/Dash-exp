export type StaffId = "aldi" | "dissa" | "bil";
export type StaffIdentity = { staffId: StaffId; name: string; email: string };

export type PublicSession = Pick<StaffIdentity, "staffId" | "name">;
export interface AccessBindings {
  AUTH_MODE?: "access" | "local";
  ENVIRONMENT: "production" | "local";
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUDIENCE?: string;
  HOX_STAFF_ALDI_EMAIL?: string;
  HOX_STAFF_DISSA_EMAIL?: string;
  HOX_STAFF_BIL_EMAIL?: string;
  LOCAL_PASSWORD_VERIFIERS?: string;
  LOCAL_SESSION_SECRET?: string;
}

type GeneratedEnv = Omit<Cloudflare.Env, keyof AccessBindings>;
export type WorkerEnv = GeneratedEnv & AccessBindings;

export const STAFF_NAMES: Record<StaffId, string> = {
  aldi: "Pak Aldi",
  dissa: "Pak Dissa",
  bil: "Pak Bil",
};

export class AuthFailure extends Error {
  readonly status: 401 | 403 | 404 | 503;
  readonly code: string;

  constructor(status: AuthFailure["status"], code: string, message: string) {
    super(message);
    this.name = "AuthFailure";
    this.status = status;
    this.code = code;
  }
}

export function publicSession(identity: StaffIdentity): PublicSession {
  return { staffId: identity.staffId, name: identity.name };
}

export function normalizeEmail(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function staffIdentity(staffId: StaffId, email: string): StaffIdentity {
  return { staffId, name: STAFF_NAMES[staffId], email };
}

export function configuredStaffByEmail(env: WorkerEnv): Map<string, StaffIdentity> {
  const configured: Array<[StaffId, string | undefined]> = [
    ["aldi", env.HOX_STAFF_ALDI_EMAIL],
    ["dissa", env.HOX_STAFF_DISSA_EMAIL],
    ["bil", env.HOX_STAFF_BIL_EMAIL],
  ];

  const byEmail = new Map<string, StaffIdentity>();
  for (const [staffId, rawEmail] of configured) {
    const email = normalizeEmail(rawEmail);
    if (!email) {
      throw new AuthFailure(503, "missing_staff_mapping", "Staff email mapping is not configured.");
    }
    if (byEmail.has(email)) {
      throw new AuthFailure(503, "duplicate_staff_mapping", "Staff email mapping is duplicated.");
    }
    byEmail.set(email, staffIdentity(staffId, email));
  }

  return byEmail;
}
