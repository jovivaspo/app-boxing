import type { CSSProperties, MouseEvent } from "react";

export interface UseTiltCardResult {
  style: CSSProperties;
  onMouseMove: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
}
