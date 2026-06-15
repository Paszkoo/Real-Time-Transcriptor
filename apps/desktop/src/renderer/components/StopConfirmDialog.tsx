interface StopConfirmDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function StopConfirmDialog({
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: StopConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stop-recording-title"
      >
        <h3 id="stop-recording-title" className="text-lg font-semibold text-slate-100">
          Stop recording?
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          The session will be saved to history. You can review the full transcript there.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-50"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Stopping…" : "Stop and save"}
          </button>
        </div>
      </div>
    </div>
  );
}
