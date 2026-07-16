import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  backendUnavailable,
  invalidCredentials,
} from "@/domain/errors/auth-errors";

// Rewired (per-entry-point dependency wiring revision): `googleLogin` Server
// Action now constructs its `signInWithGoogle` use case inline from the
// auth/session adapters instead of going through a shared factory module.
// Also relocated out of `src/app/login/` (the Server Action's old home) to
// `src/infraestructure/actions/google-login/google-login.action.ts` — Server
// Actions are infrastructure adapters, not app-routing code.

const executeMock = vi.fn();
const signInWithGoogleMock = vi.fn<(deps: unknown) => typeof executeMock>(
  () => executeMock
);
const createBackendAuthAdapterMock = vi.fn(() => ({ exchange: vi.fn() }));
const createCookieSessionAdapterMock = vi.fn(() => ({
  create: vi.fn(),
  get: vi.fn(),
  clear: vi.fn(),
}));
const redirectMock = vi.fn();

vi.mock(
  "@/application/use-cases/sign-in-with-google/sign-in-with-google",
  () => ({
    signInWithGoogle: (deps: unknown) => signInWithGoogleMock(deps),
  })
);

vi.mock("@/infraestructure/auth/backend-auth.adapter", () => ({
  createBackendAuthAdapter: () => createBackendAuthAdapterMock(),
}));

vi.mock("@/infraestructure/session/cookie-session.adapter", () => ({
  createCookieSessionAdapter: () => createCookieSessionAdapterMock(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

describe("googleLogin (inline dependency wiring Server Action)", () => {
  beforeEach(() => {
    executeMock.mockReset();
    signInWithGoogleMock.mockClear();
    createBackendAuthAdapterMock.mockClear();
    createCookieSessionAdapterMock.mockClear();
    redirectMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exchanges the idToken via signInWithGoogle and redirects to / on success", async () => {
    const { googleLogin } = await import("../google-login.action");
    executeMock.mockResolvedValue({
      token: "backend-jwt",
      user: {
        id: "1",
        name: "Ada",
        email: "a@b.com",
        role: "boxer",
        pictureUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = await googleLogin("fake-id-token");

    expect(createBackendAuthAdapterMock).toHaveBeenCalled();
    expect(createCookieSessionAdapterMock).toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalledWith("fake-id-token");
    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(result).toBeUndefined();
  });

  it("maps InvalidCredentials to { ok: false, code: 'invalid-credentials' } without redirecting", async () => {
    const { googleLogin } = await import("../google-login.action");
    executeMock.mockRejectedValue(invalidCredentials());

    const result = await googleLogin("fake-id-token");

    expect(result).toEqual({ ok: false, code: "invalid-credentials" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("maps BackendUnavailable to { ok: false, code: 'backend-unavailable' } without redirecting", async () => {
    const { googleLogin } = await import("../google-login.action");
    executeMock.mockRejectedValue(backendUnavailable());

    const result = await googleLogin("fake-id-token");

    expect(result).toEqual({ ok: false, code: "backend-unavailable" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("maps any other thrown error to { ok: false, code: 'unknown' } without redirecting", async () => {
    const { googleLogin } = await import("../google-login.action");
    executeMock.mockRejectedValue(new Error("boom"));

    const result = await googleLogin("fake-id-token");

    expect(result).toEqual({ ok: false, code: "unknown" });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
