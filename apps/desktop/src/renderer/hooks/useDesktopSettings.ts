import type { DesktopSettings, SettingsTab } from "@real-time-transcriptor/shared";
import { useCallback, useEffect, useState } from "react";

export function useDesktopSettings() {
  const [desktopSettings, setDesktopSettings] = useState<DesktopSettings | null>(null);

  const refreshDesktopSettings = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.getDesktopSettings) {
      setDesktopSettings({ last_settings_tab: "audio" });
      return;
    }

    const settings = await api.getDesktopSettings();
    setDesktopSettings(settings);
  }, []);

  useEffect(() => {
    void refreshDesktopSettings();
  }, [refreshDesktopSettings]);

  const setLastSettingsTab = useCallback(async (tab: SettingsTab) => {
    const api = window.electronAPI;
    if (!api?.patchDesktopSettings) {
      setDesktopSettings({ last_settings_tab: tab });
      return;
    }

    const settings = await api.patchDesktopSettings({ last_settings_tab: tab });
    setDesktopSettings(settings);
  }, []);

  return {
    desktopSettings,
    setLastSettingsTab,
    refreshDesktopSettings,
  };
}
