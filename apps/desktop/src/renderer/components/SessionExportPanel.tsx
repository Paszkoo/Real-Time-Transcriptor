import type { SessionDetail, SessionExportFormat } from "@real-time-transcriptor/shared";
import { useEffect, useState } from "react";

import { type BackendConnection } from "../lib/backendApi";
import { fetchSessionExport, SESSION_EXPORT_FORMATS } from "../lib/sessionsApi";

interface SessionExportPanelProps {
  session: SessionDetail;
  connection: BackendConnection;
  defaultExportFormats: SessionExportFormat[];
}

const FORMAT_LABELS = new Map(
  SESSION_EXPORT_FORMATS.map((format) => [format.id, format.label] as const),
);

interface ExportRunResult {
  savedPaths: string[];
  canceledCount: number;
  errorMessage: string | null;
}

async function exportSelectedFormats(
  session: SessionDetail,
  connection: BackendConnection,
  selectedFormats: SessionExportFormat[],
  saveExportFile: NonNullable<Window["electronAPI"]>["saveExportFile"],
): Promise<ExportRunResult> {
  const savedPaths: string[] = [];
  let canceledCount = 0;

  for (const format of selectedFormats) {
    const result = await fetchSessionExport(connection, session.id, format);
    if (!result.ok) {
      return {
        savedPaths,
        canceledCount,
        errorMessage: result.error.message,
      };
    }

    const formatOption = SESSION_EXPORT_FORMATS.find((entry) => entry.id === format);
    const saveResult = await saveExportFile({
      defaultPath: result.filename,
      filters: [
        {
          name: formatOption?.filterName ?? format.toUpperCase(),
          extensions: [formatOption?.extension ?? format],
        },
      ],
      data: result.data,
    });

    if (saveResult.canceled) {
      canceledCount += 1;
      continue;
    }

    if (saveResult.filePath) {
      savedPaths.push(saveResult.filePath);
    }
  }

  return { savedPaths, canceledCount, errorMessage: null };
}

export function SessionExportPanel({
  session,
  connection,
  defaultExportFormats,
}: SessionExportPanelProps) {
  const [selectedFormats, setSelectedFormats] =
    useState<SessionExportFormat[]>(defaultExportFormats);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedFormats(defaultExportFormats);
  }, [defaultExportFormats]);

  const canExport = session.segments.length > 0 && selectedFormats.length > 0 && !isExporting;

  const toggleFormat = (format: SessionExportFormat) => {
    setSelectedFormats((current) =>
      current.includes(format) ? current.filter((entry) => entry !== format) : [...current, format],
    );
  };

  const handleExport = async () => {
    if (!canExport) {
      return;
    }

    const electronApi = window.electronAPI;
    if (!electronApi?.saveExportFile) {
      setErrorMessage("Export save dialog is unavailable in this environment.");
      return;
    }

    setIsExporting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await exportSelectedFormats(
        session,
        connection,
        selectedFormats,
        electronApi.saveExportFile,
      );

      if (result.errorMessage) {
        if (result.savedPaths.length > 0) {
          setStatusMessage(`Saved ${result.savedPaths.length} file(s) before the error.`);
        }
        setErrorMessage(result.errorMessage);
        return;
      }

      if (result.savedPaths.length === 0 && result.canceledCount > 0) {
        setStatusMessage("Export canceled.");
        return;
      }

      if (result.savedPaths.length === 1) {
        setStatusMessage(`Saved to ${result.savedPaths[0]}`);
        return;
      }

      setStatusMessage(`Saved ${result.savedPaths.length} files.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Export</h3>
          <p className="mt-1 text-xs text-slate-500">
            Download this session as PDF, document, subtitles, or raw data.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          onClick={() => void handleExport()}
          disabled={!canExport}
        >
          {isExporting ? "Exporting…" : "Export"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {SESSION_EXPORT_FORMATS.map((format) => {
          const checked = selectedFormats.includes(format.id);
          return (
            <label
              key={format.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200"
            >
              <input
                type="checkbox"
                className="accent-sky-500"
                checked={checked}
                onChange={() => toggleFormat(format.id)}
                disabled={isExporting}
              />
              {format.label}
            </label>
          );
        })}
      </div>

      {session.segments.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Add transcript segments before exporting.</p>
      ) : null}

      {selectedFormats.length === 0 ? (
        <p className="mt-3 text-xs text-amber-400">Select at least one format.</p>
      ) : null}

      {statusMessage ? <p className="mt-3 text-xs text-emerald-400">{statusMessage}</p> : null}
      {errorMessage ? <p className="mt-3 text-xs text-rose-400">{errorMessage}</p> : null}

      {selectedFormats.length > 1 ? (
        <p className="mt-3 text-xs text-slate-500">
          Selected: {selectedFormats.map((format) => FORMAT_LABELS.get(format)).join(", ")}
        </p>
      ) : null}
    </section>
  );
}
