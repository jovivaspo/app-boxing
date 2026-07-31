"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/** True only after hydration completes: the server render and the hydrating client
 *  render both see `false`, so browser-storage-derived state can be applied without
 *  a mismatch. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
