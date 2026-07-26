"use client";

import { useCallback } from "react";

import type {
  RoundsStepperProps,
  UseRoundsStepperResult,
} from "./rounds-stepper.types";

const MIN_ROUNDS = 1;

/**
 * Owns all rounds-stepper logic (A2): +/- clamped to a floor of 1 (design
 * D7, derived from `validateTimerConfiguration`'s `rounds <= 0` rule), and
 * manual-input clamping so an empty/NaN/`0` typed value never propagates.
 */
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
