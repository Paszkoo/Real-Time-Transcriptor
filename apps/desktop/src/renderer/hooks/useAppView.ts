import { useCallback, useState } from "react";

export type AppView = "live" | "history" | "session" | "settings";

export function useAppView() {
  const [view, setView] = useState<AppView>("live");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const openSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setView("session");
  }, []);

  const closeSessionView = useCallback(() => {
    setView("history");
  }, []);

  const handleDeletedSession = useCallback(
    (sessionId: string, deleted: boolean) => {
      if (!deleted || selectedSessionId !== sessionId) {
        return;
      }

      setSelectedSessionId(null);
      setView("history");
    },
    [selectedSessionId],
  );

  return {
    view,
    setView,
    selectedSessionId,
    openSession,
    closeSessionView,
    handleDeletedSession,
  };
}
