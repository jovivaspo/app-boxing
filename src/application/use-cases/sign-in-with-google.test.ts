import { describe, expect, it, vi } from "vitest";

import { invalidCredentials } from "@/domain/errors/auth-errors";
import type { Session } from "@/domain/session.model";
import type { AuthPort } from "@/application/ports/auth.port";
import type { SessionPort } from "@/application/ports/session.port";

import { signInWithGoogle } from "./sign-in-with-google";

const fakeSession: Session = {
  token: "backend-jwt",
  user: {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "boxer",
    pictureUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

function makeAuth(overrides?: Partial<AuthPort>): AuthPort {
  return {
    exchange: vi.fn().mockResolvedValue(fakeSession),
    ...overrides,
  };
}

function makeSession(overrides?: Partial<SessionPort>): SessionPort {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    clear: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("signInWithGoogle", () => {
  it("exchanges the ID token, persists the session, and returns it", async () => {
    const auth = makeAuth();
    const session = makeSession();

    const result = await signInWithGoogle({ auth, session })("google-id-token");

    expect(auth.exchange).toHaveBeenCalledWith("google-id-token");
    expect(session.create).toHaveBeenCalledWith(fakeSession);
    expect(result).toBe(fakeSession);
  });

  it("rejects with InvalidCredentials for an empty ID token and never creates a session", async () => {
    const auth = makeAuth();
    const session = makeSession();

    await expect(signInWithGoogle({ auth, session })("")).rejects.toMatchObject(
      {
        _tag: "InvalidCredentials",
      }
    );

    expect(auth.exchange).not.toHaveBeenCalled();
    expect(session.create).not.toHaveBeenCalled();
  });

  it("propagates errors thrown by the auth port and never creates a session", async () => {
    const authError = invalidCredentials("Backend rejected the token");
    const auth = makeAuth({ exchange: vi.fn().mockRejectedValue(authError) });
    const session = makeSession();

    await expect(
      signInWithGoogle({ auth, session })("google-id-token")
    ).rejects.toBe(authError);

    expect(session.create).not.toHaveBeenCalled();
  });
});
