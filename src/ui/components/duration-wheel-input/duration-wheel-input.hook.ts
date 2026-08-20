"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  UseDurationWheelInputParams,
  UseDurationWheelInputResult,
} from "./duration-wheel-input.types";

const MIN_VALUE = 0;
const MAX_VALUE = 59;
export const ITEM_HEIGHT = 40;
export const CONTAINER_HEIGHT = 160;

export function scrollTopToValue(scrollTop: number, itemHeight: number) {
  const raw = Math.round(scrollTop / itemHeight);
  return Math.min(Math.max(raw, MIN_VALUE), MAX_VALUE);
}

export function valueToScrollTop(value: number, itemHeight: number) {
  return value * itemHeight;
}

export function useDurationWheelInput({
  value,
  onChange,
}: UseDurationWheelInputParams): UseDurationWheelInputResult {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setDraft(value);
      }
      setOpen(nextOpen);
    },
    [value]
  );

  useEffect(() => {
    if (open && containerRef.current) {
      containerRef.current.scrollTop = valueToScrollTop(value, ITEM_HEIGHT);
    }
  }, [open, value]);

  const handleScroll = useCallback((scrollTop: number) => {
    setDraft(scrollTopToValue(scrollTop, ITEM_HEIGHT));
  }, []);

  const handleConfirm = useCallback(() => {
    onChange(draft);
    setOpen(false);
  }, [draft, onChange]);

  const handleArrowKey = useCallback((direction: "up" | "down") => {
    setDraft((current) => {
      const next = direction === "up" ? current - 1 : current + 1;
      const clamped = Math.min(Math.max(next, MIN_VALUE), MAX_VALUE);
      if (containerRef.current) {
        containerRef.current.scrollTop = valueToScrollTop(clamped, ITEM_HEIGHT);
      }
      return clamped;
    });
  }, []);

  return {
    open,
    draft,
    containerRef,
    handleOpenChange,
    handleScroll,
    handleConfirm,
    handleArrowKey,
  };
}
