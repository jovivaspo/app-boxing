export type TimerLevel = "amateur" | "pro" | "elite";

export interface TimerConfiguration {
  name: string;
  rounds: number;
  roundDuration: number; // seconds
  restDuration: number; // seconds
  warnBeforeEnd: boolean;
  bellSound: boolean;
}

// roundDuration/restDuration unused in v1; kept for future refinement.
export function calculateTimerLevel(
  config: Pick<TimerConfiguration, "rounds" | "roundDuration" | "restDuration">
): TimerLevel {
  const { rounds } = config;
  if (rounds <= 7) return "amateur";
  if (rounds <= 12) return "pro";
  return "elite";
}
