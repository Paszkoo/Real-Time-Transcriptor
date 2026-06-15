import { HEALTH_POLL_INTERVAL_MS, type HealthResponse } from "@real-time-transcriptor/shared";
import { useEffect, useState } from "react";

import { getBackendBaseUrl, resolveBackendConnection } from "../lib/backendApi";

export type BackendStatus = "checking" | "online" | "offline" | "restarting";

async function fetchHealth(
  connection: Awaited<ReturnType<typeof resolveBackendConnection>>,
): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${getBackendBaseUrl(connection)}/api/health`);
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}

export function useBackendHealth(): {
  status: BackendStatus;
  health: HealthResponse | null;
} {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    const unsubscribers = api
      ? [
          api.onBackendStatus((event) => {
            if (event.status === "restarting") {
              setStatus("restarting");
              setHealth(null);
            }
            if (event.status === "stopped") {
              setStatus("offline");
              setHealth(null);
            }
          }),
        ]
      : [];

    let intervalId: number | undefined;

    const startPolling = async () => {
      const connection = await resolveBackendConnection();

      const poll = async () => {
        const result = await fetchHealth(connection);
        if (result?.status === "ok") {
          setStatus("online");
          setHealth(result);
          return;
        }

        setStatus((current) => (current === "restarting" ? "restarting" : "offline"));
        setHealth(null);
      };

      await poll();
      intervalId = window.setInterval(() => {
        void poll();
      }, HEALTH_POLL_INTERVAL_MS);
    };

    void startPolling();

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return { status, health };
}
