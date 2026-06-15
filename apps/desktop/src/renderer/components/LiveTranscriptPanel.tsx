import type { LiveTranscriptSegment } from "@real-time-transcriptor/shared";
import { useEffect, useRef, useState } from "react";

import { formatMsAsTimestamp } from "../lib/format";
import { LOW_CONFIDENCE_THRESHOLD, speakerColorClass } from "../lib/speakerColors";

interface LiveTranscriptPanelProps {
  segments: LiveTranscriptSegment[];
  isStreaming: boolean;
  onRenameSpeaker: (speakerId: string, currentLabel: string) => void;
}

export function LiveTranscriptPanel({
  segments,
  isStreaming,
  onRenameSpeaker,
}: LiveTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [pinToBottom, setPinToBottom] = useState(true);

  useEffect(() => {
    if (!pinToBottom || !scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [pinToBottom, segments]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setPinToBottom(distanceFromBottom < 48);
  };

  return (
    <section className="flex min-h-[320px] flex-col rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-200">Live transcript</p>
          <p className="text-xs text-slate-500">
            {isStreaming ? "Updating in real time" : "Start recording to see transcript"}
          </p>
        </div>
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            pinToBottom
              ? "bg-sky-600 text-white"
              : "border border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
          onClick={() => {
            setPinToBottom(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
        >
          {pinToBottom ? "Pinned to bottom" : "Pin to bottom"}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        onScroll={handleScroll}
      >
        {segments.length === 0 ? (
          <p className="text-sm text-slate-500">
            Transcript will appear here as speech is recognized.
          </p>
        ) : (
          segments.map((segment) => {
            const isLowConfidence =
              segment.confidence !== null && segment.confidence < LOW_CONFIDENCE_THRESHOLD;
            const tooltip =
              segment.alternatives.length > 0
                ? `Alternative: ${segment.alternatives[0]}`
                : isLowConfidence
                  ? `Low confidence (${Math.round((segment.confidence ?? 0) * 100)}%)`
                  : undefined;

            return (
              <article
                key={segment.id}
                className={`rounded-lg border bg-slate-950/60 p-3 ${
                  isLowConfidence
                    ? "border-amber-500/50"
                    : segment.is_final
                      ? "border-slate-800"
                      : "border-slate-700 border-dashed"
                }`}
                title={tooltip}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    className={`rounded-full border px-2 py-1 font-medium transition hover:opacity-80 ${speakerColorClass(segment.speaker_id)}`}
                    onClick={() => onRenameSpeaker(segment.speaker_id, segment.speaker_label)}
                    title="Click to rename speaker"
                  >
                    {segment.speaker_label}
                  </button>
                  <span className="font-mono text-slate-500">
                    {formatMsAsTimestamp(segment.start_ms)}
                  </span>
                  {!segment.is_final ? (
                    <span className="text-slate-500 italic">Updating…</span>
                  ) : null}
                </div>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    segment.is_final ? "text-slate-200" : "text-slate-400 italic"
                  }`}
                >
                  {segment.text}
                </p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
