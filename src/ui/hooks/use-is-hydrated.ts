"use client";

import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Reports whether React has finished hydrating (issue #44). Statically
 * prerendered routes hydrate inside `startTransition` under the App Router, so
 * hydration is concurrent and interruptible: an effect that reads a
 * browser-only source (localStorage) and calls `setState` in a microtask can
 * patch the tree mid-reconciliation. Gating that effect on this hook moves the
 * update to strictly after hydration commits — the server snapshot is `false`
 * and only flips to `true` on the post-hydration render.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot
  );
}
