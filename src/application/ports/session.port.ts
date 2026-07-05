import type { Session } from "@/domain/session.model";

export interface SessionPort {
  /** Persists the session (sets signed jwt + user cookies). */
  create(session: Session): Promise<void>;
  /** Reads and verifies the session; returns null when absent or invalid/tampered. */
  get(): Promise<Session | null>;
  /** Deletes the session (jwt + user cookies). */
  clear(): Promise<void>;
}
