import type { AudioCaptureState } from "../hooks/useAudioCapture";

interface AudioCapturePanelProps {
  backendOnline: boolean;
  capture: AudioCaptureState;
}

export function AudioCapturePanel({ backendOnline, capture }: AudioCapturePanelProps) {
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
    handleStopCapture,
  } = capture;

  const isCapturing = captureStatus?.is_capturing ?? false;
  const activeDevice = devices.find((device) => device.id === captureStatus?.device_id);
  const activeLabel = activeDevice?.name ?? captureStatus?.device_name ?? null;
  const canStart = backendOnline && !isCapturing && selectedDeviceId !== null && !isSubmitting;
  const canStop = backendOnline && isCapturing && !isSubmitting;

  return (
    <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-200">Audio input</p>
          <p className="mt-1 text-xs text-slate-500">
            Choose a microphone and start capture. Chunks are logged in the backend console.
          </p>
        </div>
        {isCapturing ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
            Recording
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
          {captureStatus?.source_type ? (
            <span className="text-slate-500"> · {captureStatus.source_type}</span>
          ) : null}
          {captureStatus ? (
            <span className="text-slate-500">
              {" "}
              · {captureStatus.chunks_emitted} chunks emitted
              {captureStatus.chunks_filtered > 0
                ? ` · ${captureStatus.chunks_filtered} filtered by VAD`
                : ""}
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="flex-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void handleStartCapture()}
          disabled={!canStart}
        >
          Start
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void handleStopCapture()}
          disabled={!canStop}
        >
          Stop
        </button>
      </div>

      {!backendOnline ? (
        <p className="mt-3 text-xs text-amber-400">Connect to the backend to manage audio devices.</p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
    </section>
  );
}
