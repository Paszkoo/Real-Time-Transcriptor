const SPEAKER_COLORS = [
  "bg-sky-500/20 text-sky-300 border-sky-500/40",
  "bg-violet-500/20 text-violet-300 border-violet-500/40",
  "bg-amber-500/20 text-amber-300 border-amber-500/40",
  "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  "bg-rose-500/20 text-rose-300 border-rose-500/40",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
] as const;

export function speakerColorClass(speakerId: string): string {
  let hash = 0;
  for (let index = 0; index < speakerId.length; index += 1) {
    hash = (hash + speakerId.charCodeAt(index) * (index + 1)) % SPEAKER_COLORS.length;
  }
  return SPEAKER_COLORS[hash] ?? SPEAKER_COLORS[0];
}

export const LOW_CONFIDENCE_THRESHOLD = 0.7;
