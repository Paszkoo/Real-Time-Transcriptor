import type {
  AppSettings,
  AppSettingsUpdateRequest,
  AudioDevice,
} from "@real-time-transcriptor/shared";
import { useEffect, useState } from "react";

interface SettingsAudioTabProps {
  settings: AppSettings;
  devices: AudioDevice[];
  isSaving: boolean;
  isCapturing: boolean;
  onPatch: (body: AppSettingsUpdateRequest) => Promise<boolean>;
}

interface SettingsNumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}

function SettingsNumberField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onCommit,
}: SettingsNumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <label>
      <span className="block text-sm text-slate-200">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const parsed = Number(draft);
          if (Number.isFinite(parsed) && parsed !== value) {
            onCommit(parsed);
            return;
          }
          setDraft(String(value));
        }}
      />
    </label>
  );
}

export function SettingsAudioTab({
  settings,
  devices,
  isSaving,
  isCapturing,
  onPatch,
}: SettingsAudioTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-200">Default microphone</label>
        <p className="mt-1 text-xs text-slate-500">
          Applied immediately when not recording. Changes take effect on the live capture screen
          without restarting the app.
        </p>
        <select
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
          value={settings.default_audio_device_id ?? ""}
          disabled={isSaving || isCapturing || devices.length === 0}
          onChange={(event) => {
            const value = event.target.value;
            void onPatch({
              default_audio_device_id: value === "" ? null : Number(value),
            });
          }}
        >
          <option value="">System default</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
              {device.is_default ? " (system default)" : ""}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950"
          checked={settings.save_session_audio}
          disabled={isSaving}
          onChange={(event) => void onPatch({ save_session_audio: event.target.checked })}
        />
        <span>
          <span className="block text-sm text-slate-200">Save session audio</span>
          <span className="mt-1 block text-xs text-slate-500">
            Store a local WAV file for each recording so timestamps can scrub playback.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsNumberField
          label="Sample rate (Hz)"
          value={settings.audio_sample_rate}
          min={8000}
          max={48000}
          step={1000}
          disabled={isSaving || isCapturing}
          onCommit={(value) => void onPatch({ audio_sample_rate: value })}
        />

        <SettingsNumberField
          label="Chunk duration (s)"
          value={settings.audio_chunk_duration_s}
          min={5}
          max={120}
          step={1}
          disabled={isSaving || isCapturing}
          onCommit={(value) => void onPatch({ audio_chunk_duration_s: value })}
        />

        <SettingsNumberField
          label="Chunk overlap (s)"
          value={settings.audio_chunk_overlap_s}
          min={0}
          max={30}
          step={0.5}
          disabled={isSaving || isCapturing}
          onCommit={(value) => void onPatch({ audio_chunk_overlap_s: value })}
        />
      </div>

      {isCapturing ? (
        <p className="text-xs text-amber-400">
          Stop recording to change sample rate, chunk size, or overlap.
        </p>
      ) : null}

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950"
            checked={settings.vad_enabled}
            disabled={isSaving || isCapturing}
            onChange={(event) => void onPatch({ vad_enabled: event.target.checked })}
          />
          <span>
            <span className="block text-sm text-slate-200">Voice activity detection (VAD)</span>
            <span className="mt-1 block text-xs text-slate-500">
              Skip silent audio chunks before sending them to Whisper.
            </span>
          </span>
        </label>

        <label className="mt-4 block">
          <span className="text-sm text-slate-200">VAD threshold</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            className="mt-2 w-full accent-sky-500"
            value={settings.vad_threshold}
            disabled={isSaving || isCapturing || !settings.vad_enabled}
            onChange={(event) => void onPatch({ vad_threshold: Number(event.target.value) })}
          />
          <span className="mt-1 block text-xs text-slate-500">
            Current: {settings.vad_threshold.toFixed(2)}
          </span>
        </label>
      </div>
    </div>
  );
}
