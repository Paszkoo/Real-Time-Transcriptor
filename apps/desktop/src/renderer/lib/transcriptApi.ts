import { type UpdateSpeakerRequest, type Speaker } from "@real-time-transcriptor/shared";

import { fetchBackendJson, getWebSocketUrl, type BackendConnection } from "./backendApi";

export function getTranscriptWebSocketUrl(connection: BackendConnection, sessionId: string) {
  return getWebSocketUrl(connection, `/ws/transcript/${sessionId}`);
}

export async function updateSpeakerLabel(
  connection: BackendConnection,
  sessionId: string,
  speakerId: string,
  body: UpdateSpeakerRequest,
) {
  return fetchBackendJson<Speaker>(connection, `/api/sessions/${sessionId}/speakers/${speakerId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
