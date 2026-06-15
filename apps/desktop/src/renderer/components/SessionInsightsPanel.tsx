import type { SessionDetail } from "@real-time-transcriptor/shared";

import { type BackendConnection } from "../lib/backendApi";
import { useSessionInsights } from "../hooks/useSessionInsights";

interface SessionInsightsPanelProps {
  session: SessionDetail;
  connection: BackendConnection;
  onArtifactsUpdated: () => void;
}

const TABS = [
  { id: "correct" as const, label: "Korekta" },
  { id: "summarize" as const, label: "Streszczenie" },
  { id: "todos" as const, label: "TODO" },
];

export function SessionInsightsPanel({
  session,
  connection,
  onArtifactsUpdated,
}: SessionInsightsPanelProps) {
  const insights = useSessionInsights({
    sessionId: session.id,
    connection,
    artifacts: session.artifacts ?? [],
    onArtifactsUpdated,
  });

  const generateLabel = insights.isGenerating
    ? "Generowanie…"
    : insights.activeTab === "summarize"
      ? "Streść"
      : "Generuj";

  return (
    <section className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Insights</h3>
          <p className="mt-1 text-xs text-slate-500">
            Local Qwen3 post-processing for this session
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          onClick={() => void insights.generate()}
          disabled={insights.isGenerating || session.status !== "closed"}
        >
          {generateLabel}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              insights.activeTab === tab.id
                ? "bg-slate-700 text-slate-100"
                : "border border-slate-700 text-slate-400 hover:bg-slate-800"
            }`}
            onClick={() => insights.setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {insights.activeTab === "summarize" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs transition ${
              insights.summaryFormat === "bullets"
                ? "bg-sky-900 text-sky-200"
                : "border border-slate-700 text-slate-400"
            }`}
            onClick={() => insights.setSummaryFormat("bullets")}
          >
            Bullet points
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs transition ${
              insights.summaryFormat === "narrative"
                ? "bg-sky-900 text-sky-200"
                : "border border-slate-700 text-slate-400"
            }`}
            onClick={() => insights.setSummaryFormat("narrative")}
          >
            Narracja
          </button>
        </div>
      ) : null}

      {insights.error ? (
        <p className="mt-3 text-sm text-rose-400">{insights.error}</p>
      ) : null}

      <div className="mt-4 min-h-[8rem] rounded-lg border border-slate-800 bg-slate-900 p-4">
        {insights.displayedText ? (
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {insights.displayedText}
          </pre>
        ) : (
          <p className="text-sm text-slate-500">
            {session.status !== "closed"
              ? "LLM insights are available after the session is closed."
              : insights.isGenerating
                ? "Waiting for model output…"
                : insights.activeTab === "summarize"
                  ? "No summary yet. Click Streść to generate one."
                  : "No result yet. Click Generuj to run local Qwen3 processing."}
          </p>
        )}
      </div>
    </section>
  );
}
