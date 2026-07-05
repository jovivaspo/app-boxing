// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { createGsiLoaderAdapter } from "./gsi-loader.adapter";

const SCRIPT_ID = "google-identity-services";

function getScript(): HTMLScriptElement | null {
  return document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
}

function fakeGoogleWithInitialize(
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
  }) => void
) {
  return {
    accounts: {
      id: {
        initialize,
        renderButton: vi.fn(),
        prompt: vi.fn(),
      },
    },
  };
}

describe("createGsiLoaderAdapter", () => {
  afterEach(() => {
    document.getElementById(SCRIPT_ID)?.remove();
    delete window.google;
    delete window.__googleAuthInitDone;
  });

  it("calls onError with 'missing-client-id' and injects no script when clientId is empty", async () => {
    const onError = vi.fn();
    const adapter = createGsiLoaderAdapter();

    await adapter.load({ clientId: "", onCredential: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith("missing-client-id");
    expect(getScript()).toBeNull();
  });

  it("injects a single script tag pointing at the GSI SDK", () => {
    const adapter = createGsiLoaderAdapter();

    void adapter.load({
      clientId: "client-123",
      onCredential: vi.fn(),
      onError: vi.fn(),
    });

    const script = getScript();
    expect(script).not.toBeNull();
    expect(script?.src).toBe("https://accounts.google.com/gsi/client");
  });

  it("does not inject a second script tag when one already exists (idempotent)", () => {
    const adapter = createGsiLoaderAdapter();

    void adapter.load({
      clientId: "client-1",
      onCredential: vi.fn(),
      onError: vi.fn(),
    });
    void adapter.load({
      clientId: "client-1",
      onCredential: vi.fn(),
      onError: vi.fn(),
    });

    expect(document.querySelectorAll(`#${SCRIPT_ID}`)).toHaveLength(1);
  });

  it("initializes window.google.accounts.id with the given clientId once the script's onload fires", () => {
    const initialize = vi.fn();
    window.google = fakeGoogleWithInitialize(initialize);
    const adapter = createGsiLoaderAdapter();

    void adapter.load({
      clientId: "client-abc",
      onCredential: vi.fn(),
      onError: vi.fn(),
    });
    getScript()?.onload?.(new Event("load"));

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "client-abc" })
    );
  });

  it("calls onCredential with the idToken when GSI's callback returns a credential", () => {
    let capturedCallback:
      ((response: { credential?: string }) => void) | undefined;
    window.google = fakeGoogleWithInitialize((config) => {
      capturedCallback = config.callback;
    });
    const onCredential = vi.fn();
    const adapter = createGsiLoaderAdapter();

    void adapter.load({
      clientId: "client-abc",
      onCredential,
      onError: vi.fn(),
    });
    getScript()?.onload?.(new Event("load"));
    capturedCallback?.({ credential: "id-token-value" });

    expect(onCredential).toHaveBeenCalledWith("id-token-value");
  });

  it("calls onError with 'no-credential' when GSI's callback returns no credential", () => {
    let capturedCallback:
      ((response: { credential?: string }) => void) | undefined;
    window.google = fakeGoogleWithInitialize((config) => {
      capturedCallback = config.callback;
    });
    const onError = vi.fn();
    const adapter = createGsiLoaderAdapter();

    void adapter.load({
      clientId: "client-abc",
      onCredential: vi.fn(),
      onError,
    });
    getScript()?.onload?.(new Event("load"));
    capturedCallback?.({ credential: undefined });

    expect(onError).toHaveBeenCalledWith("no-credential");
  });

  it("calls onError with 'script-load-failed' when the script fails to load", () => {
    const onError = vi.fn();
    const adapter = createGsiLoaderAdapter();

    void adapter.load({
      clientId: "client-abc",
      onCredential: vi.fn(),
      onError,
    });
    getScript()?.onerror?.(new Event("error"));

    expect(onError).toHaveBeenCalledWith("script-load-failed");
  });

  it("renders the Google button into the given container with the expected options", () => {
    const renderButton = vi.fn();
    window.google = {
      accounts: {
        id: { initialize: vi.fn(), renderButton, prompt: vi.fn() },
      },
    };
    const adapter = createGsiLoaderAdapter();
    const container = document.createElement("div");

    adapter.renderButton(container);

    expect(renderButton).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ theme: "outline", size: "large" })
    );
  });
});
