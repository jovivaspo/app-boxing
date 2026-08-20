import type { Session } from "@/domain/session.model";

export interface SessionPort {
  create(session: Session): Promise<void>;
  get(): Promise<Session | null>;
  clear(): Promise<void>;
}
