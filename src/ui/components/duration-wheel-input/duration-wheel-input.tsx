"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/components/shadcn/dialog";
import { Button } from "@/ui/components/shadcn/button";

import {
  ITEM_HEIGHT,
  useDurationWheelInput,
} from "./duration-wheel-input.hook";
import type { DurationWheelInputProps } from "./duration-wheel-input.types";

const WHEEL_VALUES = Array.from({ length: 60 }, (_, index) => index);

/** Presentational only (A2): all logic lives in `useDurationWheelInput`. */
export function DurationWheelInput({
  value,
  onChange,
  "aria-label": ariaLabel,
}: DurationWheelInputProps) {
  const { open, draft, handleOpenChange, handleScroll, handleConfirm } =
    useDurationWheelInput({ value, onChange });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="font-heading text-primary w-12 border-none bg-transparent p-0 text-center text-2xl"
        >
          {String(value).padStart(2, "0")}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ariaLabel}</DialogTitle>
        </DialogHeader>
        <div
          role="listbox"
          aria-label={ariaLabel}
          onScroll={(event) => handleScroll(event.currentTarget.scrollTop)}
          className="h-40 snap-y snap-mandatory overflow-y-scroll"
        >
          {WHEEL_VALUES.map((item) => (
            <div
              key={item}
              role="option"
              aria-selected={item === draft}
              style={{ height: ITEM_HEIGHT }}
              className="flex snap-center items-center justify-center text-2xl"
            >
              {String(item).padStart(2, "0")}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleConfirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
