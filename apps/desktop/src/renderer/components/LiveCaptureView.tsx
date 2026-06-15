import { useCallback, useEffect, useState } from "react";

import { CaptureControlsPanel } from "./CaptureControlsPanel";
import { LiveTranscriptPanel } from "./LiveTranscriptPanel";
import { StopConfirmDialog } from "./StopConfirmDialog";
import { type AudioCaptureState } from "../hooks/useAudioCapture";
import { useTranscriptStream } from "../hooks/useTranscriptStream";
import { resolveBackendConnection, type BackendConnection } from "../lib/backendApi";
import { updateSpeakerLabel } from "../lib/transcriptApi";

interface LiveCaptureViewProps {
  backendOnline: boolean;
  connection: BackendConnection | null;
  capture: AudioCaptureState;
}

export function LiveCaptureView({
  backendOnline,
  connection,
  capture,
}: LiveCaptureViewProps) {
  const {
    captureStatus,
    isSubmitting,
    handlePauseCapture,
    handleResumeCapture,
    handleStopCapture,
  } = capture;

  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [streamConnection, setStreamConnection] = useState<BackendConnection | null>(connection);

  useEffect(() => {
    if (connection) {
      setStreamConnection(connection);
      return;
    }

    if (!backendOnline) {
      setStreamConnection(null);
      return;
    }

    void resolveBackendConnection().then(setStreamConnection);
  }, [backendOnline, connection]);

  const sessionId = captureStatus?.session_id ?? null;
  const {
    segments,
    connectionState,
    error: transcriptError,
    applySpeakerLabel,
  } = useTranscriptStream(sessionId, streamConnection);

  const isCapturing = captureStatus?.is_capturing ?? false;
  const isPaused = captureStatus?.is_paused ?? false;
  const canStop = backendOnline && isCapturing && !isSubmitting;

  const confirmStop = useCallback(async () => {
    const stopped = await handleStopCapture();
    if (stopped) {
      setShowStopConfirm(false);
    }
  }, [handleStopCapture]);

  const togglePauseResume = useCallback(() => {
    if (!isCapturing || isSubmitting) {
      return;
    }
    if (isPaused) {
      void handleResumeCapture();
      return;
    }
    void handlePauseCapture();
  }, [handlePauseCapture, handleResumeCapture, isCapturing, isPaused, isSubmitting]);

  const requestStop = useCallback(() => {
    if (!canStop) {
      return;
    }
    setShowStopConfirm(true);
  }, [canStop]);

  useEffect(() => {
    if (!isCapturing || showStopConfirm) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        togglePauseResume();
      }

      if (event.code === "Escape") {
        event.preventDefault();
        requestStop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCapturing, requestStop, showStopConfirm, togglePauseResume]);

  const handleRenameSpeaker = useCallback(
    async (speakerId: string, currentLabel: string) => {
      if (!streamConnection || !sessionId) {
        return;
      }

      const nextLabel = window.prompt("Speaker name", currentLabel)?.trim();
      if (!nextLabel || nextLabel === currentLabel) {
        return;
      }

      setRenameError(null);
      const result = await updateSpeakerLabel(streamConnection, sessionId, speakerId, {
        label: nextLabel,
      });

      if (!result.ok) {
        setRenameError(result.error?.message ?? "Could not rename speaker.");
        return;
      }

      applySpeakerLabel(result.data);
    },
    [applySpeakerLabel, sessionId, streamConnection],
  );

  const streamErrors = [renameError, transcriptError].filter(Boolean).join(" · ") || null;

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {connectionState === "reconnecting" ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Reconnecting to live transcript…
        </div>
      ) : null}

      <CaptureControlsPanel
        backendOnline={backendOnline}
        capture={capture}
        extraError={streamErrors}
        onTogglePauseResume={togglePauseResume}
        onRequestStop={requestStop}
      />

      <LiveTranscriptPanel
        segments={segments}
        isStreaming={isCapturing && connectionState === "connected"}
        onRenameSpeaker={(speakerId, currentLabel) => {
          void handleRenameSpeaker(speakerId, currentLabel);
        }}
      />

      <StopConfirmDialog
        isOpen={showStopConfirm}
        isSubmitting={isSubmitting}
        onCancel={() => setShowStopConfirm(false)}
        onConfirm={() => void confirmStop()}
      />
    </div>
  );
}
