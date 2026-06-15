import { useCallback, useEffect, useState } from "react";

import type { SetupSnapshot } from "../electron-api.types";
import {
  createInitialSetupUiState,
  setupUiFromComplete,
  setupUiFromError,
  setupUiFromOllamaMissing,
  setupUiFromOllamaUnreachable,
  setupUiFromProgress,
  setupUiFromSnapshot,
  setupUiFromStart,
  type SetupUiState,
} from "../setup-ui-state";

export function useSetupState(): SetupUiState {
  const [setupUi, setSetupUi] = useState<SetupUiState>(createInitialSetupUiState);

  const applySnapshot = useCallback((snapshot: SetupSnapshot) => {
    setSetupUi(setupUiFromSnapshot(snapshot));
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) {
      return;
    }

    void api.getSetupState().then(applySnapshot);

    const unsubscribers = [
      api.onSetupStart(() => setSetupUi(setupUiFromStart())),
      api.onSetupProgress((event) => setSetupUi(setupUiFromProgress(event))),
      api.onSetupComplete(() => setSetupUi(setupUiFromComplete())),
      api.onSetupError((event) =>
        setSetupUi((current) => setupUiFromError(event.message, current.progress.percent)),
      ),
      api.onSetupOllamaMissing((event) => setSetupUi(setupUiFromOllamaMissing(event.message))),
      api.onSetupOllamaUnreachable((event) =>
        setSetupUi(setupUiFromOllamaUnreachable(event.message)),
      ),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [applySnapshot]);

  return setupUi;
}
