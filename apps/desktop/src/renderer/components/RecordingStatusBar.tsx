import type { CaptureStatusResponse } from "@real-time-transcriptor/shared";

import { formatMsAsTimestamp } from "../lib/format";

interface RecordingStatusBarProps {
  captureStatus: CaptureStatusResponse;
}

export function RecordingStatusBar({ captureStatus }: RecordingStatusBarProps) {
  const levelPercent = Math.round(captureStatus.audio_level * 100);
  const isPaused = captureStatus.is_paused;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Duration</p>
          <p className="font-mono text-sm text-slate-100">
            {formatMsAsTimestamp(captureStatus.elapsed_ms)}
            {isPaused ? <span className="ml-2 text-amber-400">Paused</span> : null}
          </p>
        </div>

        <div className="min-w-[140px] flex-1">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Input level</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isPaused ? "bg-slate-600" : "bg-emerald-500"
              }`}
              style={{ width: `${levelPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              captureStatus.vad_active && !isPaused
                ? "bg-emerald-400 animate-pulse"
                : "bg-slate-600"
            }`}
            aria-hidden="true"
          />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Voice activity</p>
            <p className="text-xs text-slate-300">
              {captureStatus.vad_active && !isPaused ? "Speaking" : "Silent"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
