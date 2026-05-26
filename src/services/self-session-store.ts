import { SELF_MAX_SESSIONS, SELF_SESSION_TTL_MS } from "../config/self.js";
import type {
  SelfDeregistrationSession,
  SelfRefreshSession,
  SelfRegistrationSession,
} from "../clients/self-api.js";

export type SelfSessionKind = "registration" | "refresh" | "deregistration";

export type StoredSelfSession =
  | {
      kind: "registration";
      session: SelfRegistrationSession;
      createdAt: number;
    }
  | {
      kind: "refresh";
      session: SelfRefreshSession;
      createdAt: number;
    }
  | {
      kind: "deregistration";
      session: SelfDeregistrationSession;
      createdAt: number;
    };

const sessions = new Map<string, StoredSelfSession>();

function pruneExpiredSessions(): void {
  const now = Date.now();

  for (const [key, entry] of sessions) {
    if (now - entry.createdAt > SELF_SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}

export function storeSelfSession(
  sessionToken: string,
  entry: StoredSelfSession,
): void {
  pruneExpiredSessions();

  if (sessions.size >= SELF_MAX_SESSIONS) {
    throw new Error(
      "Too many active Self sessions. Wait for existing sessions to expire (10 minutes) or restart the server.",
    );
  }

  sessions.set(sessionToken, entry);
}

export function getSelfSession(sessionToken: string): StoredSelfSession | undefined {
  pruneExpiredSessions();
  return sessions.get(sessionToken);
}

export function deleteSelfSession(sessionToken: string): void {
  sessions.delete(sessionToken);
}

export function clearSelfSessionsForTests(): void {
  sessions.clear();
}
