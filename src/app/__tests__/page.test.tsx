// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Rewritten (PR2, issue #46): `/` is now a public landing — session no
// longer gates rendering, so the `next/navigation` redirect mock is dropped
// entirely. A successful render with `session: null` IS the no-redirect
// proof (see design.md D-1 / landing-page spec "No Root-Path Auth Gate").

const getCurrentSessionExecuteMock = vi.fn();
const getCurrentSessionMock = vi.fn<
  (deps: unknown) => typeof getCurrentSessionExecuteMock
>(() => getCurrentSessionExecuteMock);
const createCookieSessionAdapterMock = vi.fn(() => ({}));

vi.mock(
  "@/application/use-cases/get-current-session/get-current-session",
  () => ({
    getCurrentSession: (deps: unknown) => getCurrentSessionMock(deps),
  })
);

vi.mock("@/infraestructure/session/cookie-session.adapter", () => ({
  createCookieSessionAdapter: () => createCookieSessionAdapterMock(),
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

describe("Home page (landing)", () => {
  afterEach(() => {
    getCurrentSessionExecuteMock.mockReset();
    getCurrentSessionMock.mockClear();
    createCookieSessionAdapterMock.mockClear();
  });

  it("should render the landing hero heading when no session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: Home } = await import("../page");

    render(await Home());

    expect(
      screen.getByText(/TU RING\. TU RITMO\. TU ROUND\./i)
    ).toBeInTheDocument();
  });

  it("should render the exact same landing body markup when a session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: Home } = await import("../page");
    const { container: loggedOut } = render(await Home());
    const loggedOutBody = loggedOut.querySelector("main")?.innerHTML;

    getCurrentSessionExecuteMock.mockResolvedValue(SESSION);
    const { container: loggedIn } = render(await Home());
    const loggedInBody = loggedIn.querySelector("main")?.innerHTML;

    expect(loggedOutBody).toBeTruthy();
    expect(loggedInBody).toBe(loggedOutBody);
  });

  it("should render the primary CTA linking to /guest-timer", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: Home } = await import("../page");

    render(await Home());

    expect(
      screen.getAllByRole("link", { name: "Probar el timer" })[0]
    ).toHaveAttribute("href", "/guest-timer");
  });

  // Scoped to <main> on purpose: the Topbar's sign-in link now carries the
  // same accessible name, and it precedes the hero in DOM order — an unscoped
  // query would assert against the Topbar instead of the landing's CTA.
  it("should render the secondary CTA linking to /login", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: Home } = await import("../page");

    render(await Home());

    const body = within(screen.getByRole("main"));
    expect(body.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("should render exactly three benefit items", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: Home } = await import("../page");

    render(await Home());

    const benefitHeadings = screen.getAllByRole("heading", { level: 3 });
    expect(benefitHeadings.map((heading) => heading.textContent)).toEqual([
      "Rounds a tu medida",
      "Campana y avisos",
      "Guarda tus timers",
    ]);
  });

  it("should render the logged-in Topbar links when a session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(SESSION);
    const { default: Home } = await import("../page");

    render(await Home());

    expect(screen.getByRole("link", { name: "Mis Timers" })).toHaveAttribute(
      "href",
      "/timers"
    );
  });

  // Scoped to the Topbar on purpose: the landing body's secondary CTA also
  // links to /login and stays put in both session states (D-2), so an
  // unscoped query would either pass by accident or assert the wrong thing.
  it("should not render the Topbar sign-in link when a session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(SESSION);
    const { default: Home } = await import("../page");

    render(await Home());

    const topbar = within(screen.getByRole("banner"));
    expect(topbar.queryByRole("link", { name: /iniciar sesión/i })).toBeNull();
  });
});
