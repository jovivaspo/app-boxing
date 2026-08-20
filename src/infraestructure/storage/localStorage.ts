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
