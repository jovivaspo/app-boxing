// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Characterization/approval test — captures the CURRENT observable behavior
// of the legacy `ProfilePage` BEFORE it is rewired (Phase 9) to render the
// domain `User` from `getCurrentSession()`. Do NOT modify `page.tsx` to
// make this pass; it documents reality as it exists today: redirect to
// /login when `jwt` or `user` cookies are absent or the `user` cookie is
// not valid JSON, and rendering the parsed profile fields when valid.

vi.mock("next/image", () => ({
  // `fill`/`unoptimized` are Next.js-only props a plain <img> doesn't accept.
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    delete rest.unoptimized;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- test-only stub
    return <img {...rest} />;
  },
}));

const getMock = vi.fn();
const cookiesMock = vi.fn().mockResolvedValue({ get: getMock });
const redirectMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

vi.mock("next/navigation", () => ({
  // The real `redirect()` throws a NEXT_REDIRECT digest error to halt
  // rendering — the legacy page relies on that throw instead of an
  // explicit `return` after each redirect call, so the mock must throw too
  // to faithfully characterize the current control flow.
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

const validUser = {
  id: "12345678-abcd",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "boxer",
  pictureUrl: "https://example.com/pic.png",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("ProfilePage (legacy profile/page.tsx characterization)", () => {
  afterEach(() => {
    getMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects to /login when the jwt cookie is absent", async () => {
    getMock.mockImplementation((name: string) => {
      if (name === "user") return { value: JSON.stringify(validUser) };
      return undefined;
    });
    const { default: ProfilePage } = await import("./page");

    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when the user cookie is absent", async () => {
    getMock.mockImplementation((name: string) => {
      if (name === "jwt") return { value: "backend-jwt" };
      return undefined;
    });
    const { default: ProfilePage } = await import("./page");

    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when the user cookie is not valid JSON", async () => {
    getMock.mockImplementation((name: string) => {
      if (name === "jwt") return { value: "backend-jwt" };
      if (name === "user") return { value: "not-json" };
      return undefined;
    });
    const { default: ProfilePage } = await import("./page");

    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("renders the parsed profile fields when jwt and a valid user cookie are present", async () => {
    getMock.mockImplementation((name: string) => {
      if (name === "jwt") return { value: "backend-jwt" };
      if (name === "user") return { value: JSON.stringify(validUser) };
      return undefined;
    });
    const { default: ProfilePage } = await import("./page");

    render(await ProfilePage());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("boxer")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });
});
