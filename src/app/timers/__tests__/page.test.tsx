// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getCurrentSessionExecuteMock = vi.fn();
const getCurrentSessionMock = vi.fn<
  (deps: unknown) => typeof getCurrentSessionExecuteMock
>(() => getCurrentSessionExecuteMock);
const createCookieSessionAdapterMock = vi.fn(() => ({}));
const redirectMock = vi.fn();
const timerConfigurationListMock = vi.fn(() => (
  <div data-testid="timer-configuration-list" />
));

vi.mock(
  "@/application/use-cases/get-current-session/get-current-session",
  () => ({
    getCurrentSession: (deps: unknown) => getCurrentSessionMock(deps),
  })
);

vi.mock("@/infraestructure/session/cookie-session.adapter", () => ({
  createCookieSessionAdapter: () => createCookieSessionAdapterMock(),
}));

vi.mock("@/ui/components/timer-configuration-list", () => ({
  TimerConfigurationList: () => timerConfigurationListMock(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("Timers list page", () => {
  afterEach(() => {
    getCurrentSessionExecuteMock.mockReset();
    getCurrentSessionMock.mockClear();
    createCookieSessionAdapterMock.mockClear();
    redirectMock.mockClear();
    timerConfigurationListMock.mockClear();
  });

  it("should render the list when a session exists", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue({
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
    const { default: TimersPage } = await import("../page");

    render(await TimersPage());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("timer-configuration-list")).toBeInTheDocument();
  });

  it("should redirect to /login when there is no session", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: TimersPage } = await import("../page");

    await expect(TimersPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
