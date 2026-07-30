// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { makeBellPort } from "@/application/ports/__mocks__/bell-port.mock";

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
      useTimerActive({ initialConfiguration: config }, { bell: makeBellPort() })
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
      useTimerActive({ initialConfiguration: config }, { bell })
    );

    act(() => {
      result.current.start();
    });

    expect(bell.ring).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("running");
  });

  it("should expose primaryLabel/primaryIcon/onPrimaryAction matching the session status", () => {
    const config = buildTimerConfiguration({ roundDuration: 20 });
    const { result } = renderHook(() =>
      useTimerActive({ initialConfiguration: config }, { bell: makeBellPort() })
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
  });

  it("should call router.push('/timers') when stop() is called", () => {
    const config = buildTimerConfiguration();
    const { result } = renderHook(() =>
      useTimerActive({ initialConfiguration: config }, { bell: makeBellPort() })
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.stop();
    });

    expect(pushMock).toHaveBeenCalledWith("/timers");
  });

  it("should reach finished status and ring the bell once more when the session completes", () => {
    const bell = makeBellPort();
    const config = buildTimerConfiguration({
      rounds: 1,
      roundDuration: 5,
      warnBeforeEnd: false,
      bellSound: true,
    });
    const { result } = renderHook(() =>
      useTimerActive({ initialConfiguration: config }, { bell })
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
});
