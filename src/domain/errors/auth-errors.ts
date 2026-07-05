export interface InvalidCredentials extends Error {
  readonly _tag: "InvalidCredentials";
}

export function invalidCredentials(
  message = "Invalid credentials"
): InvalidCredentials {
  return Object.assign(new Error(message), {
    _tag: "InvalidCredentials" as const,
  });
}

export interface BackendUnavailable extends Error {
  readonly _tag: "BackendUnavailable";
}

export function backendUnavailable(
  cause?: unknown,
  message = "Auth backend unavailable"
): BackendUnavailable {
  return Object.assign(new Error(message, { cause }), {
    _tag: "BackendUnavailable" as const,
  });
}

export interface SessionInvalid extends Error {
  readonly _tag: "SessionInvalid";
}

export function sessionInvalid(message = "Session invalid"): SessionInvalid {
  return Object.assign(new Error(message), {
    _tag: "SessionInvalid" as const,
  });
}

export type AuthError = InvalidCredentials | BackendUnavailable | SessionInvalid;
