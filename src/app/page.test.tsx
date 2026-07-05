// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Rewired (Phase 9.4) `Home` page: gates on `getCurrentSession()` from the
// composition root instead of parsing cookies inline. Supersedes
// `page.characterization.test.ts` (deleted) — that test fed a raw,
// unsigned plain-JSON `user` cookie and a jwt-only-no-user case, both of
// which now correctly resolve to "no session" per D2/D3 (signed cookie,
// no legacy compatibility path, both cookies required) as already
// implemented/tested in `cookie-session.adapter.test.ts`.

const getCurrentSessionMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/infraestructure/composition", () => ({
  createGetCurrentSessionUseCase: () => getCurrentSessionMock,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("Home page (rewired)", () => {
  afterEach(() => {
    getCurrentSessionMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects to /login when getCurrentSession() returns null", async () => {
    getCurrentSessionMock.mockResolvedValue(null);
    const { default: Home } = await import("./page");

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("renders the session user's name when a valid session exists", async () => {
    getCurrentSessionMock.mockResolvedValue({
      token: "backend-jwt",
      user: {
        id: "1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "boxer",
        pictureUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    const { default: Home } = await import("./page");

    render(await Home());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByText("¡Hola, Ada Lovelace!")).toBeInTheDocument();
  });
});
