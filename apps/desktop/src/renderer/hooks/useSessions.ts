import type { SessionSummary } from "@real-time-transcriptor/shared";
import { useCallback, useEffect, useState } from "react";

import { resolveBackendConnection } from "../lib/backendApi";
import {
  deleteSession as deleteSessionRequest,
  fetchSessions,
  searchSessions,
} from "../lib/sessionsApi";

export function useSessions(backendOnline: boolean) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const refreshSessions = useCallback(async () => {
    if (!backendOnline) {
      setSessions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const connection = await resolveBackendConnection();
    const result = debouncedSearchQuery.trim()
      ? await searchSessions(connection, debouncedSearchQuery.trim())
      : await fetchSessions(connection);

    setIsLoading(false);

    if (!result.ok) {
      setError(result.error?.message ?? "Could not load session history.");
      return;
    }

    setSessions(result.data.sessions);
  }, [backendOnline, debouncedSearchQuery]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    const connection = await resolveBackendConnection();
    const result = await deleteSessionRequest(connection, sessionId);
    if (!result.ok) {
      setError(result.error?.message ?? "Could not delete session.");
      return false;
    }

    setSessions((current) => current.filter((session) => session.id !== sessionId));
    return true;
  }, []);

  return {
    sessions,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refreshSessions,
    handleDeleteSession,
  };
}
