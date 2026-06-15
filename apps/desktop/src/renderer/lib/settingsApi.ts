import type {
  AppSettings,
  AppSettingsUpdateRequest,
  DiagnosticsCheckResponse,
  DiagnosticsInfo,
  OllamaModelsResponse,
  WhisperModelsResponse,
} from "@real-time-transcriptor/shared";

import { fetchBackendJson, type BackendConnection } from "./backendApi";

async function resolveAppVersionHeader(): Promise<Record<string, string>> {
  const version = await window.electronAPI?.getAppVersion?.();
  if (!version) {
    return {};
  }
  return { "X-App-Version": version };
}

export async function fetchSettings(connection: BackendConnection) {
  return fetchBackendJson<AppSettings>(connection, "/api/settings");
}

export async function updateSettings(
  connection: BackendConnection,
  body: AppSettingsUpdateRequest,
) {
  return fetchBackendJson<AppSettings>(connection, "/api/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchWhisperModels(connection: BackendConnection) {
  return fetchBackendJson<WhisperModelsResponse>(connection, "/api/settings/whisper-models");
}

export async function fetchOllamaModels(connection: BackendConnection) {
  return fetchBackendJson<OllamaModelsResponse>(connection, "/api/settings/ollama/models");
}

export async function fetchDiagnostics(connection: BackendConnection) {
  const headers = await resolveAppVersionHeader();
  return fetchBackendJson<DiagnosticsInfo>(connection, "/api/settings/diagnostics", { headers });
}

export async function runDiagnosticsCheck(connection: BackendConnection) {
  const headers = await resolveAppVersionHeader();
  return fetchBackendJson<DiagnosticsCheckResponse>(connection, "/api/settings/diagnostics/check", {
    method: "POST",
    headers,
  });
}
