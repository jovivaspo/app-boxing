import type { CSSProperties, MouseEvent } from "react";

export interface UseLandingHeroParallaxResult {
  glowRedStyle: CSSProperties;
  glowYellowStyle: CSSProperties;
  backgroundPosition: string;
  onMouseMove: (event: MouseEvent<HTMLElement>) => void;
}
