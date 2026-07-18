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

export function validateTimerConfiguration(
  input: TimerConfiguration
): TimerConfiguration | InvalidTimerConfiguration {
  if (
    input.rounds <= 0 ||
    input.roundDuration <= 0 ||
    input.restDuration <= 0
  ) {
    return invalidTimerConfiguration(
      "rounds, roundDuration, and restDuration must be greater than 0"
    );
  }
  return input;
}
