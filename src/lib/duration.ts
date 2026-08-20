export function formatDuration(totalSeconds: number): string {
  const { minutes, seconds } = splitDuration(totalSeconds);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Splits a whole number of seconds into whole minutes and remaining seconds. */
export function splitDuration(totalSeconds: number): {
  minutes: number;
  seconds: number;
} {
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

/** Combines minutes and seconds into total seconds. Empty/`NaN` inputs count as 0. */
export function toTotalSeconds(minutes: number, seconds: number): number {
  const safeMinutes = Number.isNaN(minutes) ? 0 : minutes;
  const safeSeconds = Number.isNaN(seconds) ? 0 : seconds;
  return safeMinutes * 60 + safeSeconds;
}
