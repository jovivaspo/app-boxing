"use client";

import { useCallback, useState, type MouseEvent } from "react";

import type { UseLandingHeroParallaxResult } from "./landing-hero.types";

const RED_GLOW_RATIO = 40;
const YELLOW_GLOW_RATIO = -50;
const BACKGROUND_RATIO = 15;

export function useLandingHeroParallax(): UseLandingHeroParallaxResult {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOffset({
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    });
  }, []);

  return {
    glowRedStyle: {
      transform: `translate(${offset.x * RED_GLOW_RATIO}px, ${offset.y * RED_GLOW_RATIO}px)`,
    },
    glowYellowStyle: {
      transform: `translate(${offset.x * YELLOW_GLOW_RATIO}px, ${offset.y * YELLOW_GLOW_RATIO}px)`,
    },
    backgroundPosition: `calc(50% + ${offset.x * BACKGROUND_RATIO}px) calc(50% + ${offset.y * BACKGROUND_RATIO}px)`,
    onMouseMove,
  };
}
