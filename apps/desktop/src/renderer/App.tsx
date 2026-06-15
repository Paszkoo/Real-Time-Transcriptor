import { useBackendHealth, type BackendStatus } from "./hooks/useBackendHealth";
import { useSetupState } from "./hooks/useSetupState";

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

export function App() {
  const { status, health } = useBackendHealth();
  const setupUi = useSetupState();

  const isPulsing = status === "checking" || status === "restarting";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Real-Time Transcriptor
        </h1>
        <p className="mt-2 text-slate-400">
          Local transcription workspace — development scaffold
        </p>
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
    </main>
  );
}
