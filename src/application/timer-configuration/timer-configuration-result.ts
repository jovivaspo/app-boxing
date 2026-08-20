export type TimerConfigurationErrorCode =
  "invalid-configuration" | "not-found" | "unauthenticated" | "unknown";

export type Result<T> =
  { ok: true; data: T } | { ok: false; code: TimerConfigurationErrorCode };

export function toTimerConfigurationErrorCode(
  error: unknown
): TimerConfigurationErrorCode {
  const tag = (error as { _tag?: unknown } | null)?._tag;
  if (tag === "InvalidTimerConfiguration") return "invalid-configuration";
  if (tag === "TimerConfigurationNotFound") return "not-found";
  return "unknown";
}
