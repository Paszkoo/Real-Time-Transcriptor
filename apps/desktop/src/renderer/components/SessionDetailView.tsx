import type { SessionDetail } from "@real-time-transcriptor/shared";
import { useEffect, useRef, useState } from "react";

import { SessionInsightsPanel } from "./SessionInsightsPanel";
import { SessionExportPanel } from "./SessionExportPanel";
import { type BackendConnection } from "../lib/backendApi";
import { formatMsAsTimestamp } from "../lib/format";
import { getSessionAudioUrl } from "../lib/sessionsApi";

interface SessionDetailViewProps {
  session: SessionDetail;
  connection: BackendConnection;
  onBack: () => void;
  onArtifactsUpdated: () => void;
}

export function SessionDetailView({
  session,
  connection,
  onBack,
  onArtifactsUpdated,
}: SessionDetailViewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioUrl = session.audio_url ? getSessionAudioUrl(connection, session.audio_url) : null;

  useEffect(() => {
    setAudioError(null);
  }, [session.id]);

  const handleSeek = (startMs: number) => {
    if (!audioRef.current || !audioUrl) {
      return;
    }

    audioRef.current.currentTime = startMs / 1000;
    void audioRef.current.play().catch(() => {
      setAudioError("Could not play session audio.");
    });
  };

  return (
    <section className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="text-xs font-medium text-sky-400 transition hover:text-sky-300"
            onClick={onBack}
          >
            ← Back to history
          </button>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">
            {session.title ?? "Untitled session"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(session.started_at).toLocaleString()}
            {session.device_name ? ` · ${session.device_name}` : ""}
          </p>
        </div>
      </div>

      {audioUrl ? (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            className="w-full"
            onError={() => setAudioError("Audio file could not be loaded.")}
          />
          {audioError ? <p className="mt-2 text-xs text-rose-400">{audioError}</p> : null}
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">
          Audio playback is unavailable. Enable “Save session audio” in settings before recording.
        </p>
      )}

      <SessionInsightsPanel
        session={session}
        connection={connection}
        onArtifactsUpdated={onArtifactsUpdated}
      />

      <SessionExportPanel session={session} connection={connection} />

      <div className="mt-5 space-y-4">
        {session.segments.length === 0 ? (
          <p className="text-sm text-slate-500">This session has no transcript segments yet.</p>
        ) : (
          session.segments.map((segment) => (
            <article key={segment.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-800 px-2 py-1 font-medium text-slate-300">
                  {segment.speaker_label}
                </span>
                <button
                  type="button"
                  className="font-mono text-sky-400 transition hover:text-sky-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  onClick={() => handleSeek(segment.start_ms)}
                  disabled={!audioUrl}
                  title={audioUrl ? "Jump to this moment" : "Enable saved audio to scrub playback"}
                >
                  {formatMsAsTimestamp(segment.start_ms)}
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{segment.text}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
