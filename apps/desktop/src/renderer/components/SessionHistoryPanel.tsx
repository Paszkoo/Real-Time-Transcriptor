import type { SessionSummary } from "@real-time-transcriptor/shared";

import { formatDurationMs } from "../lib/format";

interface SessionHistoryPanelProps {
  sessions: SessionSummary[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  onSearchQueryChange: (value: string) => void;
  onRefresh: () => void;
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleString();
}

export function SessionHistoryPanel({
  sessions,
  searchQuery,
  isLoading,
  error,
  onSearchQueryChange,
  onRefresh,
  onOpenSession,
  onDeleteSession,
}: SessionHistoryPanelProps) {
  return (
    <section className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">Session history</p>
          <p className="mt-1 text-xs text-slate-500">
            Saved transcriptions persist across restarts. Search by keyword in the transcript.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
          onClick={() => onRefresh()}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Search sessions</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search transcripts…"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </label>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      <ul className="mt-4 divide-y divide-slate-800">
        {sessions.length === 0 && !isLoading ? (
          <li className="py-6 text-center text-sm text-slate-500">
            No saved sessions yet. Finish a recording to see it here.
          </li>
        ) : null}

        {sessions.map((session) => (
          <li key={session.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
            <button
              type="button"
              className="flex-1 text-left transition hover:opacity-90"
              onClick={() => onOpenSession(session.id)}
            >
              <p className="text-sm font-medium text-slate-100">
                {session.title ?? "Untitled session"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(session.started_at)} · {formatDurationMs(session.duration_ms)}
                {session.device_name ? ` · ${session.device_name}` : ""}
              </p>
              {session.preview_text ? (
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{session.preview_text}</p>
              ) : (
                <p className="mt-2 text-sm italic text-slate-600">No transcript text yet.</p>
              )}
            </button>

            <button
              type="button"
              className="rounded-lg border border-rose-900/60 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-950/40"
              onClick={() => void onDeleteSession(session.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
