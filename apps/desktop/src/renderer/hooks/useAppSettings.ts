import type { AppSettings } from "@real-time-transcriptor/shared";
import { useCallback, useEffect, useState } from "react";

import { resolveBackendConnection } from "../lib/backendApi";
import { fetchSettings, updateSettings } from "../lib/sessionsApi";

export function useAppSettings(backendOnline: boolean) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    if (!backendOnline) {
      setSettings(null);
      return;
    }

    const connection = await resolveBackendConnection();
    const result = await fetchSettings(connection);
    if (!result.ok) {
      setError(result.error?.message ?? "Could not load settings.");
      return;
    }

    setSettings(result.data);
    setError(null);
  }, [backendOnline]);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  const setSaveSessionAudio = useCallback(async (enabled: boolean) => {
    setIsSaving(true);
    setError(null);

    const connection = await resolveBackendConnection();
    const result = await updateSettings(connection, { save_session_audio: enabled });

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error?.message ?? "Could not update settings.");
      return false;
    }

    setSettings(result.data);
    return true;
  }, []);

  return {
    settings,
    isSaving,
    error,
    setSaveSessionAudio,
    refreshSettings,
  };
}
