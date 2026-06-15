export interface HealthResponse {
  status: "ok" | "degraded";
  backend_version: string;
}

export const DEFAULT_BACKEND_PORT = 8765;
export const HEALTH_POLL_INTERVAL_MS = 2000;
