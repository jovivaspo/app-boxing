// @vitest-environment jsdom
import type { FormEvent } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { makeGuestTimerConfigurationPort } from "@/application/ports/__mocks__/guest-timer-configuration-port.mock";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { useGuestTimerForm } from "../guest-timer-form.hook";

function fakeSubmitEvent(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

describe("useGuestTimerForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function emptyPort() {
    return makeGuestTimerConfigurationPort({
      read: vi.fn().mockResolvedValue(null),
    });
  }

  function storedPort(overrides: Partial<TimerConfiguration> = {}) {
    return makeGuestTimerConfigurationPort({
      read: vi.fn().mockResolvedValue(buildTimerConfiguration(overrides)),
    });
  }

  it("should default to a single round and zeroed durations when nothing is stored", async () => {
    const { result } = renderHook(() =>
      useGuestTimerForm({ localAdapter: emptyPort() })
    );

    await waitFor(() =>
      expect(result.current.form).toEqual({
        rounds: 1,
        roundMinutes: 0,
        roundSeconds: 0,
        restMinutes: 0,
        restSeconds: 0,
        warnBeforeEnd: true,
        bellSound: true,
      })
    );
  });

  it("should prefill the form from the stored configuration on mount", async () => {
    const localAdapter = storedPort({
      rounds: 8,
      roundDuration: 185,
      restDuration: 45,
      warnBeforeEnd: false,
      bellSound: false,
    });

    const { result } = renderHook(() => useGuestTimerForm({ localAdapter }));

    await waitFor(() =>
      expect(result.current.form).toEqual({
        rounds: 8,
        roundMinutes: 3,
        roundSeconds: 5,
        restMinutes: 0,
        restSeconds: 45,
        warnBeforeEnd: false,
        bellSound: false,
      })
    );
    expect(localAdapter.read).toHaveBeenCalled();
  });

  it("should keep every other prefilled field when a single field changes", async () => {
    const localAdapter = storedPort({
      rounds: 5,
      roundDuration: 125,
      restDuration: 45,
      warnBeforeEnd: false,
      bellSound: false,
    });
    const { result } = renderHook(() => useGuestTimerForm({ localAdapter }));
    await waitFor(() => expect(result.current.form.rounds).toBe(5));

    act(() => {
      result.current.setRoundMinutes(4);
    });

    expect(result.current.form).toEqual({
      rounds: 5,
      roundMinutes: 4,
      roundSeconds: 5,
      restMinutes: 0,
      restSeconds: 45,
      warnBeforeEnd: false,
      bellSound: false,
    });
  });

  it("should disable START when no duration is provided", async () => {
    const { result } = renderHook(() =>
      useGuestTimerForm({ localAdapter: emptyPort() })
    );

    await waitFor(() => expect(result.current.form.rounds).toBe(1));
    expect(result.current.isStartEnabled).toBe(false);
  });

  it("should disable START when rounds drops to zero", async () => {
    const { result } = renderHook(() =>
      useGuestTimerForm({ localAdapter: emptyPort() })
    );
    await waitFor(() => expect(result.current.form.rounds).toBe(1));

    act(() => {
      result.current.setRoundMinutes(1);
      result.current.setRounds(0);
    });

    expect(result.current.isStartEnabled).toBe(false);
  });

  it("should enable START when round duration is set, regardless of rest duration", async () => {
    const { result } = renderHook(() =>
      useGuestTimerForm({ localAdapter: emptyPort() })
    );
    await waitFor(() => expect(result.current.form.rounds).toBe(1));

    act(() => {
      result.current.setRounds(3);
      result.current.setRoundMinutes(1);
    });

    expect(result.current.form.restMinutes).toBe(0);
    expect(result.current.isStartEnabled).toBe(true);
  });

  it("should write via the injected port and navigate to /guest-timer-active on START", async () => {
    const localAdapter = emptyPort();
    const { result } = renderHook(() => useGuestTimerForm({ localAdapter }));
    await waitFor(() => expect(result.current.form.rounds).toBe(1));

    act(() => {
      result.current.setRounds(3);
      result.current.setRoundMinutes(1);
    });
    await act(async () => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(localAdapter.write).toHaveBeenCalledWith(
      expect.objectContaining({ rounds: 3, roundDuration: 60 })
    );
    expect(pushMock).toHaveBeenCalledWith("/guest-timer-active");
  });
});
