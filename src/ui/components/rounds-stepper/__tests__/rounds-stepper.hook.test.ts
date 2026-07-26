// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRoundsStepper } from "../rounds-stepper.hook";

describe("useRoundsStepper", () => {
  it("should increment the value on increment()", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useRoundsStepper({ value: 3, onChange })
    );

    result.current.increment();

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("should decrement the value on decrement()", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useRoundsStepper({ value: 3, onChange })
    );

    result.current.decrement();

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("should not decrement below 1", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useRoundsStepper({ value: 1, onChange })
    );

    result.current.decrement();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("should clamp a typed empty/NaN/0 value to 1", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useRoundsStepper({ value: 5, onChange })
    );

    result.current.handleInputChange("");
    result.current.handleInputChange("abc");
    result.current.handleInputChange("0");

    expect(onChange).toHaveBeenNthCalledWith(1, 1);
    expect(onChange).toHaveBeenNthCalledWith(2, 1);
    expect(onChange).toHaveBeenNthCalledWith(3, 1);
  });
});
