"use server";

import { redirect } from "next/navigation";

import { createSignInWithGoogleUseCase } from "@/infraestructure/composition";

export type GoogleLoginErrorCode =
  | "invalid-credentials"
  | "backend-unavailable"
  | "unknown";

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
 * Thin Server Action / composition-root consumer (D6, Phase 9.2): builds the
 * `signInWithGoogle` use case, exchanges the Google ID token, and redirects
 * to `/` on success. Domain errors are mapped to `{ ok:false, code }` — the
 * raw backend response/idToken are never logged or returned to the client.
 */
export async function googleLogin(
  idToken: string
): Promise<GoogleLoginFailure | void> {
  try {
    await createSignInWithGoogleUseCase()(idToken);
  } catch (error) {
    return { ok: false, code: toErrorCode(error) };
  }

  redirect("/");
}
