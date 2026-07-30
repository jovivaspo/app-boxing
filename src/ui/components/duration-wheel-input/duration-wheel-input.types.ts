import type { RefObject } from "react";

export interface DurationWheelInputProps {
  value: number;
  onChange: (value: number) => void;
  "aria-label": string;
}

export type UseDurationWheelInputParams = Pick<
  DurationWheelInputProps,
  "value" | "onChange"
>;

export interface UseDurationWheelInputResult {
  open: boolean;
  draft: number;
  containerRef: RefObject<HTMLDivElement | null>;
  handleOpenChange: (open: boolean) => void;
  handleScroll: (scrollTop: number) => void;
  handleConfirm: () => void;
  handleArrowKey: (direction: "up" | "down") => void;
}
