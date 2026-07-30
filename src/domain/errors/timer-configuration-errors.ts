import { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

export interface InvalidTimerConfiguration extends Error {
  readonly _tag: "InvalidTimerConfiguration";
}

export function invalidTimerConfiguration(
  message = "Invalid timer configuration"
): InvalidTimerConfiguration {
  return Object.assign(new Error(message), {
    _tag: "InvalidTimerConfiguration" as const,
  });
}

/**
 * Upper bound for any duration, in seconds: 59:59. Durations are authored and
 * displayed as a minutes:seconds pair, so a value above this has no
 * representation in the UI.
 */
export const MAX_DURATION_SECONDS = 3599;

/**
 * @throws {InvalidTimerConfiguration} rounds, roundDuration, or restDuration is <= 0,
 * or roundDuration/restDuration is above `MAX_DURATION_SECONDS`.
 */
export function validateTimerConfiguration(
  input: TimerConfiguration
): TimerConfiguration;
export function validateTimerConfiguration(
  input: Omit<TimerConfiguration, "id">
): Omit<TimerConfiguration, "id">;
export function validateTimerConfiguration(
  input: Omit<TimerConfiguration, "id">
): Omit<TimerConfiguration, "id"> {
  if (
    input.rounds <= 0 ||
    input.roundDuration <= 0 ||
    input.restDuration <= 0
  ) {
    throw invalidTimerConfiguration(
      "rounds, roundDuration, and restDuration must be greater than 0"
    );
  }
  if (
    input.roundDuration > MAX_DURATION_SECONDS ||
    input.restDuration > MAX_DURATION_SECONDS
  ) {
    throw invalidTimerConfiguration(
      `roundDuration and restDuration must not exceed ${MAX_DURATION_SECONDS} seconds`
    );
  }
  return input;
}

/**
 * @throws {InvalidTimerConfiguration} rounds or roundDuration is <= 0, or
 * roundDuration is above `MAX_DURATION_SECONDS`.
 * Guest-only sibling of `validateTimerConfiguration`: intentionally skips
 * `restDuration` (guests don't set it), never weakens the shared validator.
 */
export function validateGuestTimerConfiguration<
  T extends Pick<TimerConfiguration, "rounds" | "roundDuration">,
>(input: T): T {
  if (input.rounds <= 0 || input.roundDuration <= 0) {
    throw invalidTimerConfiguration(
      "rounds and roundDuration must be greater than 0"
    );
  }
  if (input.roundDuration > MAX_DURATION_SECONDS) {
    throw invalidTimerConfiguration(
      `roundDuration must not exceed ${MAX_DURATION_SECONDS} seconds`
    );
  }
  return input;
}

export interface TimerConfigurationNotFound extends Error {
  readonly _tag: "TimerConfigurationNotFound";
}

export function timerConfigurationNotFound(
  id: string
): TimerConfigurationNotFound {
  return Object.assign(new Error(`Timer configuration not found: ${id}`), {
    _tag: "TimerConfigurationNotFound" as const,
  });
}

export type TimerConfigurationError =
  InvalidTimerConfiguration | TimerConfigurationNotFound;
