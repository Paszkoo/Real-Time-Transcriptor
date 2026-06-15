import { useEffect, useState } from "react";

import type { SetupSnapshot } from "../electron-api.types";
import {
  createInitialSetupUiState,
  setupUiFromComplete,
  setupUiFromError,
  setupUiFromProgress,
  setupUiFromSnapshot,
  setupUiFromStart,
  type SetupUiState,
} from "./setup-ui-state";

export function useSetupState(): SetupUiState {
  const [setupUi, setSetupUi] = useState<SetupUiState>(createInitialSetupUiState);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) {
      return;
    }

    let cancelled = false;

    const applySnapshot = (snapshot: SetupSnapshot) => {
      if (!cancelled) {
        setSetupUi(setupUiFromSnapshot(snapshot));
      }
    };

    void api.getSetupState().then(applySnapshot);

    const unsubscribers = [
      api.onSetupStart(() => setSetupUi(setupUiFromStart())),
      api.onSetupProgress((event) => setSetupUi(setupUiFromProgress(event))),
      api.onSetupComplete(() => setSetupUi(setupUiFromComplete())),
      api.onSetupError((event) =>
        setSetupUi((current) => setupUiFromError(event.message, current.progress.percent)),
      ),
    ];

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, []);

  return setupUi;
}
