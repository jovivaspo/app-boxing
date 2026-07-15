// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Rewired (Phase 9.5) `ProfilePage`: gates on `getCurrentSession()` and
// renders the domain `User` directly, dropping the local `User` interface.
// Supersedes `page.characterization.test.tsx` (deleted) — same rationale
// as `src/app/page.test.tsx` (D2/D3 legacy plain-JSON cookie now invalid).

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    delete rest.unoptimized;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- test-only stub
    return <img {...rest} />;
  },
}));

// Per-entry-point dependency wiring revision: `profile/page.tsx` now
// constructs `getCurrentSession` inline with `createCookieSessionAdapter()`
// instead of going through a shared factory module — mock both directly.

const getCurrentSessionExecuteMock = vi.fn();
const getCurrentSessionMock = vi.fn<
  (deps: unknown) => typeof getCurrentSessionExecuteMock
>(() => getCurrentSessionExecuteMock);
const createCookieSessionAdapterMock = vi.fn(() => ({}));
const redirectMock = vi.fn();

vi.mock(
  "@/application/use-cases/get-current-session/get-current-session",
  () => ({
    getCurrentSession: (deps: unknown) => getCurrentSessionMock(deps),
  })
);

vi.mock("@/infraestructure/session/cookie-session.adapter", () => ({
  createCookieSessionAdapter: () => createCookieSessionAdapterMock(),
}));

vi.mock("next/navigation", () => ({
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

describe("ProfilePage (rewired)", () => {
  afterEach(() => {
    getCurrentSessionExecuteMock.mockReset();
    getCurrentSessionMock.mockClear();
    createCookieSessionAdapterMock.mockClear();
    redirectMock.mockClear();
  });

  it("redirects to /login when getCurrentSession() returns null", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: ProfilePage } = await import("./page");

    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("renders the profile fields when a valid session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue({
      token: "backend-jwt",
      user: validUser,
    });
    const { default: ProfilePage } = await import("./page");

    render(await ProfilePage());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("boxer")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("renders a fallback avatar (no <img>) when pictureUrl is null", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue({
      token: "backend-jwt",
      user: { ...validUser, pictureUrl: null },
    });
    const { default: ProfilePage } = await import("./page");

    render(await ProfilePage());

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
