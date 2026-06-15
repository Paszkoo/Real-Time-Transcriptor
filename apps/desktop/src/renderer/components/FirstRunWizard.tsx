import type { SetupUiState } from "../setup-ui-state";

const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";

interface FirstRunWizardProps {
  setupUi: SetupUiState;
}

export function FirstRunWizard({ setupUi }: FirstRunWizardProps) {
  const api = window.electronAPI;

  const handleDownloadOllama = () => {
    void api?.openExternalUrl(OLLAMA_DOWNLOAD_URL);
  };

  const handleRetrySetup = () => {
    void api?.retryModelSetup();
  };

  if (setupUi.status === "skipped" || setupUi.status === "idle" || setupUi.status === "complete") {
    return null;
  }

  if (setupUi.status === "ollama-missing") {
    return (
      <section className="w-full max-w-lg rounded-xl border border-amber-500/40 bg-slate-900 p-5">
        <p className="text-sm font-medium text-amber-200">Ollama is required</p>
        <p className="mt-2 text-sm text-slate-300">
          Install Ollama to download the local LLM model used for session insights, then retry
          setup.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            onClick={handleDownloadOllama}
          >
            Download Ollama
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            onClick={handleRetrySetup}
          >
            Retry setup
          </button>
        </div>
      </section>
    );
  }

  if (setupUi.status === "ollama-unreachable") {
    return (
      <section className="w-full max-w-lg rounded-xl border border-amber-500/40 bg-slate-900 p-5">
        <p className="text-sm font-medium text-amber-200">Start Ollama</p>
        <p className="mt-2 text-sm text-slate-300">
          Ollama is installed but not running. Launch the Ollama app, then retry setup.
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          onClick={handleRetrySetup}
        >
          Retry setup
        </button>
      </section>
    );
  }

  if (setupUi.status === "error") {
    return (
      <section className="w-full max-w-lg rounded-xl border border-rose-500/40 bg-slate-900 p-5">
        <p className="text-sm font-medium text-rose-300">Setup failed</p>
        <p className="mt-2 text-sm text-rose-200">{setupUi.progress.message}</p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          onClick={handleRetrySetup}
        >
          Retry setup
        </button>
      </section>
    );
  }

  return (
    <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm font-medium text-slate-200">First-run model setup</p>
      <p className="mt-1 text-xs text-slate-400">
        Downloading Whisper and the local LLM model. This runs once and may take several minutes.
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-300"
          style={{ width: `${setupUi.progress.percent}%` }}
        />
      </div>
      <p className="mt-2 truncate text-xs text-slate-400">{setupUi.progress.message}</p>
    </section>
  );
}
