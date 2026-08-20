import { invalidCredentials } from "@/domain/errors/auth-errors";
import type { Session } from "@/domain/session.model";
import type { AuthPort } from "@/application/ports/auth.port";
import type { SessionPort } from "@/application/ports/session.port";

interface SignInWithGoogleDeps {
  auth: AuthPort;
  session: SessionPort;
}

export function signInWithGoogle({ auth, session }: SignInWithGoogleDeps) {
  return async function execute(idToken: string): Promise<Session> {
    if (!idToken) {
      throw invalidCredentials("ID token is required");
    }

    const newSession = await auth.exchange(idToken);
    await session.create(newSession);

    return newSession;
  };
}
