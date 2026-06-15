import { useEffect, useRef, useState } from "react";

import { LiveCaptureView } from "./components/LiveCaptureView";
import { SessionDetailView } from "./components/SessionDetailView";
import { SessionHistoryPanel } from "./components/SessionHistoryPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { useAppSettings } from "./hooks/useAppSettings";
import { useAppView } from "./hooks/useAppView";
import { useAudioCapture } from "./hooks/useAudioCapture";
import { useBackendHealth, type BackendStatus } from "./hooks/useBackendHealth";
import { useSessionDetail } from "./hooks/useSessionDetail";
import { useSessions } from "./hooks/useSessions";
import { useSetupState } from "./hooks/useSetupState";
import { resolveBackendConnection, type BackendConnection } from "./lib/backendApi";

const STATUS_LABEL: Record<BackendStatus, string> = {
  online: "Backend online",
  restarting: "Backend restarting…",
  offline: "Backend offline",
  checking: "Checking backend…",
};

const STATUS_COLOR: Record<BackendStatus, string> = {
  online: "bg-emerald-500",
  offline: "bg-rose-500",
  restarting: "bg-amber-400",
  checking: "bg-amber-400",
};

const NAV_ITEMS = [
  ["live", "Live capture"],
  ["history", "History"],
  ["settings", "Settings"],
] as const;

export function App() {
  const { status, health } = useBackendHealth();
  const setupUi = useSetupState();
  const backendOnline = status === "online";
  const audioCapture = useAudioCapture(backendOnline);
  const sessionsState = useSessions(backendOnline);
  const appSettings = useAppSettings(backendOnline);
  const appView = useAppView();

  const [backendConnection, setBackendConnection] = useState<BackendConnection | null>(null);
  const sessionDetail = useSessionDetail(backendOnline, appView.selectedSessionId);

  const isPulsing = status === "checking" || status === "restarting";
  const isCapturing = audioCapture.captureStatus?.is_capturing ?? false;
  const previousCapturingRef = useRef(isCapturing);

  useEffect(() => {
    if (!backendOnline) {
      setBackendConnection(null);
      return;
    }

    void resolveBackendConnection().then(setBackendConnection);
  }, [backendOnline]);

  const { refreshSessions } = sessionsState;

  useEffect(() => {
    if (previousCapturingRef.current && !isCapturing) {
      void refreshSessions();
    }
    previousCapturingRef.current = isCapturing;
  }, [isCapturing, refreshSessions]);

  const handleDeleteSession = async (sessionId: string) => {
    const deleted = await sessionsState.handleDeleteSession(sessionId);
    appView.handleDeletedSession(sessionId, deleted);
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Real-Time Transcriptor</h1>
        <p className="mt-2 text-slate-400">Local transcription workspace</p>
      </div>

      <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900 px-5 py-3 shadow-lg">
        <span
          className={`h-3 w-3 rounded-full ${STATUS_COLOR[status]} ${isPulsing ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />
        <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
        {health ? (
          <span className="text-xs text-slate-500">v{health.backend_version}</span>
        ) : null}
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-2">
        {NAV_ITEMS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              appView.view === id
                ? "bg-sky-600 text-white"
                : "border border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
            onClick={() => appView.setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {setupUi.status === "running" ? (
        <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm font-medium text-slate-200">First-run model setup</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-300"
              style={{ width: `${setupUi.progress.percent}%` }}
            />
          </div>
          <p className="mt-2 truncate text-xs text-slate-400">{setupUi.progress.message}</p>
        </section>
      ) : null}

      {setupUi.status === "error" ? (
        <p className="max-w-lg text-center text-sm text-rose-400">{setupUi.progress.message}</p>
      ) : null}

      {setupUi.status === "skipped" && setupUi.hint ? (
        <p className="max-w-lg text-center text-xs text-slate-500">{setupUi.hint}</p>
      ) : null}

      {appView.view === "live" ? (
        <LiveCaptureView
          backendOnline={backendOnline}
          connection={backendConnection}
          capture={audioCapture}
        />
      ) : null}

      {appView.view === "history" ? (
        <SessionHistoryPanel
          sessions={sessionsState.sessions}
          searchQuery={sessionsState.searchQuery}
          isLoading={sessionsState.isLoading}
          error={sessionsState.error}
          onSearchQueryChange={sessionsState.setSearchQuery}
          onRefresh={() => void sessionsState.refreshSessions()}
          onOpenSession={appView.openSession}
          onDeleteSession={(sessionId) => void handleDeleteSession(sessionId)}
        />
      ) : null}

      {appView.view === "session" && sessionDetail.session && backendConnection ? (
        <SessionDetailView
          session={sessionDetail.session}
          connection={backendConnection}
          onBack={appView.closeSessionView}
          onArtifactsUpdated={() => void sessionDetail.refreshSession()}
        />
      ) : null}

      {appView.view === "session" && sessionDetail.isLoading ? (
        <p className="text-sm text-slate-400">Loading session…</p>
      ) : null}

      {appView.view === "session" && sessionDetail.error ? (
        <p className="text-sm text-rose-400">{sessionDetail.error}</p>
      ) : null}

      {appView.view === "settings" ? (
        <SettingsPanel
          saveSessionAudio={appSettings.settings?.save_session_audio ?? false}
          isSaving={appSettings.isSaving}
          error={appSettings.error}
          onToggleSaveSessionAudio={(enabled) => void appSettings.setSaveSessionAudio(enabled)}
        />
      ) : null}
    </main>
  );
}
