import type {
  AppSettings,
  AppSettingsUpdateRequest,
  SessionExportFormat,
} from "@real-time-transcriptor/shared";

import { SESSION_EXPORT_FORMATS } from "../../lib/sessionsApi";

interface SettingsExportTabProps {
  settings: AppSettings;
  isSaving: boolean;
  onPatch: (body: AppSettingsUpdateRequest) => Promise<boolean>;
}

export function SettingsExportTab({ settings, isSaving, onPatch }: SettingsExportTabProps) {
  const toggleFormat = (format: SessionExportFormat) => {
    const current = settings.default_export_formats;
    const next = current.includes(format)
      ? current.filter((entry) => entry !== format)
      : [...current, format];

    if (next.length === 0) {
      return;
    }

    void onPatch({ default_export_formats: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-200">Default export formats</p>
        <p className="mt-1 text-xs text-slate-500">
          Pre-select these formats when exporting a session from history.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {SESSION_EXPORT_FORMATS.map((format) => {
          const checked = settings.default_export_formats.includes(format.id);
          return (
            <label
              key={format.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200"
            >
              <input
                type="checkbox"
                className="accent-sky-500"
                checked={checked}
                disabled={isSaving || (checked && settings.default_export_formats.length === 1)}
                onChange={() => toggleFormat(format.id)}
              />
              {format.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
