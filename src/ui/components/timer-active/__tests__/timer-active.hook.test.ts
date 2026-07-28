// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { makeTimerConfigurationRepositoryPort } from "@/application/ports/__mocks__/timer-configuration-repository-port.mock";
import { makeBellPort } from "@/application/ports/__mocks__/bell-port.mock";
import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

import { useTimerActive } from "../timer-active.hook";

describe("useTimerActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should stay idle with no countdown running before start() is called", () => {
    const config = buildTimerConfiguration({ roundDuration: 20 });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        {
          bell: makeBellPort(),
          localAdapter: makeTimerConfigurationRepositoryPort(),
        }
      )
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.remainingLabel).toBe("0:20");
  });

  it("should ring the bell exactly once on start() when bellSound is true", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({ bellSound: true });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        { bell, localAdapter: makeTimerConfigurationRepositoryPort() }
      )
    );

    act(() => {
      result.current.start();
    });

    expect(bell.ring).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("running");
  });

  it("should not ring the bell on start() when bellSound is false", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({ bellSound: false });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        { bell, localAdapter: makeTimerConfigurationRepositoryPort() }
      )
    );

    act(() => {
      result.current.start();
    });

    expect(bell.ring).not.toHaveBeenCalled();
  });

  it("should ring the bell exactly once per phase transition across many ticks, never twice from a StrictMode double-invoke", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({
      rounds: 2,
      roundDuration: 20,
      restDuration: 20,
      warnBeforeEnd: false,
      bellSound: true,
    });
    const { result } = renderHook(
      () =>
        useTimerActive(
          { isAuthenticated: true, initialConfiguration: config },
          { bell, localAdapter: makeTimerConfigurationRepositoryPort() }
        ),
      { wrapper: StrictMode }
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(20_000); // crosses exactly one work -> rest transition
    });

    expect(result.current.phase).toBe("rest");
    expect(bell.ring).toHaveBeenCalledTimes(2); // 1 start + 1 transition, never doubled
  });

  it("should ring the bell once when the session reaches finished", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({
      rounds: 1,
      roundDuration: 5,
      warnBeforeEnd: false,
      bellSound: true,
    });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        { bell, localAdapter: makeTimerConfigurationRepositoryPort() }
      )
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.status).toBe("finished");
    expect(bell.ring).toHaveBeenCalledTimes(2); // 1 start + 1 finish
  });

  it("should fire the 10s warning exactly once per phase and not again within the same phase", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({
      rounds: 2,
      roundDuration: 20,
      restDuration: 20,
      warnBeforeEnd: true,
      bellSound: false,
    });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        { bell, localAdapter: makeTimerConfigurationRepositoryPort() }
      )
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(12_000); // remaining = 8s, crosses the 10s threshold
    });

    expect(result.current.isWarning).toBe(true);
    expect(bell.ring).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(6_000); // still inside the same 20s work phase
    });

    expect(bell.ring).toHaveBeenCalledTimes(1); // no repeat within the same phase
  });

  it("should re-fire the 10s warning in a new phase after the transition resets it", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({
      rounds: 2,
      roundDuration: 15,
      restDuration: 15,
      warnBeforeEnd: true,
      bellSound: false,
    });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        { bell, localAdapter: makeTimerConfigurationRepositoryPort() }
      )
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(7_000); // remaining = 8s, crosses the threshold in work
    });

    expect(bell.ring).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(8_000); // completes the 15s work phase, transitions to rest
    });

    expect(result.current.phase).toBe("rest");

    act(() => {
      vi.advanceTimersByTime(7_000); // remaining = 8s into rest, crosses the threshold again
    });

    expect(bell.ring).toHaveBeenCalledTimes(2); // fires again in the new phase
  });

  it("should ring the bell exactly once when a single recompute skips multiple phase transitions", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({
      rounds: 3,
      roundDuration: 10,
      restDuration: 5,
      warnBeforeEnd: false,
      bellSound: true,
    });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        { bell, localAdapter: makeTimerConfigurationRepositoryPort() }
      )
    );

    act(() => {
      result.current.start();
    });

    expect(bell.ring).toHaveBeenCalledTimes(1); // start only

    // work1(0-10s) -> rest1(10-15s) -> work2(15-25s) -> rest2(25-30s): one 27s jump
    // skips 3 phase boundaries, but a jump is still a single change (D9).
    act(() => {
      vi.setSystemTime(Date.now() + 27_000);
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.round).toBe(2);
    expect(result.current.phase).toBe("rest");
    expect(bell.ring).toHaveBeenCalledTimes(2); // start + exactly one ring for the whole jump
  });

  it("should not fire any warning when warnBeforeEnd is false", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({
      rounds: 1,
      roundDuration: 20,
      warnBeforeEnd: false,
      bellSound: false,
    });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        { bell, localAdapter: makeTimerConfigurationRepositoryPort() }
      )
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(19_000);
    });

    expect(result.current.isWarning).toBe(false);
    expect(bell.ring).not.toHaveBeenCalled();
  });

  it("should freeze remainingLabel while paused and continue from the frozen value on resume", () => {
    const config = buildTimerConfiguration({ roundDuration: 20 });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        {
          bell: makeBellPort(),
          localAdapter: makeTimerConfigurationRepositoryPort(),
        }
      )
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    const frozenLabel = result.current.remainingLabel;

    act(() => {
      result.current.pause();
    });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.status).toBe("paused");
    expect(result.current.remainingLabel).toBe(frozenLabel);

    act(() => {
      result.current.resume();
    });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.status).toBe("running");
    expect(result.current.remainingLabel).not.toBe(frozenLabel);
  });

  it("should call router.push('/timers') when stop() is called", () => {
    const config = buildTimerConfiguration();
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        {
          bell: makeBellPort(),
          localAdapter: makeTimerConfigurationRepositoryPort(),
        }
      )
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.stop();
    });

    expect(pushMock).toHaveBeenCalledWith("/timers");
  });

  it("should not touch persistence when stop() is called", () => {
    const localAdapter = makeTimerConfigurationRepositoryPort();
    const config = buildTimerConfiguration();
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        { bell: makeBellPort(), localAdapter }
      )
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.stop();
    });

    expect(localAdapter.create).not.toHaveBeenCalled();
    expect(localAdapter.update).not.toHaveBeenCalled();
  });

  it("should recompute the correct round and phase with zero drift after a visibilitychange following a long gap with no ticks", () => {
    const config = buildTimerConfiguration({
      rounds: 3,
      roundDuration: 10,
      restDuration: 5,
    });
    const { result } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        {
          bell: makeBellPort(),
          localAdapter: makeTimerConfigurationRepositoryPort(),
        }
      )
    );

    act(() => {
      result.current.start();
    });

    // work1(0-10s) -> rest1(10-15s) -> work2(15-25s) -> rest2(25-30s): 27s lands 2s into rest2,
    // mirroring the domain's own multi-phase-gap proof, without any interval tick in between.
    act(() => {
      vi.setSystemTime(Date.now() + 27_000);
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.round).toBe(2);
    expect(result.current.phase).toBe("rest");
  });

  it("should resolve the guest configuration via the injected local adapter using timerId", async () => {
    // Real timers: RTL's waitFor polls with real setTimeout, which never
    // fires once vi.useFakeTimers() (from beforeEach) is active — this test
    // only awaits promise resolution, no tick simulation needed.
    vi.useRealTimers();
    const config = buildTimerConfiguration({ id: "tc-1", name: "Guest Timer" });
    const localAdapter = makeTimerConfigurationRepositoryPort({
      getById: vi.fn().mockResolvedValue(config),
    });
    const { result } = renderHook(() =>
      useTimerActive(
        {
          isAuthenticated: false,
          initialConfiguration: null,
          timerId: "tc-1",
        },
        { bell: makeBellPort(), localAdapter }
      )
    );

    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(localAdapter.getById).toHaveBeenCalledWith("tc-1");
    expect(result.current.name).toBe("Guest Timer");
  });

  it("should redirect a guest to /timers when the configuration is not found", async () => {
    vi.useRealTimers();
    const localAdapter = makeTimerConfigurationRepositoryPort({
      getById: vi.fn().mockRejectedValue(timerConfigurationNotFound("tc-1")),
    });

    const { result } = renderHook(() =>
      useTimerActive(
        {
          isAuthenticated: false,
          initialConfiguration: null,
          timerId: "tc-1",
        },
        { bell: makeBellPort(), localAdapter }
      )
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/timers"));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("No encontramos ese timer.");
  });

  it("should clear the interval and remove the visibilitychange listener on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const config = buildTimerConfiguration();

    const { unmount } = renderHook(() =>
      useTimerActive(
        { isAuthenticated: true, initialConfiguration: config },
        {
          bell: makeBellPort(),
          localAdapter: makeTimerConfigurationRepositoryPort(),
        }
      )
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });
});
