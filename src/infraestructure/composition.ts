import type { AuthPort } from "@/application/ports/auth.port";
import type { SessionPort } from "@/application/ports/session.port";
import { createBackendAuthAdapter } from "@/infraestructure/auth/backend-auth.adapter";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { signInWithGoogle } from "@/application/use-cases/sign-in-with-google";
import { getCurrentSession } from "@/application/use-cases/get-current-session";
import { signOut } from "@/application/use-cases/sign-out";

/**
 * Composition root (D6): the single seam every entry point (Server Action,
 * RSC, Route Handler) imports to build use cases wired to the real
 * adapters. `BACKEND_URL`/`SESSION_SECRET` reads stay inside their
 * respective adapters (`createBackendAuthAdapter`/`createCookieSessionAdapter`,
 * PR3/PR4) rather than being hoisted here — moving them would require
 * re-plumbing already-implemented, already-tested adapter constructors with
 * no behavioral benefit. This module still gives the app layer one place to
 * construct adapters/use cases, satisfying D6's "one composition root" intent.
 */

export function createAuthAdapter(): AuthPort {
  return createBackendAuthAdapter();
}

export function createSessionAdapter(): SessionPort {
  return createCookieSessionAdapter();
}

export function createSignInWithGoogleUseCase() {
  return signInWithGoogle({
    auth: createAuthAdapter(),
    session: createSessionAdapter(),
  });
}

export function createGetCurrentSessionUseCase() {
  return getCurrentSession({ session: createSessionAdapter() });
}

export function createSignOutUseCase() {
  return signOut({ session: createSessionAdapter() });
}
