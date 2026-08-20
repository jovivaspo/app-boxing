"use client";

import { useDurationNumberInput } from "./duration-number-input.hook";
import type { DurationNumberInputProps } from "./duration-number-input.types";

const DURATION_INPUT_CLASSNAME =
  "font-heading text-primary w-12 border-none bg-transparent p-0 text-center text-2xl focus:border-b-2 focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function DurationNumberInput({
  value,
  onChange,
  "aria-label": ariaLabel,
}: DurationNumberInputProps) {
  const { display, handleInputChange } = useDurationNumberInput({
    value,
    onChange,
  });

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(event) => handleInputChange(event.target.value)}
      aria-label={ariaLabel}
      className={DURATION_INPUT_CLASSNAME}
    />
  );
}
