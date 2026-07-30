// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  useDurationWheelInput,
  scrollTopToValue,
  valueToScrollTop,
  ITEM_HEIGHT,
} from "../duration-wheel-input.hook";

describe("scrollTopToValue", () => {
  it("should convert a scrollTop of 0 to value 0", () => {
    expect(scrollTopToValue(0, ITEM_HEIGHT)).toBe(0);
  });

  it("should clamp a scrollTop above the max item to 59", () => {
    expect(scrollTopToValue(ITEM_HEIGHT * 100, ITEM_HEIGHT)).toBe(59);
  });
});

describe("valueToScrollTop", () => {
  it("should convert value 23 to the matching scrollTop offset", () => {
    expect(valueToScrollTop(23, ITEM_HEIGHT)).toBe(23 * ITEM_HEIGHT);
  });
});

describe("useDurationWheelInput", () => {
  it("should seed draft from value when the dialog opens", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDurationWheelInput({ value: 10, onChange })
    );

    act(() => {
      result.current.handleOpenChange(true);
    });

    expect(result.current.draft).toBe(10);
  });

  it("should call onChange with the draft value and close on confirm", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDurationWheelInput({ value: 10, onChange })
    );

    act(() => {
      result.current.handleOpenChange(true);
    });
    act(() => {
      result.current.handleScroll(23 * ITEM_HEIGHT);
    });
    act(() => {
      result.current.handleConfirm();
    });

    expect(onChange).toHaveBeenCalledWith(23);
    expect(result.current.open).toBe(false);
  });

  it("should not call onChange when the dialog is closed without confirming", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDurationWheelInput({ value: 10, onChange })
    );

    act(() => {
      result.current.handleOpenChange(true);
    });
    act(() => {
      result.current.handleScroll(23 * ITEM_HEIGHT);
    });
    act(() => {
      result.current.handleOpenChange(false);
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
