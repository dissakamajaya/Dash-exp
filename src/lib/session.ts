export type StaffId = "aldi" | "dissa" | "bil";
export type Session = { staffId: StaffId; name: string };

export class SessionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "SessionError";
    this.status = status;
    this.code = code;
  }
}


function readStringField(value: unknown, field: "error" | "message"): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (field === "error" && "error" in value && typeof value.error === "string") return value.error;
  if (field === "message" && "message" in value && typeof value.message === "string") return value.message;
  return undefined;
}

function isStaffId(value: unknown): value is StaffId {
  return value === "aldi" || value === "dissa" || value === "bil";
}

function parseSession(value: unknown): Session {
  if (!value || typeof value !== "object" || !("staffId" in value) || !("name" in value)) {
    throw new SessionError(500, "invalid_session_response", "Session response was invalid.");
  }
  if (!isStaffId(value.staffId) || typeof value.name !== "string") {
    throw new SessionError(500, "invalid_session_response", "Session response was invalid.");
  }
  return { staffId: value.staffId, name: value.name };
}

async function readError(response: Response): Promise<SessionError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return new SessionError(
    response.status,
    readStringField(payload, "error") ?? "session_request_failed",
    readStringField(payload, "message") ?? "Session request failed.",
  );
}

async function readSession(response: Response): Promise<Session> {
  if (!response.ok) throw await readError(response);
  return parseSession(await response.json());
}

export async function getSession(): Promise<Session> {
  const response = await fetch("/api/session", { credentials: "same-origin" });
  return readSession(response);
}

export async function localLogin(staffId: Session["staffId"], password: string): Promise<Session> {
  const response = await fetch("/api/session/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId, password }),
  });
  return readSession(response);
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/session/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  if (!response.ok) throw await readError(response);
}
