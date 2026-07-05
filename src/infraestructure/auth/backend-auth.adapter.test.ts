import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBackendAuthAdapter } from "./backend-auth.adapter";

const BACKEND_URL = "http://backend.test";

const validUser = {
  id: "1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "boxer",
  pictureUrl: "https://example.com/pic.png",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe("createBackendAuthAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", BACKEND_URL);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws BackendUnavailable when BACKEND_URL is not configured (D8 — no IP fallback)", () => {
    vi.stubEnv("BACKEND_URL", "");

    expect(() => createBackendAuthAdapter()).toThrowError(
      expect.objectContaining({ _tag: "BackendUnavailable" })
    );
  });

  it("POSTs the idToken to /api/v1/auth/google with the expected content-type header and body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ token: "backend-jwt", user: validUser }) as Response
    );
    const adapter = createBackendAuthAdapter();

    await adapter.exchange("fake-id-token");

    expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/api/v1/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "fake-id-token" }),
    });
  });

  it("never logs the idToken or the raw response body", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        token: "very-secret-backend-jwt",
        user: validUser,
      }) as Response
    );
    const adapter = createBackendAuthAdapter();

    await adapter.exchange("very-secret-id-token");

    const loggedText = [
      ...logSpy.mock.calls,
      ...errorSpy.mock.calls,
      ...warnSpy.mock.calls,
    ]
      .flat()
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
      .join(" ");
    expect(loggedText).not.toContain("very-secret-id-token");
    expect(loggedText).not.toContain("very-secret-backend-jwt");
  });

  it("maps a 200 response with a valid payload to a Session", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ token: "backend-jwt", user: validUser }) as Response
    );
    const adapter = createBackendAuthAdapter();

    const session = await adapter.exchange("fake-id-token");

    expect(session).toEqual({
      token: "backend-jwt",
      user: {
        id: "1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "boxer",
        pictureUrl: "https://example.com/pic.png",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
  });

  it("maps a 401 response to InvalidCredentials", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({}, false, 401) as Response
    );
    const adapter = createBackendAuthAdapter();

    await expect(adapter.exchange("fake-id-token")).rejects.toMatchObject({
      _tag: "InvalidCredentials",
    });
  });

  it("maps a 403 response to InvalidCredentials", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({}, false, 403) as Response
    );
    const adapter = createBackendAuthAdapter();

    await expect(adapter.exchange("fake-id-token")).rejects.toMatchObject({
      _tag: "InvalidCredentials",
    });
  });

  it("maps a 500 response to BackendUnavailable", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({}, false, 500) as Response
    );
    const adapter = createBackendAuthAdapter();

    await expect(adapter.exchange("fake-id-token")).rejects.toMatchObject({
      _tag: "BackendUnavailable",
    });
  });

  it("maps a network failure (fetch rejects) to BackendUnavailable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    const adapter = createBackendAuthAdapter();

    await expect(adapter.exchange("fake-id-token")).rejects.toMatchObject({
      _tag: "BackendUnavailable",
    });
  });

  it("maps a malformed 2xx payload (missing user) to BackendUnavailable", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ token: "backend-jwt" }) as Response
    );
    const adapter = createBackendAuthAdapter();

    await expect(adapter.exchange("fake-id-token")).rejects.toMatchObject({
      _tag: "BackendUnavailable",
    });
  });
});
