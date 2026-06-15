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
      return { ok: true, data: (await response.json()) as T };
    }

    try {
      const error = (await response.json()) as ApiErrorResponse;
      if (error.code && error.message) {
        return { ok: false, error };
      }
    } catch {
      // Fall through to generic error.
    }

    return {
      ok: false,
      error: {
        code: "request_failed",
        message: `Request failed with status ${response.status}.`,
      },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "network_error",
        message: "Could not reach the backend.",
      },
    };
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
