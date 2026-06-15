import type {
  AppSettings,
  AppSettingsUpdateRequest,
  AudioDevice,
  OllamaModelsResponse,
  SettingsTab,
  WhisperModelsResponse,
} from "@real-time-transcriptor/shared";
import { useCallback, useEffect, useState } from "react";

import { fetchDevices, resolveBackendConnection, type BackendConnection } from "../lib/backendApi";
import { fetchOllamaModels, fetchWhisperModels } from "../lib/settingsApi";
import { SettingsAdvancedTab } from "./settings/SettingsAdvancedTab";
import { SettingsAudioTab } from "./settings/SettingsAudioTab";
import { SettingsExportTab } from "./settings/SettingsExportTab";
import { SettingsModelsTab } from "./settings/SettingsModelsTab";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "audio", label: "Audio" },
  { id: "models", label: "Models" },
  { id: "export", label: "Export" },
  { id: "advanced", label: "Advanced" },
];

interface SettingsPanelProps {
  settings: AppSettings | null;
  activeTab: SettingsTab;
  isSaving: boolean;
  error: string | null;
  backendOnline: boolean;
  isCapturing: boolean;
  onTabChange: (tab: SettingsTab) => void;
  onPatch: (body: AppSettingsUpdateRequest) => Promise<boolean>;
}

async function fetchBackendData<T>(
  backendOnline: boolean,
  loader: (
    connection: BackendConnection,
  ) => Promise<{ ok: true; data: T } | { ok: false; error: unknown }>,
): Promise<T | null> {
  if (!backendOnline) {
    return null;
  }

  const connection = await resolveBackendConnection();
  const result = await loader(connection);
  return result.ok ? result.data : null;
}

export function SettingsPanel({
  settings,
  activeTab,
  isSaving,
  error,
  backendOnline,
  isCapturing,
  onTabChange,
  onPatch,
}: SettingsPanelProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [whisperModels, setWhisperModels] = useState<WhisperModelsResponse | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModelsResponse | null>(null);
  const [isRefreshingOllama, setIsRefreshingOllama] = useState(false);

  const refreshDevices = useCallback(async () => {
    const data = await fetchBackendData(backendOnline, fetchDevices);
    setDevices(data?.devices ?? []);
  }, [backendOnline]);

  const refreshWhisperModels = useCallback(async () => {
    const data = await fetchBackendData(backendOnline, fetchWhisperModels);
    setWhisperModels(data);
  }, [backendOnline]);

  const refreshOllamaModels = useCallback(async () => {
    if (!backendOnline) {
      setOllamaModels(null);
      return;
    }

    setIsRefreshingOllama(true);
    const data = await fetchBackendData(backendOnline, fetchOllamaModels);
    setIsRefreshingOllama(false);
    setOllamaModels(data);
  }, [backendOnline]);

  useEffect(() => {
    void refreshDevices();
    void refreshWhisperModels();
    void refreshOllamaModels();
  }, [refreshDevices, refreshOllamaModels, refreshWhisperModels]);

  return (
    <section className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm font-medium text-slate-200">Settings</p>
      <p className="mt-1 text-xs text-slate-500">
        Configure audio, models, export defaults, and diagnostics without editing files.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!backendOnline ? (
        <p className="mt-4 text-sm text-amber-400">
          Connect to the backend to load and save settings.
        </p>
      ) : null}

      {!settings && backendOnline ? (
        <p className="mt-4 text-sm text-slate-400">Loading settings…</p>
      ) : null}

      {settings && backendOnline ? (
        <div className="mt-4">
          {activeTab === "audio" ? (
            <SettingsAudioTab
              settings={settings}
              devices={devices}
              isSaving={isSaving}
              isCapturing={isCapturing}
              onPatch={onPatch}
            />
          ) : null}

          {activeTab === "models" ? (
            <SettingsModelsTab
              settings={settings}
              whisperModels={whisperModels}
              ollamaModels={ollamaModels}
              isSaving={isSaving}
              isCapturing={isCapturing}
              onPatch={onPatch}
              onRefreshOllama={() => void refreshOllamaModels()}
              isRefreshingOllama={isRefreshingOllama}
            />
          ) : null}

          {activeTab === "export" ? (
            <SettingsExportTab settings={settings} isSaving={isSaving} onPatch={onPatch} />
          ) : null}

          {activeTab === "advanced" ? <SettingsAdvancedTab backendOnline={backendOnline} /> : null}
        </div>
      ) : null}

      {isSaving ? <p className="mt-3 text-xs text-slate-500">Saving…</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
    </section>
  );
}
