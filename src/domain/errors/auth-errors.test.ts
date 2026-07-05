import { describe, expect, it } from "vitest";

import {
  backendUnavailable,
  invalidCredentials,
  sessionInvalid,
} from "./auth-errors";

describe("invalidCredentials", () => {
  it("creates an Error tagged 'InvalidCredentials'", () => {
    const error = invalidCredentials();

    expect(error).toBeInstanceOf(Error);
    expect(error._tag).toBe("InvalidCredentials");
  });
});

describe("backendUnavailable", () => {
  it("defaults to a generic message with no cause", () => {
    const error = backendUnavailable();

    expect(error._tag).toBe("BackendUnavailable");
    expect(error.message).toBe("Auth backend unavailable");
    expect(error.cause).toBeUndefined();
  });

  it("carries the original cause and a custom message when provided", () => {
    const networkFailure = new Error("fetch failed: ECONNREFUSED");

    const error = backendUnavailable(networkFailure, "Backend returned 503");

    expect(error.cause).toBe(networkFailure);
    expect(error.message).toBe("Backend returned 503");
  });
});

describe("sessionInvalid", () => {
  it("creates an Error tagged 'SessionInvalid'", () => {
    const error = sessionInvalid();

    expect(error).toBeInstanceOf(Error);
    expect(error._tag).toBe("SessionInvalid");
  });
});
