import type { Session } from "@/domain/session.model";
import type { SessionPort } from "@/application/ports/session.port";

interface GetCurrentSessionDeps {
  session: SessionPort;
}

/** Returns the current authenticated session, or null when absent/invalid (force re-login). */
export function getCurrentSession({ session }: GetCurrentSessionDeps) {
  return function execute(): Promise<Session | null> {
    return session.get();
  };
}
