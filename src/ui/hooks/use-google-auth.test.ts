// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  GoogleIdentityPort,
  GsiError,
} from "@/application/ports/google-identity.port";
import { useGoogleAuth } from "./use-google-auth";

function fakePort(overrides?: Partial<GoogleIdentityPort>): GoogleIdentityPort {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    renderButton: vi.fn(),
    ...overrides,
  };
}

function containerRef(): React.RefObject<HTMLDivElement | null> {
  return { current: document.createElement("div") };
}

describe("useGoogleAuth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls port.load and, once it resolves, renders the button into the container", async () => {
    const port = fakePort();
    const ref = containerRef();

    renderHook(() => useGoogleAuth(ref, vi.fn(), vi.fn(), port));

    expect(port.load).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(port.renderButton).toHaveBeenCalledWith(ref.current)
    );
  });

  it("calls onSuccess with the idToken when the port's onCredential callback fires", () => {
    let capturedOnCredential: ((idToken: string) => void) | undefined;
    const port = fakePort({
      load: vi.fn().mockImplementation((cfg) => {
        capturedOnCredential = cfg.onCredential;
        return Promise.resolve();
      }),
    });
    const onSuccess = vi.fn();

    renderHook(() => useGoogleAuth(containerRef(), onSuccess, vi.fn(), port));
    capturedOnCredential?.("real-id-token");

    expect(onSuccess).toHaveBeenCalledWith("real-id-token");
  });

  it.each([
    ["missing-client-id", "Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID en el entorno."],
    ["script-load-failed", "No se pudo cargar el SDK de Google."],
    ["no-credential", "Google no devolvió un token válido."],
  ] satisfies [GsiError, string][])(
    "maps GsiError '%s' to its Spanish copy",
    (gsiError, expectedCopy) => {
      let capturedOnError: ((e: GsiError) => void) | undefined;
      const port = fakePort({
        load: vi.fn().mockImplementation((cfg) => {
          capturedOnError = cfg.onError;
          return Promise.resolve();
        }),
      });
      const onError = vi.fn();

      renderHook(() => useGoogleAuth(containerRef(), vi.fn(), onError, port));
      capturedOnError?.(gsiError);

      expect(onError).toHaveBeenCalledWith(expectedCopy);
    }
  );

  it("does not call onSuccess/onError after unmount (cancels pending callbacks)", () => {
    let capturedOnCredential: ((idToken: string) => void) | undefined;
    const port = fakePort({
      load: vi.fn().mockImplementation((cfg) => {
        capturedOnCredential = cfg.onCredential;
        return Promise.resolve();
      }),
    });
    const onSuccess = vi.fn();

    const { unmount } = renderHook(() =>
      useGoogleAuth(containerRef(), onSuccess, vi.fn(), port)
    );
    unmount();
    capturedOnCredential?.("late-id-token");

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
