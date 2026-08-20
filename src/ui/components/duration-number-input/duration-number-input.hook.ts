"use client";

import { useCallback } from "react";

import type {
  UseDurationNumberInputParams,
  UseDurationNumberInputResult,
} from "./duration-number-input.types";

const MIN_VALUE = 0;
const MAX_VALUE = 59;

export function useDurationNumberInput({
  value,
  onChange,
}: UseDurationNumberInputParams): UseDurationNumberInputResult {
  const handleInputChange = useCallback(
    (raw: string) => {
      const digitsOnly = raw.replace(/\D/g, "").slice(-2);
      const parsed = Number(digitsOnly);
      const safe =
        digitsOnly === "" || Number.isNaN(parsed)
          ? MIN_VALUE
          : Math.min(Math.max(parsed, MIN_VALUE), MAX_VALUE);
      onChange(safe);
    },
    [onChange]
  );

  return {
    display: String(value).padStart(2, "0"),
    handleInputChange,
  };
}
