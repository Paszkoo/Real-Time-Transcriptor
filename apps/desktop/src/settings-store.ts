import Store from "electron-store";

import type {
  DesktopSettings,
  DesktopSettingsUpdateRequest,
  SettingsTab,
} from "@real-time-transcriptor/shared";

const DEFAULT_DESKTOP_SETTINGS: DesktopSettings = {
  last_settings_tab: "audio",
};

const store = new Store<DesktopSettings>({
  name: "desktop-settings",
  defaults: DEFAULT_DESKTOP_SETTINGS,
});

function isSettingsTab(value: unknown): value is SettingsTab {
  return value === "audio" || value === "models" || value === "export" || value === "advanced";
}

export function getDesktopSettings(): DesktopSettings {
  const tab = store.get("last_settings_tab");
  return {
    last_settings_tab: isSettingsTab(tab) ? tab : DEFAULT_DESKTOP_SETTINGS.last_settings_tab,
  };
}

export function patchDesktopSettings(update: DesktopSettingsUpdateRequest): DesktopSettings {
  if (update.last_settings_tab !== undefined) {
    store.set("last_settings_tab", update.last_settings_tab);
  }
  return getDesktopSettings();
}
