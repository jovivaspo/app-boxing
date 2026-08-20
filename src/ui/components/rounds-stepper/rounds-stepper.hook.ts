"use client";

import { useCallback } from "react";

import type {
  RoundsStepperProps,
  UseRoundsStepperResult,
} from "./rounds-stepper.types";

const MIN_ROUNDS = 1;

export function useRoundsStepper({
  value,
  onChange,
}: RoundsStepperProps): UseRoundsStepperResult {
  const increment = useCallback(() => {
    onChange(value + 1);
  }, [value, onChange]);

  const decrement = useCallback(() => {
    if (value <= MIN_ROUNDS) return;
    onChange(value - 1);
  }, [value, onChange]);

  const handleInputChange = useCallback(
    (raw: string) => {
      const parsed = Number(raw);
      const safe =
        raw === "" || Number.isNaN(parsed) || parsed < MIN_ROUNDS
          ? MIN_ROUNDS
          : parsed;
      onChange(safe);
    },
    [onChange]
  );

  return { increment, decrement, handleInputChange };
}
