import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  backendUnavailable,
  invalidCredentials,
} from "@/domain/errors/auth-errors";

// Rewired (Phase 9.2) `googleLogin` Server Action: thin wrapper around the
// composition root's `signInWithGoogle` use case. Supersedes
// `actions.characterization.test.ts` (deleted), which captured the legacy
// direct-fetch/direct-cookie implementation — that implementation is gone,
// so its assertions (hardcoded IP fallback, unsigned `user` cookie, raw
// `{success,error}` shape) no longer apply per D7/D8.

const executeMock = vi.fn();
const createSignInWithGoogleUseCaseMock = vi.fn(() => executeMock);
const redirectMock = vi.fn();

vi.mock("@/infraestructure/composition", () => ({
  createSignInWithGoogleUseCase: () => createSignInWithGoogleUseCaseMock(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

describe("googleLogin (rewired Server Action)", () => {
  beforeEach(() => {
    executeMock.mockReset();
    createSignInWithGoogleUseCaseMock.mockClear();
    redirectMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exchanges the idToken via signInWithGoogle and redirects to / on success", async () => {
    const { googleLogin } = await import("./actions");
    executeMock.mockResolvedValue({
      token: "backend-jwt",
      user: { id: "1", name: "Ada", email: "a@b.com", role: "boxer", pictureUrl: null, createdAt: "2026-01-01T00:00:00.000Z" },
    });

    const result = await googleLogin("fake-id-token");

    expect(executeMock).toHaveBeenCalledWith("fake-id-token");
    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(result).toBeUndefined();
  });

  it("maps InvalidCredentials to { ok: false, code: 'invalid-credentials' } without redirecting", async () => {
    const { googleLogin } = await import("./actions");
    executeMock.mockRejectedValue(invalidCredentials());

    const result = await googleLogin("fake-id-token");

    expect(result).toEqual({ ok: false, code: "invalid-credentials" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("maps BackendUnavailable to { ok: false, code: 'backend-unavailable' } without redirecting", async () => {
    const { googleLogin } = await import("./actions");
    executeMock.mockRejectedValue(backendUnavailable());

    const result = await googleLogin("fake-id-token");

    expect(result).toEqual({ ok: false, code: "backend-unavailable" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("maps any other thrown error to { ok: false, code: 'unknown' } without redirecting", async () => {
    const { googleLogin } = await import("./actions");
    executeMock.mockRejectedValue(new Error("boom"));

    const result = await googleLogin("fake-id-token");

    expect(result).toEqual({ ok: false, code: "unknown" });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
