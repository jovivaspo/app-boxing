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
): TimerConfiguration {
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
