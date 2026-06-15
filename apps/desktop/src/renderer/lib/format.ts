export function formatMsAsTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDurationMs(durationMs: number | null): string {
  if (durationMs === null || durationMs <= 0) {
    return "—";
  }

  return formatMsAsTimestamp(durationMs);
}
