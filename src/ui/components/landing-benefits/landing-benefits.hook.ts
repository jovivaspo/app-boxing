"use client";

import { useCallback, useState, type MouseEvent } from "react";

import type { UseTiltCardResult } from "./landing-benefits.types";

const TILT_INTENSITY = 12;

const RESET_STYLE: UseTiltCardResult["style"] = {
  transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)",
};

export function useTiltCard(): UseTiltCardResult {
  const [style, setStyle] = useState<UseTiltCardResult["style"]>(RESET_STYLE);

  const onMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(800px) rotateX(${-y * TILT_INTENSITY}deg) rotateY(${x * TILT_INTENSITY}deg) scale(1.02)`,
    });
  }, []);

  const onMouseLeave = useCallback(() => setStyle(RESET_STYLE), []);

  return { style, onMouseMove, onMouseLeave };
}
