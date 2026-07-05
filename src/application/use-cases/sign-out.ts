import type { SessionPort } from "@/application/ports/session.port";

interface SignOutDeps {
  session: SessionPort;
}

/** Clears the current session. */
export function signOut({ session }: SignOutDeps) {
  return function execute(): Promise<void> {
    return session.clear();
  };
}
