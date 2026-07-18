import { TimerConfiguration } from "../timer-configuration.model";

export function buildTimerConfiguration(
  overrides: Partial<TimerConfiguration> = {}
): TimerConfiguration {
  return {
    id: "tc-1",
    name: "Standard Session",
    rounds: 8,
    roundDuration: 180,
    restDuration: 60,
    warnBeforeEnd: true,
    bellSound: true,
    ...overrides,
  };
}
