// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// D-1b: `/login` gains an authenticated-visitor guard — redirects to
// `/timers` before render. Mirrors the `next/navigation` mock style dropped
// from `src/app/__tests__/page.test.tsx` now that `/` no longer redirects.

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

const SESSION = {
  token: "backend-jwt",
  user: {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "boxer" as const,
    pictureUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("Login page", () => {
  afterEach(() => {
    getCurrentSessionExecuteMock.mockReset();
    getCurrentSessionMock.mockClear();
    createCookieSessionAdapterMock.mockClear();
    redirectMock.mockClear();
  });

  it("should redirect to /timers when a session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(SESSION);
    const { default: LoginPage } = await import("../page");

    await expect(LoginPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/timers");
  });

  it("should render the shared logged-out Topbar when no session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: LoginPage } = await import("../page");

    render(await LoginPage());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Iniciar Sesión" })
    ).toHaveAttribute("href", "/login");
  });

  it("should not render the logged-in Topbar links when no session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: LoginPage } = await import("../page");

    render(await LoginPage());

    expect(
      screen.queryByRole("link", { name: "Mis Timers" })
    ).not.toBeInTheDocument();
  });

  // `app-shell` scenario "No Functioning Registration Entry Point": the
  // affordance is visible but must not be reachable. Asserting it is not a
  // link is the whole point — a plain presence check would pass even if it
  // were wired to a route.
  it("should render Registrarse as a non-interactive affordance", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: LoginPage } = await import("../page");

    render(await LoginPage());

    expect(screen.getByText("Registrarse")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(screen.queryByRole("link", { name: "Registrarse" })).toBeNull();
  });

  it("should render the Login Card when no session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: LoginPage } = await import("../page");

    render(await LoginPage());

    expect(screen.getByText("IRON PULSE")).toBeInTheDocument();
  });

  it("should render the shared Footer when no session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: LoginPage } = await import("../page");

    render(await LoginPage());

    expect(screen.getByText("Política de Privacidad")).toBeInTheDocument();
  });
});
