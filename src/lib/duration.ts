export function formatDuration(totalSeconds: number): string {
  const { minutes, seconds } = splitDuration(totalSeconds);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function splitDuration(totalSeconds: number): {
  minutes: number;
  seconds: number;
} {
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

export function toTotalSeconds(minutes: number, seconds: number): number {
  const safeMinutes = Number.isNaN(minutes) ? 0 : minutes;
  const safeSeconds = Number.isNaN(seconds) ? 0 : seconds;
  return safeMinutes * 60 + safeSeconds;
}
