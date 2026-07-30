// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { makeGuestTimerConfigurationPort } from "@/application/ports/__mocks__/guest-timer-configuration-port.mock";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

const engineMock = vi.fn(
  (_config: unknown, _onStop: () => void, _deps: unknown) => ({
    status: "idle",
  })
);
vi.mock("@/ui/hooks/use-timer-session-engine", () => ({
  useTimerSessionEngine: (config: unknown, onStop: () => void, deps: unknown) =>
    engineMock(config, onStop, deps),
}));

import { useGuestTimerActive } from "../guest-timer-active.hook";

describe("useGuestTimerActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delegate to useTimerSessionEngine when read() resolves a record", async () => {
    const record = buildTimerConfiguration();
    const localAdapter = makeGuestTimerConfigurationPort({
      read: vi.fn().mockResolvedValue(record),
    });

    renderHook(() => useGuestTimerActive({ localAdapter }));

    await waitFor(() => {
      expect(engineMock).toHaveBeenCalledWith(
        record,
        expect.any(Function),
        expect.anything()
      );
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("should redirect to /guest-timer and never call the engine when read() resolves null", async () => {
    const localAdapter = makeGuestTimerConfigurationPort({
      read: vi.fn().mockResolvedValue(null),
    });

    renderHook(() => useGuestTimerActive({ localAdapter }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/guest-timer");
    });
    expect(engineMock).toHaveBeenCalledWith(
      null,
      expect.any(Function),
      expect.anything()
    );
  });
});
