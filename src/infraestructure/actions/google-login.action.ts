"use server";

import { redirect } from "next/navigation";

import { createBackendAuthAdapter } from "@/infraestructure/auth/backend-auth.adapter";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { signInWithGoogle } from "@/application/use-cases/sign-in-with-google/sign-in-with-google";

export type GoogleLoginErrorCode =
  "invalid-credentials" | "backend-unavailable" | "unknown";

export interface GoogleLoginFailure {
  ok: false;
  code: GoogleLoginErrorCode;
}

function toErrorCode(error: unknown): GoogleLoginErrorCode {
  const tag = (error as { _tag?: unknown } | null)?._tag;
  if (tag === "InvalidCredentials") return "invalid-credentials";
  if (tag === "BackendUnavailable") return "backend-unavailable";
  return "unknown";
}

/**
 * Thin Server Action adapter (lives in `infraestructure/actions`, not
 * `app/`, per hexagonal layering — Server Actions are infra, not routing).
 * Builds the `signInWithGoogle` use case inline with its real adapters,
 * exchanges the Google ID token, and redirects to `/` on success. Domain
 * errors are mapped to `{ ok:false, code }` — the raw backend
 * response/idToken are never logged or returned to the client.
 */
export async function googleLogin(
  idToken: string
): Promise<GoogleLoginFailure | void> {
  try {
    await signInWithGoogle({
      auth: createBackendAuthAdapter(),
      session: createCookieSessionAdapter(),
    })(idToken);
  } catch (error) {
    return { ok: false, code: toErrorCode(error) };
  }

  redirect("/");
}
