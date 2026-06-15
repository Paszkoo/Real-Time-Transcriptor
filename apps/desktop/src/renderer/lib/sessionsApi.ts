import {
  type ApiErrorResponse,
  type SessionDetail,
  type SessionExportFormat,
  type SessionsListResponse,
} from "@real-time-transcriptor/shared";

import {
  fetchBackendArrayBuffer,
  fetchBackendJson,
  getBackendBaseUrl,
  type BackendConnection,
} from "./backendApi";

export type { SessionExportFormat };

export interface SessionExportFormatOption {
  id: SessionExportFormat;
  label: string;
  extension: string;
  filterName: string;
}

export const SESSION_EXPORT_FORMATS: SessionExportFormatOption[] = [
  { id: "pdf", label: "PDF", extension: "pdf", filterName: "PDF Document" },
  { id: "docx", label: "DOCX", extension: "docx", filterName: "Word Document" },
  { id: "txt", label: "TXT", extension: "txt", filterName: "Plain Text" },
  { id: "srt", label: "SRT", extension: "srt", filterName: "SubRip Subtitles" },
  { id: "vtt", label: "VTT", extension: "vtt", filterName: "WebVTT Subtitles" },
  { id: "json", label: "JSON", extension: "json", filterName: "JSON Data" },
];

export async function fetchSessions(connection: BackendConnection) {
  return fetchBackendJson<SessionsListResponse>(connection, "/api/sessions");
}

export async function searchSessions(connection: BackendConnection, query: string) {
  const encoded = encodeURIComponent(query);
  return fetchBackendJson<SessionsListResponse>(connection, `/api/sessions/search?q=${encoded}`);
}

export async function fetchSession(connection: BackendConnection, sessionId: string) {
  return fetchBackendJson<SessionDetail>(connection, `/api/sessions/${sessionId}`);
}

export async function deleteSession(connection: BackendConnection, sessionId: string) {
  return fetchBackendJson<void>(connection, `/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export function getSessionAudioUrl(connection: BackendConnection, audioPath: string | null) {
  if (!audioPath) {
    return null;
  }
  return `${getBackendBaseUrl(connection)}${audioPath}`;
}

function parseContentDispositionFilename(disposition: string, fallback: string): string {
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // Fall through to ASCII filename.
    }
  }

  const asciiMatch = disposition.match(/filename="([^"]+)"/i);
  return asciiMatch?.[1] ?? fallback;
}

export async function fetchSessionExport(
  connection: BackendConnection,
  sessionId: string,
  format: SessionExportFormat,
): Promise<
  { ok: true; data: ArrayBuffer; filename: string } | { ok: false; error: ApiErrorResponse }
> {
  const path = `/api/sessions/${sessionId}/export?format=${encodeURIComponent(format)}`;
  const result = await fetchBackendArrayBuffer(connection, path);

  if (!result.ok) {
    return result;
  }

  const filename = parseContentDispositionFilename(
    result.contentDisposition ?? "",
    `${sessionId}.${format}`,
  );
  return { ok: true, data: result.data, filename };
}
