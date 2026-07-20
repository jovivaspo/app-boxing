/**
 * Plain, safe access to `window.localStorage`. `getItem` never throws — SSR
 * (no `window`), a missing key, or malformed JSON all degrade to `undefined`.
 * `setItem`/`removeItem` no-op under SSR, but `setItem` still throws if
 * `value` isn't JSON-serializable (not a concern for the plain-primitive
 * records this module is used with today).
 *
 * Not a port: single consumer (`local-timer-configuration.adapter.ts`), no
 * shared storage-abstraction precedent exists in this codebase (D2).
 */
export function getItem<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;

  const raw = window.localStorage.getItem(key);
  if (raw === null) return undefined;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(key);
}
