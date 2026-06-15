import {
  CAPTURE_STATUS_POLL_INTERVAL_MS,
  type AudioDevice,
  type CaptureStatusResponse,
} from "@real-time-transcriptor/shared";
import { useCallback, useEffect, useState } from "react";

import {
  fetchCaptureStatus,
  fetchDevices,
  resolveBackendConnection,
  startCapture,
  stopCapture,
} from "../lib/backendApi";

export function useAudioCapture(backendOnline: boolean) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatusResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    if (!backendOnline) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    const connection = await resolveBackendConnection();
    const result = await fetchDevices(connection);

    setIsRefreshing(false);

    if (!result.ok) {
      setError(result.error?.message ?? "Could not load audio devices.");
      return;
    }

    setDevices(result.data.devices);

    setSelectedDeviceId((current) => {
      if (current !== null && result.data.devices.some((device) => device.id === current)) {
        return current;
      }

      const defaultDevice = result.data.devices.find((device) => device.is_default);
      return defaultDevice?.id ?? result.data.devices[0]?.id ?? null;
    });
  }, [backendOnline]);

  const refreshCaptureStatus = useCallback(async () => {
    if (!backendOnline) {
      setCaptureStatus(null);
      return;
    }

    const connection = await resolveBackendConnection();
    const result = await fetchCaptureStatus(connection);
    if (result.ok) {
      setCaptureStatus(result.data);
    }
  }, [backendOnline]);

  useEffect(() => {
    if (!backendOnline) {
      setDevices([]);
      setCaptureStatus(null);
      return;
    }

    void refreshDevices();
    void refreshCaptureStatus();
  }, [backendOnline, refreshDevices, refreshCaptureStatus]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) {
      return;
    }

    const unsubscribe = api.onBackendStatus((event) => {
      if (event.status === "restarting" || event.status === "stopped") {
        setCaptureStatus(null);
        setError(null);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!backendOnline || !captureStatus?.is_capturing) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshCaptureStatus();
    }, CAPTURE_STATUS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [backendOnline, captureStatus?.is_capturing, refreshCaptureStatus]);

  const handleStartCapture = useCallback(async () => {
    if (selectedDeviceId === null) {
      setError("Select a microphone before starting capture.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const connection = await resolveBackendConnection();
    const result = await startCapture(connection, selectedDeviceId);

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error?.message ?? "Could not start audio capture.");
      return;
    }

    setCaptureStatus(result.data);
  }, [selectedDeviceId]);

  const handleStopCapture = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    const connection = await resolveBackendConnection();
    const result = await stopCapture(connection);

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error?.message ?? "Could not stop audio capture.");
      return;
    }

    setCaptureStatus(result.data);
  }, []);

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    captureStatus,
    isRefreshing,
    isSubmitting,
    error,
    refreshDevices,
    handleStartCapture,
    handleStopCapture,
  };
}

export type AudioCaptureState = ReturnType<typeof useAudioCapture>;
