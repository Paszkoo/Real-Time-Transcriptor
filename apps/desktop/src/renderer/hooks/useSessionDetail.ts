import type { SessionDetail } from "@real-time-transcriptor/shared";
import { useCallback, useEffect, useState } from "react";

import { resolveBackendConnection } from "../lib/backendApi";
import { fetchSession } from "../lib/sessionsApi";

export function useSessionDetail(backendOnline: boolean, sessionId: string | null) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (!backendOnline || !sessionId) {
      setSession(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const connection = await resolveBackendConnection();
    const result = await fetchSession(connection, sessionId);

    setIsLoading(false);

    if (!result.ok) {
      setError(result.error?.message ?? "Could not load session.");
      setSession(null);
      return;
    }

    setSession(result.data);
  }, [backendOnline, sessionId]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  return {
    session,
    isLoading,
    error,
    refreshSession,
  };
}
