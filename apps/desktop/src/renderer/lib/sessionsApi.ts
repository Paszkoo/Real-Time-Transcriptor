import {
  type AppSettings,
  type AppSettingsUpdateRequest,
  type SessionDetail,
  type SessionsListResponse,
} from "@real-time-transcriptor/shared";

import {
  fetchBackendJson,
  getBackendBaseUrl,
  type BackendConnection,
} from "./backendApi";

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
