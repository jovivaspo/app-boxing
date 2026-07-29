// @vitest-environment jsdom
import type { FormEvent } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { makeGuestTimerConfigurationPort } from "@/application/ports/__mocks__/guest-timer-configuration-port.mock";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const opsCreateMock = vi.fn();
const opsUpdateMock = vi.fn();
const ops = {
  list: vi.fn(),
  create: opsCreateMock,
  update: opsUpdateMock,
  remove: vi.fn(),
};
const useTimerConfigurationsMock = vi.fn(() => ops);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("@/ui/hooks/use-timer-configurations", () => ({
  useTimerConfigurations: () => useTimerConfigurationsMock(),
}));

import { useTimerConfigurationForm } from "../timer-configuration-form.hook";

function fakeSubmitEvent(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

describe("useTimerConfigurationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pre-fill split minutes/seconds when initialConfiguration is provided", () => {
    const config = buildTimerConfiguration({
      roundDuration: 90,
      restDuration: 45,
    });
    const localAdapter = makeGuestTimerConfigurationPort();

    const { result } = renderHook(() =>
      useTimerConfigurationForm(
        { isAuthenticated: true, initialConfiguration: config },
        localAdapter
      )
    );

    expect(result.current.form.roundMinutes).toBe("1");
    expect(result.current.form.roundSeconds).toBe("30");
    expect(result.current.form.restMinutes).toBe("0");
    expect(result.current.form.restSeconds).toBe("45");
  });

  it("should combine minutes and seconds into total seconds on submit", async () => {
    const localAdapter = makeGuestTimerConfigurationPort();
    opsCreateMock.mockResolvedValue({
      ok: true,
      data: buildTimerConfiguration(),
    });

    const { result } = renderHook(() =>
      useTimerConfigurationForm(
        { isAuthenticated: true, initialConfiguration: null },
        localAdapter
      )
    );

    act(() => {
      result.current.setRoundMinutes("1");
      result.current.setRoundSeconds("30");
      result.current.setRestMinutes("0");
      result.current.setRestSeconds("30");
    });
    await act(async () => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(opsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ roundDuration: 90, restDuration: 30 })
    );
  });

  it("should block submit and set fieldErrors when a combined duration is <= 0", async () => {
    const localAdapter = makeGuestTimerConfigurationPort();

    const { result } = renderHook(() =>
      useTimerConfigurationForm(
        { isAuthenticated: true, initialConfiguration: null },
        localAdapter
      )
    );

    await act(async () => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(opsCreateMock).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.roundDuration).toBeDefined();
    expect(result.current.fieldErrors.restDuration).toBeDefined();
  });

  it("should call router.push('/timers') on successful create or update", async () => {
    const localAdapter = makeGuestTimerConfigurationPort();
    opsCreateMock.mockResolvedValue({
      ok: true,
      data: buildTimerConfiguration(),
    });

    const { result } = renderHook(() =>
      useTimerConfigurationForm(
        { isAuthenticated: true, initialConfiguration: null },
        localAdapter
      )
    );

    act(() => {
      result.current.setRoundMinutes("1");
      result.current.setRestMinutes("1");
    });
    await act(async () => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(pushMock).toHaveBeenCalledWith("/timers");
  });

  it("should map each failure code to its ERROR_CODE_COPY message in formError", async () => {
    const localAdapter = makeGuestTimerConfigurationPort();
    opsCreateMock.mockResolvedValue({ ok: false, code: "unknown" });

    const { result } = renderHook(() =>
      useTimerConfigurationForm(
        { isAuthenticated: true, initialConfiguration: null },
        localAdapter
      )
    );

    act(() => {
      result.current.setRoundMinutes("1");
      result.current.setRestMinutes("1");
    });
    await act(async () => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(result.current.formError).not.toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("should pre-fill the form from the injected local adapter's read() for a guest", async () => {
    const config = buildTimerConfiguration({ id: "tc-1", name: "Mi Timer" });
    const localAdapter = makeGuestTimerConfigurationPort({
      read: vi.fn().mockResolvedValue(config),
    });

    const { result } = renderHook(() =>
      useTimerConfigurationForm(
        {
          isAuthenticated: false,
          initialConfiguration: null,
          timerId: "tc-1",
        },
        localAdapter
      )
    );

    await waitFor(() => expect(localAdapter.read).toHaveBeenCalledWith());
    await waitFor(() =>
      expect(result.current.form.roundMinutes).toBe(
        String(Math.floor(config.roundDuration / 60))
      )
    );
  });

  it("should redirect a guest to /timers when read() resolves null", async () => {
    const localAdapter = makeGuestTimerConfigurationPort({
      read: vi.fn().mockResolvedValue(null),
    });

    renderHook(() =>
      useTimerConfigurationForm(
        {
          isAuthenticated: false,
          initialConfiguration: null,
          timerId: "tc-1",
        },
        localAdapter
      )
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/timers"));
  });
});
