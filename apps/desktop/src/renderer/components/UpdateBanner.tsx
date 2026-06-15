import { useEffect, useState } from "react";

import type { UpdateProgressEvent, UpdateStatus } from "../electron-api.types";

export function UpdateBanner() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [progress, setProgress] = useState<UpdateProgressEvent | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) {
      return;
    }

    const unsubscribers = [
      api.onUpdateStatus((event) => {
        setUpdateStatus(event);
        if (event.status !== "ready" && event.status !== "available") {
          setProgress(null);
        }
      }),
      api.onUpdateProgress((event) => setProgress(event)),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, []);

  if (!updateStatus || updateStatus.status === "idle" || updateStatus.status === "checking") {
    return null;
  }

  if (updateStatus.status === "error") {
    return (
      <p className="max-w-lg text-center text-xs text-slate-500">
        Update check failed: {updateStatus.message}
      </p>
    );
  }

  if (updateStatus.status === "available") {
    return (
      <p className="max-w-lg text-center text-xs text-slate-400">
        Downloading update v{updateStatus.version}…
        {progress ? ` ${Math.round(progress.percent)}%` : null}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-800 bg-slate-900 px-4 py-2">
      <span className="text-xs text-slate-300">Update v{updateStatus.version} is ready.</span>
      <button
        type="button"
        className="rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-500"
        onClick={() => void window.electronAPI?.installAppUpdate()}
      >
        Restart to update
      </button>
    </div>
  );
}
