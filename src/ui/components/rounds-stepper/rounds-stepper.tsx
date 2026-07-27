"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/ui/components/shadcn/button";

import { useRoundsStepper } from "./rounds-stepper.hook";
import type { RoundsStepperProps } from "./rounds-stepper.types";

/** Presentational only (A2): all logic lives in the hook. */
export function RoundsStepper({ value, onChange }: RoundsStepperProps) {
  const { increment, decrement, handleInputChange } = useRoundsStepper({
    value,
    onChange,
  });

  return (
    <div className="flex items-center justify-between gap-4">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={decrement}
        disabled={value <= 1}
        aria-label="Restar round"
        className="border-border active:bg-primary/20 h-16 w-16 rounded-none border-2"
      >
        <Minus className="size-5" />
      </Button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => handleInputChange(event.target.value)}
        aria-label="Rounds"
        className="font-heading text-foreground w-20 [appearance:textfield] border-none bg-transparent text-center text-4xl focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={increment}
        aria-label="Sumar round"
        className="border-border active:bg-primary/20 h-16 w-16 rounded-none border-2"
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
}
