import type { RefObject } from "react";

export interface UseLoginCardResult {
  error: string | null;
  isLoading: boolean;
  buttonContainerRef: RefObject<HTMLDivElement | null>;
}
