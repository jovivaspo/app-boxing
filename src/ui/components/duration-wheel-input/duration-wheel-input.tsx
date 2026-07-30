"use client";

import { useId } from "react";

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
  CONTAINER_HEIGHT,
  ITEM_HEIGHT,
  useDurationWheelInput,
} from "./duration-wheel-input.hook";
import type { DurationWheelInputProps } from "./duration-wheel-input.types";

const WHEEL_VALUES = Array.from({ length: 60 }, (_, index) => index);
const CENTER_PADDING = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

/** Presentational only (A2): all logic lives in `useDurationWheelInput`. */
export function DurationWheelInput({
  value,
  onChange,
  "aria-label": ariaLabel,
}: DurationWheelInputProps) {
  const {
    open,
    draft,
    containerRef,
    handleOpenChange,
    handleScroll,
    handleConfirm,
    handleArrowKey,
  } = useDurationWheelInput({ value, onChange });
  const optionIdPrefix = useId();

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
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10 border-y-2 border-orange-500"
            style={{ top: CENTER_PADDING, height: ITEM_HEIGHT }}
          />
          <div
            ref={containerRef}
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={`${optionIdPrefix}-${draft}`}
            tabIndex={0}
            onScroll={(event) => handleScroll(event.currentTarget.scrollTop)}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                handleArrowKey("up");
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                handleArrowKey("down");
              }
            }}
            style={{
              height: CONTAINER_HEIGHT,
              paddingTop: CENTER_PADDING,
              paddingBottom: CENTER_PADDING,
            }}
            className="snap-y snap-mandatory overflow-y-scroll"
          >
            {WHEEL_VALUES.map((item) => (
              <div
                key={item}
                id={`${optionIdPrefix}-${item}`}
                role="option"
                aria-selected={item === draft}
                style={{ height: ITEM_HEIGHT }}
                className="flex snap-center items-center justify-center text-2xl"
              >
                {String(item).padStart(2, "0")}
              </div>
            ))}
          </div>
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
