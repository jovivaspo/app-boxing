import type { Session } from "@/domain/session.model";
import type { SessionPort } from "@/application/ports/session.port";

interface GetCurrentSessionDeps {
  session: SessionPort;
}

export function getCurrentSession({ session }: GetCurrentSessionDeps) {
  return function execute(): Promise<Session | null> {
    return session.get();
  };
}
