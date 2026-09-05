// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { useScrollReveal } from "../use-scroll-reveal";

type ObserverCallback = (entries: [{ isIntersecting: boolean }]) => void;

let capturedCallback: ObserverCallback | null = null;
const disconnect = vi.fn();
const observe = vi.fn();

class FakeIntersectionObserver {
  constructor(callback: ObserverCallback) {
    capturedCallback = callback;
  }
  observe = observe;
  disconnect = disconnect;
  unobserve = vi.fn();
}

vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

afterEach(() => {
  capturedCallback = null;
  disconnect.mockClear();
  observe.mockClear();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("useScrollReveal", () => {
  it("should start hidden before the element intersects the viewport", () => {
    const { result } = renderHook(() => useScrollReveal());

    const [ref, isVisible] = result.current;

    expect(isVisible).toBe(false);
    expect(ref.current).toBeNull();
  });

  it("should not observe anything when the ref has no element attached", () => {
    renderHook(() => useScrollReveal());

    expect(observe).not.toHaveBeenCalled();
  });

  it("should reveal and stop observing once the element intersects", () => {
    const { result, rerender } = renderHook(() => {
      const [ref, isVisible] = useScrollReveal();
      if (!ref.current) {
        (ref as { current: HTMLElement | null }).current =
          document.createElement("div");
      }
      return [ref, isVisible] as const;
    });

    rerender();

    expect(capturedCallback).not.toBeNull();
    capturedCallback?.([{ isIntersecting: true }]);
    rerender();

    expect(result.current[1]).toBe(true);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
