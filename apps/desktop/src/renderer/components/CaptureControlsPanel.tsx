import { type AudioCaptureState } from "../hooks/useAudioCapture";
import { RecordingStatusBar } from "./RecordingStatusBar";

interface CaptureControlsPanelProps {
  backendOnline: boolean;
  capture: AudioCaptureState;
  extraError?: string | null;
  onTogglePauseResume: () => void;
  onRequestStop: () => void;
}

export function CaptureControlsPanel({
  backendOnline,
  capture,
  extraError,
  onTogglePauseResume,
  onRequestStop,
}: CaptureControlsPanelProps) {
  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    captureStatus,
    isRefreshing,
    isSubmitting,
    error,
    refreshDevices,
    handleStartCapture,
  } = capture;

  const isCapturing = captureStatus?.is_capturing ?? false;
  const isPaused = captureStatus?.is_paused ?? false;
  const activeDevice = devices.find((device) => device.id === captureStatus?.device_id);
  const activeLabel = activeDevice?.name ?? captureStatus?.device_name ?? null;

  const canStart = backendOnline && !isCapturing && selectedDeviceId !== null && !isSubmitting;
  const canPause = backendOnline && isCapturing && !isPaused && !isSubmitting;
  const canResume = backendOnline && isCapturing && isPaused && !isSubmitting;
  const canStop = backendOnline && isCapturing && !isSubmitting;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-200">Audio input</p>
          <p className="mt-1 text-xs text-slate-500">
            Start recording to transcribe speech in real time.
          </p>
        </div>
        {isCapturing ? (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              isPaused ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isPaused ? "bg-amber-400" : "animate-pulse bg-emerald-400"
              }`}
              aria-hidden="true"
            />
            {isPaused ? "Paused" : "Recording"}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Microphone</span>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedDeviceId ?? ""}
            onChange={(event) => setSelectedDeviceId(Number(event.target.value))}
            disabled={!backendOnline || isCapturing || devices.length === 0}
          >
            {devices.length === 0 ? (
              <option value="">No microphones found</option>
            ) : (
              devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                  {device.is_default ? " (default)" : ""}
                </option>
              ))
            )}
          </select>
        </label>

        <button
          type="button"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void refreshDevices()}
          disabled={!backendOnline || isRefreshing || isCapturing}
        >
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {activeLabel ? (
        <p className="mt-3 text-xs text-slate-400">
          Active input: <span className="text-slate-200">{activeLabel}</span>
        </p>
      ) : null}

      {captureStatus && isCapturing ? (
        <div className="mt-4">
          <RecordingStatusBar captureStatus={captureStatus} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="min-w-[96px] flex-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void handleStartCapture()}
          disabled={!canStart}
        >
          Start
        </button>
        <button
          type="button"
          className="min-w-[96px] flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onTogglePauseResume}
          disabled={!canPause && !canResume}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          className="min-w-[96px] flex-1 rounded-lg border border-rose-800/80 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-950 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onRequestStop}
          disabled={!canStop}
        >
          Stop
        </button>
      </div>

      {isCapturing ? (
        <p className="mt-3 text-xs text-slate-500">
          Shortcuts: <span className="text-slate-400">Space</span> pause/resume ·{" "}
          <span className="text-slate-400">Esc</span> stop
        </p>
      ) : null}

      {!backendOnline ? (
        <p className="mt-3 text-xs text-amber-400">
          Connect to the backend to manage audio devices.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {extraError ? <p className="mt-3 text-sm text-rose-400">{extraError}</p> : null}
    </section>
  );
}
