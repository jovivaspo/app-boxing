"use client";

import { Button } from "@/ui/components/shadcn/button";
import { Input } from "@/ui/components/shadcn/input";

import { useRoundsStepper } from "./rounds-stepper.hook";
import type { RoundsStepperProps } from "./rounds-stepper.types";

/** Presentational only (A2): all logic lives in the hook. */
export function RoundsStepper({ value, onChange }: RoundsStepperProps) {
  const { increment, decrement, handleInputChange } = useRoundsStepper({
    value,
    onChange,
  });

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={decrement}
        disabled={value <= 1}
        aria-label="Restar round"
      >
        -
      </Button>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(event) => handleInputChange(event.target.value)}
        className="w-16 text-center"
        aria-label="Rounds"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={increment}
        aria-label="Sumar round"
      >
        +
      </Button>
    </div>
  );
}
