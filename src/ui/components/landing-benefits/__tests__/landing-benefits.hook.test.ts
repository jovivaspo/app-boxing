// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MouseEvent } from "react";

import { useTiltCard } from "../landing-benefits.hook";

const RESET_TRANSFORM =
  "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)";

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

describe("useTiltCard", () => {
  it("should start flat, with no tilt applied", () => {
    const { result } = renderHook(() => useTiltCard());

    expect(result.current.style.transform).toBe(RESET_TRANSFORM);
  });

  it("should tilt toward the pointer position on mouse move", () => {
    const { result } = renderHook(() => useTiltCard());

    act(() => {
      result.current.onMouseMove(mouseMoveAt(150, 25));
    });

    expect(result.current.style.transform).toBe(
      "perspective(800px) rotateX(3deg) rotateY(3deg) scale(1.02)"
    );
  });

  it("should reset the tilt when the pointer leaves the card", () => {
    const { result } = renderHook(() => useTiltCard());

    act(() => {
      result.current.onMouseMove(mouseMoveAt(150, 25));
    });
    act(() => {
      result.current.onMouseLeave();
    });

    expect(result.current.style.transform).toBe(RESET_TRANSFORM);
  });
});
