import type { Session } from "@/domain/session.model";

export interface AuthPort {
  /**
   * Exchanges a Google ID token for an authenticated session.
   * @throws {import("@/domain/errors/auth-errors").InvalidCredentials} backend rejects the token (401/403).
   * @throws {import("@/domain/errors/auth-errors").BackendUnavailable} network failure, 5xx, or malformed response.
   */
  exchange(idToken: string): Promise<Session>;
}
