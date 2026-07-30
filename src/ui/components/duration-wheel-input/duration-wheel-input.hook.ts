"use client";

import { useCallback, useState } from "react";

import type {
  UseDurationWheelInputParams,
  UseDurationWheelInputResult,
} from "./duration-wheel-input.types";

const MIN_VALUE = 0;
const MAX_VALUE = 59;
export const ITEM_HEIGHT = 40;

/** Pure: maps a scroll position to the nearest clamped 0-59 value. */
export function scrollTopToValue(scrollTop: number, itemHeight: number) {
  const raw = Math.round(scrollTop / itemHeight);
  return Math.min(Math.max(raw, MIN_VALUE), MAX_VALUE);
}

/** Pure: inverse of `scrollTopToValue` — the scroll offset for a value. */
export function valueToScrollTop(value: number, itemHeight: number) {
  return value * itemHeight;
}

/**
 * Owns all duration-wheel-input logic (A2): local `draft` state seeded from
 * `value` on open, committed to `onChange` only on Confirm — cancel/outside
 * click/Escape just close, discarding the draft (design D4).
 */
export function useDurationWheelInput({
  value,
  onChange,
}: UseDurationWheelInputParams): UseDurationWheelInputResult {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setDraft(value);
      }
      setOpen(nextOpen);
    },
    [value]
  );

  const handleScroll = useCallback((scrollTop: number) => {
    setDraft(scrollTopToValue(scrollTop, ITEM_HEIGHT));
  }, []);

  const handleConfirm = useCallback(() => {
    onChange(draft);
    setOpen(false);
  }, [draft, onChange]);

  return { open, draft, handleOpenChange, handleScroll, handleConfirm };
}
