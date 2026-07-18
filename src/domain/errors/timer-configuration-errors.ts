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
 * @throws {InvalidTimerConfiguration} rounds, roundDuration, or restDuration is <= 0.
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
