import {
  DEFAULT_BACKEND_PORT,
  type ApiErrorResponse,
  type CaptureStatusResponse,
  type DevicesListResponse,
} from "@real-time-transcriptor/shared";

export interface BackendConnection {
  host: string;
  port: number;
}

export async function resolveBackendConnection(): Promise<BackendConnection> {
  const api = window.electronAPI;
  if (!api) {
    return { host: "127.0.0.1", port: DEFAULT_BACKEND_PORT };
  }

  const [host, port] = await Promise.all([api.getBackendHost(), api.getBackendPort()]);
  return { host, port };
}

export function getBackendBaseUrl(connection: BackendConnection): string {
  return `http://${connection.host}:${connection.port}`;
}

export function getWebSocketUrl(connection: BackendConnection, path: string): string {
  const baseUrl = getBackendBaseUrl(connection);
  const wsBase = baseUrl.startsWith("https://")
    ? baseUrl.replace(/^https:/, "wss:")
    : baseUrl.replace(/^http:/, "ws:");
  return `${wsBase}${path}`;
}

const NETWORK_ERROR: ApiErrorResponse = {
  code: "network_error",
  message: "Could not reach the backend.",
};

async function readBackendError(
  response: Response,
  fallbackMessage: string,
): Promise<ApiErrorResponse> {
  try {
    const error = (await response.json()) as ApiErrorResponse;
    if (error.code && error.message) {
      return error;
    }
  } catch {
    // Fall through to generic error.
  }

  return {
    code: "request_failed",
    message: fallbackMessage,
  };
}

export async function fetchBackendArrayBuffer(
  connection: BackendConnection,
  path: string,
  init?: RequestInit,
): Promise<
  | { ok: true; data: ArrayBuffer; contentDisposition: string | null }
  | { ok: false; error: ApiErrorResponse }
> {
  try {
    const response = await fetch(`${getBackendBaseUrl(connection)}${path}`, init);

    if (!response.ok) {
      return {
        ok: false,
        error: await readBackendError(response, `Request failed with status ${response.status}.`),
      };
    }

    return {
      ok: true,
      data: await response.arrayBuffer(),
      contentDisposition: response.headers.get("Content-Disposition"),
    };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function fetchBackendJson<T>(
  connection: BackendConnection,
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: ApiErrorResponse | null }> {
  try {
    const response = await fetch(`${getBackendBaseUrl(connection)}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });

    if (response.ok) {
      if (response.status === 204) {
        return { ok: true, data: undefined as T };
      }
      return { ok: true, data: (await response.json()) as T };
    }

    return {
      ok: false,
      error: await readBackendError(response, `Request failed with status ${response.status}.`),
    };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function fetchDevices(connection: BackendConnection) {
  return fetchBackendJson<DevicesListResponse>(connection, "/api/devices");
}

export async function fetchCaptureStatus(connection: BackendConnection) {
  return fetchBackendJson<CaptureStatusResponse>(connection, "/api/capture/status");
}

export async function startCapture(connection: BackendConnection, deviceId: number) {
  return fetchBackendJson<CaptureStatusResponse>(connection, "/api/capture/start", {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId }),
  });
}

export async function stopCapture(connection: BackendConnection) {
  return fetchBackendJson<CaptureStatusResponse>(connection, "/api/capture/stop", {
    method: "POST",
  });
}

export async function pauseCapture(connection: BackendConnection) {
  return fetchBackendJson<CaptureStatusResponse>(connection, "/api/capture/pause", {
    method: "POST",
  });
}

export async function resumeCapture(connection: BackendConnection) {
  return fetchBackendJson<CaptureStatusResponse>(connection, "/api/capture/resume", {
    method: "POST",
  });
}
