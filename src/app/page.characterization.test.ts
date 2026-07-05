// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Characterization/approval test — captures the CURRENT observable behavior
// of the legacy `Home` page BEFORE it is rewired (Phase 9) to call
// `getCurrentSession()`. Do NOT modify `page.tsx` to make this pass; it
// documents reality as it exists today: redirect to /login when the `jwt`
// cookie is absent, and rendering the parsed `user` cookie's `name` (or the
// "Usuario" fallback) when present.

const getMock = vi.fn();
const cookiesMock = vi.fn().mockResolvedValue({ get: getMock });
const redirectMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

vi.mock("next/navigation", () => ({
  // The real `redirect()` throws a NEXT_REDIRECT digest error to halt
  // rendering — mirror that here so the missing-jwt branch faithfully
  // characterizes the current control flow instead of falling through.
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("Home page (legacy page.tsx characterization)", () => {
  afterEach(() => {
    getMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects to /login when the jwt cookie is absent", async () => {
    getMock.mockReturnValue(undefined);
    const { default: Home } = await import("./page");

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("renders the parsed user cookie's name when jwt and user cookies are present", async () => {
    getMock.mockImplementation((name: string) => {
      if (name === "jwt") return { value: "backend-jwt" };
      if (name === "user")
        return { value: JSON.stringify({ name: "Ada Lovelace" }) };
      return undefined;
    });
    const { default: Home } = await import("./page");

    render(await Home());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByText("¡Hola, Ada Lovelace!")).toBeInTheDocument();
  });

  it("falls back to the 'Usuario' name when the jwt cookie is present but the user cookie is absent", async () => {
    getMock.mockImplementation((name: string) => {
      if (name === "jwt") return { value: "backend-jwt" };
      return undefined;
    });
    const { default: Home } = await import("./page");

    render(await Home());

    expect(screen.getByText("¡Hola, Usuario!")).toBeInTheDocument();
  });
});
