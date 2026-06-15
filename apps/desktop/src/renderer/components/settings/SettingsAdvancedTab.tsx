import type { DiagnosticsCheckResponse, DiagnosticsInfo } from "@real-time-transcriptor/shared";
import { useCallback, useEffect, useState } from "react";

import { resolveBackendConnection } from "../../lib/backendApi";
import { fetchDiagnostics, runDiagnosticsCheck } from "../../lib/settingsApi";

interface SettingsAdvancedTabProps {
  backendOnline: boolean;
}

function formatMegabytes(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "n/a";
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} GB`;
  }
  return `${value} MB`;
}

export function SettingsAdvancedTab({ backendOnline }: SettingsAdvancedTabProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null);
  const [checkResult, setCheckResult] = useState<DiagnosticsCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDiagnostics = useCallback(async () => {
    if (!backendOnline) {
      setDiagnostics(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    const connection = await resolveBackendConnection();
    const result = await fetchDiagnostics(connection);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error?.message ?? "Could not load diagnostics.");
      return;
    }

    setDiagnostics(result.data);
  }, [backendOnline]);

  useEffect(() => {
    void refreshDiagnostics();
  }, [refreshDiagnostics]);

  const handleCheckIssues = async () => {
    if (!backendOnline) {
      return;
    }

    setIsChecking(true);
    setError(null);
    const connection = await resolveBackendConnection();
    const result = await runDiagnosticsCheck(connection);
    setIsChecking(false);

    if (!result.ok) {
      setError(result.error?.message ?? "Diagnostics check failed.");
      return;
    }

    setCheckResult(result.data);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-200">System diagnostics</p>
        <p className="mt-1 text-xs text-slate-500">
          Versions, model status, GPU memory, and connectivity checks.
        </p>
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Loading diagnostics…</p> : null}

      {diagnostics ? (
        <dl className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">App version</dt>
            <dd className="text-slate-100">{diagnostics.app_version}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Backend version</dt>
            <dd className="text-slate-100">{diagnostics.backend_version}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Whisper model</dt>
            <dd className="text-slate-100">
              {diagnostics.whisper_model_name}
              {diagnostics.whisper_model_loaded ? " (loaded)" : " (idle)"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Ollama model</dt>
            <dd className="text-slate-100">
              {diagnostics.ollama_model}
              {diagnostics.ollama_available ? "" : " (offline)"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Inference device</dt>
            <dd className="text-slate-100">{diagnostics.device}</dd>
          </div>
          <div>
            <dt className="text-slate-500">VRAM</dt>
            <dd className="text-slate-100">
              {formatMegabytes(diagnostics.vram_free_mb)} free /{" "}
              {formatMegabytes(diagnostics.vram_total_mb)} total
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Audio inputs</dt>
            <dd className="text-slate-100">{diagnostics.audio_devices_count}</dd>
          </div>
        </dl>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          onClick={() => void handleCheckIssues()}
          disabled={!backendOnline || isChecking}
        >
          {isChecking ? "Checking…" : "Check for issues"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          onClick={() => void refreshDiagnostics()}
          disabled={!backendOnline || isLoading}
        >
          Refresh
        </button>
      </div>

      {checkResult ? (
        <ul className="space-y-2">
          {checkResult.issues.map((issue) => (
            <li
              key={`${issue.code}-${issue.message}`}
              className={`rounded-lg border px-3 py-2 text-sm ${
                issue.severity === "error"
                  ? "border-rose-800/60 bg-rose-950/40 text-rose-100"
                  : issue.severity === "warning"
                    ? "border-amber-800/60 bg-amber-950/30 text-amber-100"
                    : "border-slate-700 bg-slate-900 text-slate-200"
              }`}
            >
              <p className="font-medium">{issue.message}</p>
              <p className="mt-1 text-xs opacity-80">{issue.suggestion}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
