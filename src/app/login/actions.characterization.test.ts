import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Approval/characterization test — captures the CURRENT observable behavior of
// the legacy `googleLogin` Server Action BEFORE it is rewired (Phase 9) to use
// the hexagonal ports/adapters. Do NOT modify `actions.ts` to make these pass;
// they describe reality as it exists today so PR4/PR6/PR9 can prove the
// rewired implementation preserves cookie names/flags, redirect targets, and
// response status handling.

const setMock = vi.fn();
const cookiesMock = vi.fn().mockResolvedValue({ set: setMock });
const redirectMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const EXPECTED_BACKEND_URL =
  process.env.BACKEND_URL ?? "http://10.142.199.144:8080";
const EXPECTED_MAX_AGE = 60 * 60 * 24 * 7;
const EXPECTED_SECURE = process.env.NODE_ENV === "production";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("googleLogin (legacy actions.ts characterization)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setMock.mockClear();
    cookiesMock.mockClear();
    redirectMock.mockClear();
  });

  it("posts the idToken to the backend and sets jwt+user cookies with current flags, then redirects to /", async () => {
    const { googleLogin } = await import("./actions");
    const backendUser = {
      id: "1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "boxer",
      pictureUrl: "https://example.com/pic.png",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ token: "backend-jwt", user: backendUser }) as Response
    );

    await googleLogin("fake-id-token");

    expect(fetch).toHaveBeenCalledWith(
      `${EXPECTED_BACKEND_URL}/api/v1/auth/google`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "fake-id-token" }),
      }
    );

    expect(setMock).toHaveBeenCalledWith("jwt", "backend-jwt", {
      httpOnly: true,
      secure: EXPECTED_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: EXPECTED_MAX_AGE,
    });
    expect(setMock).toHaveBeenCalledWith("user", JSON.stringify(backendUser), {
      httpOnly: false,
      secure: EXPECTED_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: EXPECTED_MAX_AGE,
    });

    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("returns a failure result with the status and body when the backend responds non-ok, and never sets cookies or redirects", async () => {
    const { googleLogin } = await import("./actions");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({}, false, 401) as unknown as Response
    );

    const result = await googleLogin("fake-id-token");

    expect(result).toEqual({
      success: false,
      error: `Backend error 401: ${JSON.stringify({})}`,
    });
    expect(setMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns a failure result when the backend response is missing token or user, and never sets cookies or redirects", async () => {
    const { googleLogin } = await import("./actions");
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}) as Response);

    const result = await googleLogin("fake-id-token");

    expect(result).toEqual({
      success: false,
      error: "Backend did not return a token or user",
    });
    expect(setMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
