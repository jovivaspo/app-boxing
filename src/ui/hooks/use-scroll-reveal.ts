"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const REVEAL_MARGIN = "0px 0px -25% 0px";

export function useScrollReveal<T extends HTMLElement>(): [
  RefObject<T | null>,
  boolean,
] {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin: REVEAL_MARGIN }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}
