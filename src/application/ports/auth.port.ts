import type { Session } from "@/domain/session.model";

export interface AuthPort {
  exchange(idToken: string): Promise<Session>;
}
