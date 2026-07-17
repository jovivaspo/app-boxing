// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GoogleLoginErrorCode } from "@/infraestructure/actions/google-login/google-login.action";

const googleLoginMock = vi.fn();
const useGoogleAuthMock = vi.fn();

vi.mock("@/infraestructure/actions/google-login/google-login.action", () => ({
  googleLogin: (idToken: string) => googleLoginMock(idToken),
}));

vi.mock("@/ui/hooks/use-google-auth", () => ({
  useGoogleAuth: (...args: unknown[]) => useGoogleAuthMock(...args),
}));

import { useLoginCard } from "../login-card.hook";

type SuccessCallback = (idToken: string) => Promise<void> | void;
type ErrorCallback = (error: string) => void;

function capturedCallbacks(): {
  onSuccess: SuccessCallback;
  onError: ErrorCallback;
} {
  const [, onSuccess, onError] = useGoogleAuthMock.mock.calls[0] as [
    unknown,
    SuccessCallback,
    ErrorCallback,
  ];
  return { onSuccess, onError };
}

describe("useLoginCard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("wires useGoogleAuth with the button container ref and both callbacks", () => {
    renderHook(() => useLoginCard());

    expect(useGoogleAuthMock).toHaveBeenCalledTimes(1);
    const [ref, onSuccess, onError] = useGoogleAuthMock.mock.calls[0];
    expect(ref).toHaveProperty("current");
    expect(typeof onSuccess).toBe("function");
    expect(typeof onError).toBe("function");
  });

  it("calls googleLogin with the idToken and sets isLoading to true on success", () => {
    googleLoginMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLoginCard());
    const { onSuccess } = capturedCallbacks();

    act(() => {
      onSuccess("real-id-token");
    });

    expect(googleLoginMock).toHaveBeenCalledWith("real-id-token");
    expect(result.current.isLoading).toBe(true);
  });

  it.each([
    ["invalid-credentials", "Credenciales inválidas. Intenta de nuevo."],
    [
      "backend-unavailable",
      "No pudimos conectar con el servidor. Intenta más tarde.",
    ],
    ["unknown", "Ocurrió un error al iniciar sesión. Intenta de nuevo."],
  ] satisfies [GoogleLoginErrorCode, string][])(
    "maps googleLogin failure code '%s' to its Spanish copy and clears loading",
    async (code, expectedCopy) => {
      googleLoginMock.mockResolvedValue({ ok: false, code });
      const { result } = renderHook(() => useLoginCard());
      const { onSuccess } = capturedCallbacks();

      await act(async () => {
        await onSuccess("real-id-token");
      });

      expect(result.current.error).toBe(expectedCopy);
      expect(result.current.isLoading).toBe(false);
    }
  );

  it("sets the error message and clears loading when useGoogleAuth reports an error", () => {
    const { result } = renderHook(() => useLoginCard());
    const { onError } = capturedCallbacks();

    act(() => {
      onError("No se pudo cargar el SDK de Google.");
    });

    expect(result.current.error).toBe("No se pudo cargar el SDK de Google.");
    expect(result.current.isLoading).toBe(false);
  });
});
