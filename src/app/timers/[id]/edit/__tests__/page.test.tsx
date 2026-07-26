// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";

const getCurrentSessionExecuteMock = vi.fn();
const getCurrentSessionMock = vi.fn<
  (deps: unknown) => typeof getCurrentSessionExecuteMock
>(() => getCurrentSessionExecuteMock);
const createCookieSessionAdapterMock = vi.fn(() => ({}));
const getTimerConfigurationExecuteMock = vi.fn();
const getTimerConfigurationMock = vi.fn<
  (deps: unknown) => typeof getTimerConfigurationExecuteMock
>(() => getTimerConfigurationExecuteMock);
const createBackendTimerConfigurationAdapterMock = vi.fn(
  (_token: string) => ({})
);
const notFoundMock = vi.fn();
const timerConfigurationFormMock = vi.fn(
  (props: {
    isAuthenticated: boolean;
    initialConfiguration: unknown;
    timerId?: string;
  }) => (
    <div data-testid="timer-configuration-form">
      {String(props.isAuthenticated)}:
      {JSON.stringify(props.initialConfiguration)}:{props.timerId}
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

vi.mock(
  "@/application/use-cases/get-timer-configuration/get-timer-configuration",
  () => ({
    getTimerConfiguration: (deps: unknown) => getTimerConfigurationMock(deps),
  })
);

vi.mock(
  "@/infraestructure/timer-configuration/backend-timer-configuration.adapter",
  () => ({
    createBackendTimerConfigurationAdapter: (token: string) =>
      createBackendTimerConfigurationAdapterMock(token),
  })
);

vi.mock("next/navigation", () => ({
  notFound: () => {
    notFoundMock();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/ui/components/timer-configuration-form", () => ({
  TimerConfigurationForm: (props: {
    isAuthenticated: boolean;
    initialConfiguration: unknown;
    timerId?: string;
  }) => timerConfigurationFormMock(props),
}));

const AUTHENTICATED_SESSION = {
  token: "backend-jwt",
  user: {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "boxer",
    pictureUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("Edit timer page", () => {
  afterEach(() => {
    getCurrentSessionExecuteMock.mockReset();
    getCurrentSessionMock.mockClear();
    createCookieSessionAdapterMock.mockClear();
    getTimerConfigurationExecuteMock.mockReset();
    getTimerConfigurationMock.mockClear();
    createBackendTimerConfigurationAdapterMock.mockClear();
    notFoundMock.mockClear();
    timerConfigurationFormMock.mockClear();
  });

  it("should await props.params and read id before use", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: EditTimerPage } = await import("../page");

    render(
      await EditTimerPage({
        params: Promise.resolve({ id: "tc-1" }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByTestId("timer-configuration-form")).toHaveTextContent(
      "tc-1"
    );
  });

  it("should call notFound() when authenticated and getTimerConfiguration rejects with TimerConfigurationNotFound", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(AUTHENTICATED_SESSION);
    getTimerConfigurationExecuteMock.mockRejectedValue(
      timerConfigurationNotFound("tc-1")
    );
    const { default: EditTimerPage } = await import("../page");

    await expect(
      EditTimerPage({
        params: Promise.resolve({ id: "tc-1" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("should pass null initialConfiguration for a guest identity (no server-side lookup)", async () => {
    getCurrentSessionExecuteMock.mockResolvedValue(null);
    const { default: EditTimerPage } = await import("../page");

    render(
      await EditTimerPage({
        params: Promise.resolve({ id: "tc-1" }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(getTimerConfigurationMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("timer-configuration-form")).toHaveTextContent(
      "false:null:tc-1"
    );
  });

  it("should pass the fetched configuration as initialConfiguration when authenticated and found", async () => {
    const config = buildTimerConfiguration({ id: "tc-1" });
    getCurrentSessionExecuteMock.mockResolvedValue(AUTHENTICATED_SESSION);
    getTimerConfigurationExecuteMock.mockResolvedValue(config);
    const { default: EditTimerPage } = await import("../page");

    render(
      await EditTimerPage({
        params: Promise.resolve({ id: "tc-1" }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByTestId("timer-configuration-form")).toHaveTextContent(
      JSON.stringify(config)
    );
  });
});
