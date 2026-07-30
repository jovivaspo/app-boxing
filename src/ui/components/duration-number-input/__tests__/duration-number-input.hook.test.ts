// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDurationNumberInput } from "../duration-number-input.hook";

describe("useDurationNumberInput", () => {
  it("should strip non-numeric characters before propagating a keystroke", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDurationNumberInput({ value: 5, onChange })
    );

    result.current.handleInputChange("a5b");

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("should clamp a typed value above 59 to 59", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDurationNumberInput({ value: 5, onChange })
    );

    result.current.handleInputChange("99");

    expect(onChange).toHaveBeenCalledWith(59);
  });

  it("should zero-pad the display to two digits", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDurationNumberInput({ value: 5, onChange })
    );

    expect(result.current.display).toBe("05");
  });

  it("should display an unpadded two-digit value unchanged", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDurationNumberInput({ value: 23, onChange })
    );

    expect(result.current.display).toBe("23");
  });
});
