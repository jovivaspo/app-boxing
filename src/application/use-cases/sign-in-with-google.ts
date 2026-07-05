import { invalidCredentials } from "@/domain/errors/auth-errors";
import type { Session } from "@/domain/session.model";
import type { AuthPort } from "@/application/ports/auth.port";
import type { SessionPort } from "@/application/ports/session.port";

interface SignInWithGoogleDeps {
  auth: AuthPort;
  session: SessionPort;
}

/**
 * Exchanges a Google ID token for a session and persists it.
 * @throws {import("@/domain/errors/auth-errors").InvalidCredentials} empty idToken, or backend rejects it (401/403).
 * @throws {import("@/domain/errors/auth-errors").BackendUnavailable} network failure, 5xx, or malformed response.
 */
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
