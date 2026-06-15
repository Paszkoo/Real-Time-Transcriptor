import type {
  AppSettings,
  AppSettingsUpdateRequest,
  OllamaModelsResponse,
  TranscriptionLanguage,
  WhisperModelsResponse,
} from "@real-time-transcriptor/shared";
import { TRANSCRIPTION_LANGUAGE_OPTIONS } from "@real-time-transcriptor/shared";

interface SettingsModelsTabProps {
  settings: AppSettings;
  whisperModels: WhisperModelsResponse | null;
  ollamaModels: OllamaModelsResponse | null;
  isSaving: boolean;
  isCapturing: boolean;
  onPatch: (body: AppSettingsUpdateRequest) => Promise<boolean>;
  onRefreshOllama: () => void;
  isRefreshingOllama: boolean;
}

export function SettingsModelsTab({
  settings,
  whisperModels,
  ollamaModels,
  isSaving,
  isCapturing,
  onPatch,
  onRefreshOllama,
  isRefreshingOllama,
}: SettingsModelsTabProps) {
  const activeWhisper = whisperModels?.models.find(
    (model) => model.id === settings.whisper_model_name,
  );

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-200">
          Whisper transcription model
        </label>
        <p className="mt-1 text-xs text-slate-500">
          The new model loads on the next recording session. It does not switch during an active
          session.
        </p>
        <select
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
          value={settings.whisper_model_name}
          disabled={isSaving || !whisperModels}
          onChange={(event) => void onPatch({ whisper_model_name: event.target.value })}
        >
          {(whisperModels?.models ?? []).map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} · ~{model.size_gb} GB disk
              {model.vram_gb ? ` · ~${model.vram_gb} GB VRAM` : ""}
            </option>
          ))}
        </select>
        {activeWhisper ? (
          <p className="mt-2 text-xs text-slate-500">
            Selected: {activeWhisper.label}. Approx. {activeWhisper.size_gb} GB on disk
            {activeWhisper.vram_gb ? `, ${activeWhisper.vram_gb} GB VRAM recommended.` : "."}
          </p>
        ) : null}
        {isCapturing ? (
          <p className="mt-2 text-xs text-amber-400">
            Finish the current session to apply a different Whisper model.
          </p>
        ) : null}
      </div>

      <label>
        <span className="block text-sm font-medium text-slate-200">Inference device</span>
        <select
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={settings.device}
          disabled={isSaving}
          onChange={(event) =>
            void onPatch({ device: event.target.value as AppSettings["device"] })
          }
        >
          <option value="cpu">CPU</option>
          <option value="cuda">CUDA (GPU)</option>
        </select>
      </label>

      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-slate-200">Ollama LLM model</label>
          <button
            type="button"
            className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50"
            onClick={onRefreshOllama}
            disabled={isRefreshingOllama}
          >
            {isRefreshingOllama ? "Refreshing…" : "Refresh list"}
          </button>
        </div>
        {!ollamaModels?.available ? (
          <p className="mt-2 text-xs text-amber-400">
            Ollama is not reachable. Start Ollama locally to list installed models.
          </p>
        ) : null}
        <select
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
          value={settings.ollama_model}
          disabled={isSaving || !ollamaModels?.available}
          onChange={(event) => void onPatch({ ollama_model: event.target.value })}
        >
          {ollamaModels?.models.length ? (
            ollamaModels.models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))
          ) : (
            <option value={settings.ollama_model}>{settings.ollama_model}</option>
          )}
        </select>
      </div>

      <label>
        <span className="block text-sm font-medium text-slate-200">
          Default transcription language
        </span>
        <select
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={settings.transcription_language}
          disabled={isSaving}
          onChange={(event) =>
            void onPatch({
              transcription_language: event.target.value as TranscriptionLanguage,
            })
          }
        >
          {TRANSCRIPTION_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
