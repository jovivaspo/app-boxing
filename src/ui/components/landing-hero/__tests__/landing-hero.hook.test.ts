// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MouseEvent } from "react";

import { useLandingHeroParallax } from "../landing-hero.hook";

function mouseMoveAt(clientX: number, clientY: number) {
  return {
    clientX,
    clientY,
    currentTarget: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 200,
        height: 100,
      }),
    },
  } as unknown as MouseEvent<HTMLElement>;
}

describe("useLandingHeroParallax", () => {
  it("should center the glows and the background before any pointer movement", () => {
    const { result } = renderHook(() => useLandingHeroParallax());

    expect(result.current.glowRedStyle.transform).toBe("translate(0px, 0px)");
    expect(result.current.glowYellowStyle.transform).toBe(
      "translate(0px, 0px)"
    );
    expect(result.current.backgroundPosition).toBe(
      "calc(50% + 0px) calc(50% + 0px)"
    );
  });

  it("should move the red glow toward the pointer and the yellow glow away from it", () => {
    const { result } = renderHook(() => useLandingHeroParallax());

    act(() => {
      result.current.onMouseMove(mouseMoveAt(150, 75));
    });

    expect(result.current.glowRedStyle.transform).toBe("translate(10px, 10px)");
    expect(result.current.glowYellowStyle.transform).toBe(
      "translate(-12.5px, -12.5px)"
    );
    expect(result.current.backgroundPosition).toBe(
      "calc(50% + 3.75px) calc(50% + 3.75px)"
    );
  });
});
