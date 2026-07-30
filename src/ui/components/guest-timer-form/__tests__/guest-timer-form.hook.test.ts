// @vitest-environment jsdom
import type { FormEvent } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeGuestTimerConfigurationPort } from "@/application/ports/__mocks__/guest-timer-configuration-port.mock";

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

  it("should disable START when no input is provided", async () => {
    const { result } = renderHook(() =>
      useGuestTimerForm({ localAdapter: emptyPort() })
    );

    await waitFor(() => expect(result.current.form.rounds).toBe(0));
    expect(result.current.isStartEnabled).toBe(false);
  });

  it("should disable START when only rounds is set", async () => {
    const { result } = renderHook(() =>
      useGuestTimerForm({ localAdapter: emptyPort() })
    );
    await waitFor(() => expect(result.current.form.rounds).toBe(0));

    act(() => {
      result.current.setRounds(3);
    });

    expect(result.current.isStartEnabled).toBe(false);
  });

  it("should disable START when only round duration is set", async () => {
    const { result } = renderHook(() =>
      useGuestTimerForm({ localAdapter: emptyPort() })
    );
    await waitFor(() => expect(result.current.form.rounds).toBe(0));

    act(() => {
      result.current.setRoundMinutes(1);
    });

    expect(result.current.isStartEnabled).toBe(false);
  });

  it("should enable START when rounds and round duration are both set, regardless of rest duration", async () => {
    const { result } = renderHook(() =>
      useGuestTimerForm({ localAdapter: emptyPort() })
    );
    await waitFor(() => expect(result.current.form.rounds).toBe(0));

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
    await waitFor(() => expect(result.current.form.rounds).toBe(0));

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

  it("should always initialize duration fields to 0 and never call read() on mount", async () => {
    const localAdapter = emptyPort();

    const { result } = renderHook(() => useGuestTimerForm({ localAdapter }));

    expect(result.current.form).toEqual({
      rounds: 0,
      roundMinutes: 0,
      roundSeconds: 0,
      restMinutes: 0,
      restSeconds: 0,
      warnBeforeEnd: true,
      bellSound: true,
    });
    expect(localAdapter.read).not.toHaveBeenCalled();
  });
});
