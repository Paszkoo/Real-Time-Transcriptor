interface SettingsPanelProps {
  saveSessionAudio: boolean;
  isSaving: boolean;
  error: string | null;
  onToggleSaveSessionAudio: (enabled: boolean) => void;
}

export function SettingsPanel({
  saveSessionAudio,
  isSaving,
  error,
  onToggleSaveSessionAudio,
}: SettingsPanelProps) {
  return (
    <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm font-medium text-slate-200">Settings</p>
      <p className="mt-1 text-xs text-slate-500">
        Control how sessions are stored on this device.
      </p>

      <label className="mt-4 flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950"
          checked={saveSessionAudio}
          disabled={isSaving}
          onChange={(event) => onToggleSaveSessionAudio(event.target.checked)}
        />
        <span>
          <span className="block text-sm text-slate-200">Save session audio</span>
          <span className="mt-1 block text-xs text-slate-500">
            Store a local WAV file for each recording so timestamps can scrub playback.
          </span>
        </span>
      </label>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
    </section>
  );
}
