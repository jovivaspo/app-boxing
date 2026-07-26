// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getCurrentSessionExecuteMock = vi.fn();
const getCurrentSessionMock = vi.fn<
  (deps: unknown) => typeof getCurrentSessionExecuteMock
>(() => getCurrentSessionExecuteMock);
const createCookieSessionAdapterMock = vi.fn(() => ({}));
const timerConfigurationFormMock = vi.fn(
  (props: { isAuthenticated: boolean; initialConfiguration: unknown }) => (
    <div data-testid="timer-configuration-form">
      {String(props.isAuthenticated)}:{String(props.initialConfiguration)}
    </div>
  )
);

vi.mock(
  "@/application/use-cases/get-current-session/get-current-session",
  () => ({
    getCurrentSession: (deps: unknown) => getCurrentSessionMock(deps),
  })
);

vi.mock("@/infraestructure/session/cookie-session.adapter", () => ({
  createCookieSessionAdapter: () => createCookieSessionAdapterMock(),
}));

vi.mock("@/ui/components/timer-configuration-form", () => ({
  TimerConfigurationForm: (props: {
    isAuthenticated: boolean;
    initialConfiguration: unknown;
  }) => timerConfigurationFormMock(props),
}));

describe("New timer page", () => {
  afterEach(() => {
    getCurrentSessionExecuteMock.mockReset();
    getCurrentSessionMock.mockClear();
    createCookieSessionAdapterMock.mockClear();
    timerConfigurationFormMock.mockClear();
  });

  it("should render the form with no initialConfiguration and the resolved isAuthenticated flag", async () => {
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
    const { default: NewTimerPage } = await import("../page");

    render(await NewTimerPage());

    expect(screen.getByTestId("timer-configuration-form")).toHaveTextContent(
      "true:null"
    );
  });
});
