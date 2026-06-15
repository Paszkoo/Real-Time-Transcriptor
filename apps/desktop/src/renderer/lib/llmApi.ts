import {
  type LlmTask,
  type ProcessSessionRequest,
  type ProcessSessionResponse,
  type SummaryFormat,
} from "@real-time-transcriptor/shared";

import {
  fetchBackendJson,
  getBackendBaseUrl,
  type BackendConnection,
} from "./backendApi";

export type LlmStreamEvent =
  | { type: "token"; content: string }
  | { type: "done"; content: string }
  | { type: "error"; code: string; message: string };

type InsightsTab = "correct" | "summarize" | "todos";

const TAB_LLM_CONFIG: Record<
  InsightsTab,
  { task: LlmTask; artifactType: (summaryFormat: SummaryFormat) => string }
> = {
  correct: {
    task: "correct",
    artifactType: () => "correct",
  },
  summarize: {
    task: "summarize",
    artifactType: (summaryFormat) => `summarize_${summaryFormat}`,
  },
  todos: {
    task: "extract_todos",
    artifactType: () => "extract_todos",
  },
};

export async function startSessionProcessing(
  connection: BackendConnection,
  sessionId: string,
  body: ProcessSessionRequest,
) {
  return fetchBackendJson<ProcessSessionResponse>(
    connection,
    `/api/sessions/${sessionId}/process`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export function getLlmWebSocketUrl(connection: BackendConnection, jobId: string) {
  const baseUrl = getBackendBaseUrl(connection);
  const wsBase = baseUrl.startsWith("https://")
    ? baseUrl.replace(/^https:/, "wss:")
    : baseUrl.replace(/^http:/, "ws:");
  return `${wsBase}/ws/llm/${jobId}`;
}

export function connectLlmStream(
  connection: BackendConnection,
  jobId: string,
  handlers: {
    onToken: (content: string) => void;
    onDone: (content: string) => void;
    onError: (code: string, message: string) => void;
  },
): WebSocket {
  const socket = new WebSocket(getLlmWebSocketUrl(connection, jobId));

  socket.onmessage = (event) => {
    let payload: LlmStreamEvent;
    try {
      payload = JSON.parse(String(event.data)) as LlmStreamEvent;
    } catch {
      handlers.onError("llm_error", "Received invalid LLM stream data.");
      socket.close();
      return;
    }

    if (payload.type === "token") {
      handlers.onToken(payload.content);
    } else if (payload.type === "done") {
      handlers.onDone(payload.content);
      socket.close();
    } else if (payload.type === "error") {
      handlers.onError(payload.code, payload.message);
      socket.close();
    }
  };

  socket.onerror = () => {
    handlers.onError("network_error", "LLM stream connection failed.");
  };

  return socket;
}

export function artifactTypeForTab(tab: InsightsTab, summaryFormat: SummaryFormat): string {
  return TAB_LLM_CONFIG[tab].artifactType(summaryFormat);
}

export function taskForTab(tab: InsightsTab): LlmTask {
  return TAB_LLM_CONFIG[tab].task;
}
