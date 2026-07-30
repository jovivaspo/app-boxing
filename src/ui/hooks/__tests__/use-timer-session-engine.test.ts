// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { makeBellPort } from "@/application/ports/__mocks__/bell-port.mock";

import { useTimerSessionEngine } from "../use-timer-session-engine";

describe("useTimerSessionEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should stay idle with no countdown running before start() is called", () => {
    const config = buildTimerConfiguration({ roundDuration: 20 });
    const { result } = renderHook(() =>
      useTimerSessionEngine(config, vi.fn(), { bell: makeBellPort() })
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.remainingLabel).toBe("0:20");
  });

  it("should report loading status when config is null", () => {
    const { result } = renderHook(() =>
      useTimerSessionEngine(null, vi.fn(), { bell: makeBellPort() })
    );

    expect(result.current.status).toBe("loading");
  });

  it("should ring the bell exactly once on start() when bellSound is true", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({ bellSound: true });
    const { result } = renderHook(() =>
      useTimerSessionEngine(config, vi.fn(), { bell })
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
      useTimerSessionEngine(config, vi.fn(), { bell })
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
      () => useTimerSessionEngine(config, vi.fn(), { bell }),
      { wrapper: StrictMode }
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(result.current.phase).toBe("rest");
    expect(bell.ring).toHaveBeenCalledTimes(2);
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
      useTimerSessionEngine(config, vi.fn(), { bell })
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.status).toBe("finished");
    expect(bell.ring).toHaveBeenCalledTimes(2);
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
      useTimerSessionEngine(config, vi.fn(), { bell })
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    expect(result.current.isWarning).toBe(true);
    expect(bell.ring).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(bell.ring).toHaveBeenCalledTimes(1);
  });

  it("should freeze remainingLabel while paused and continue from the frozen value on resume", () => {
    const config = buildTimerConfiguration({ roundDuration: 20 });
    const { result } = renderHook(() =>
      useTimerSessionEngine(config, vi.fn(), { bell: makeBellPort() })
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

  it("should expose primaryLabel/primaryIcon/onPrimaryAction matching the session status", () => {
    const config = buildTimerConfiguration({ roundDuration: 20 });
    const { result } = renderHook(() =>
      useTimerSessionEngine(config, vi.fn(), { bell: makeBellPort() })
    );

    expect(result.current.status).toBe("idle");
    expect(result.current.primaryLabel).toBe("INICIAR");
    expect(result.current.primaryIcon).toBe("play");
    expect(result.current.onPrimaryAction).toBe(result.current.start);

    act(() => {
      result.current.start();
    });

    expect(result.current.primaryLabel).toBe("PAUSA");
    expect(result.current.primaryIcon).toBe("pause");
    expect(result.current.onPrimaryAction).toBe(result.current.pause);

    act(() => {
      result.current.pause();
    });

    expect(result.current.primaryLabel).toBe("REANUDAR");
    expect(result.current.primaryIcon).toBe("play");
    expect(result.current.onPrimaryAction).toBe(result.current.resume);
  });

  it("should call the provided onStop callback when stop() is called", () => {
    const onStop = vi.fn();
    const config = buildTimerConfiguration();
    const { result } = renderHook(() =>
      useTimerSessionEngine(config, onStop, { bell: makeBellPort() })
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.stop();
    });

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("should recompute the correct round and phase with zero drift after a visibilitychange following a long gap with no ticks", () => {
    const config = buildTimerConfiguration({
      rounds: 3,
      roundDuration: 10,
      restDuration: 5,
    });
    const { result } = renderHook(() =>
      useTimerSessionEngine(config, vi.fn(), { bell: makeBellPort() })
    );

    act(() => {
      result.current.start();
    });

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

  it("should clear the interval and remove the visibilitychange listener on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const config = buildTimerConfiguration();

    const { unmount } = renderHook(() =>
      useTimerSessionEngine(config, vi.fn(), { bell: makeBellPort() })
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });
});
