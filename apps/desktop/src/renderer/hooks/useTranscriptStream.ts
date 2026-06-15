import {
  type LiveTranscriptSegment,
  type Speaker,
  type TranscriptStreamEvent,
} from "@real-time-transcriptor/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { type BackendConnection } from "../lib/backendApi";
import { getTranscriptWebSocketUrl } from "../lib/transcriptApi";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export type TranscriptConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error";

function mergeSegment(
  current: LiveTranscriptSegment[],
  incoming: LiveTranscriptSegment,
): LiveTranscriptSegment[] {
  const existingIndex = current.findIndex((segment) => segment.id === incoming.id);
  if (existingIndex === -1) {
    return [...current, incoming].sort((left, right) => left.sequence - right.sequence);
  }

  const next = [...current];
  const existing = current[existingIndex];
  next[existingIndex] = {
    ...incoming,
    confidence: incoming.confidence ?? existing.confidence,
    alternatives: incoming.alternatives.length > 0 ? incoming.alternatives : existing.alternatives,
  };
  return next;
}

export function useTranscriptStream(
  sessionId: string | null,
  connection: BackendConnection | null,
) {
  const [segments, setSegments] = useState<LiveTranscriptSegment[]>([]);
  const [connectionState, setConnectionState] = useState<TranscriptConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(false);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const applySpeakerLabel = useCallback((speaker: Speaker) => {
    setSegments((current) =>
      current.map((segment) =>
        segment.speaker_id === speaker.id ? { ...segment, speaker_label: speaker.label } : segment,
      ),
    );
  }, []);

  const handleEvent = useCallback(
    (payload: TranscriptStreamEvent) => {
      if (payload.type === "segment") {
        setSegments((current) => mergeSegment(current, payload.segment));
        return;
      }

      if (payload.type === "speaker_updated") {
        applySpeakerLabel(payload.speaker);
        return;
      }

      if (payload.type === "closed") {
        shouldReconnectRef.current = false;
        setConnectionState("closed");
        return;
      }

      setError(payload.message);
      setConnectionState("error");
      shouldReconnectRef.current = false;
    },
    [applySpeakerLabel],
  );

  const connect = useCallback(() => {
    if (!sessionId || !connection) {
      return;
    }

    socketRef.current?.close();
    setConnectionState(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");

    const socket = new WebSocket(getTranscriptWebSocketUrl(connection, sessionId));
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnectionState("connected");
      setError(null);
    };

    socket.onmessage = (event) => {
      let payload: TranscriptStreamEvent;
      try {
        payload = JSON.parse(String(event.data)) as TranscriptStreamEvent;
      } catch {
        setError("Received invalid transcript stream data.");
        setConnectionState("error");
        shouldReconnectRef.current = false;
        socket.close();
        return;
      }
      handleEvent(payload);
    };

    socket.onerror = () => {
      if (shouldReconnectRef.current) {
        setConnectionState("reconnecting");
      } else {
        setError("Transcript stream connection failed.");
        setConnectionState("error");
      }
    };

    socket.onclose = () => {
      if (!shouldReconnectRef.current) {
        return;
      }

      setConnectionState("reconnecting");
      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * 2 ** reconnectAttemptRef.current,
      );
      reconnectAttemptRef.current += 1;
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };
  }, [clearReconnectTimer, connection, handleEvent, sessionId]);

  useEffect(() => {
    if (!sessionId || !connection) {
      shouldReconnectRef.current = false;
      socketRef.current?.close();
      socketRef.current = null;
      clearReconnectTimer();
      setSegments([]);
      setConnectionState("idle");
      setError(null);
      reconnectAttemptRef.current = 0;
      return;
    }

    shouldReconnectRef.current = true;
    reconnectAttemptRef.current = 0;
    setSegments([]);
    connect();

    return () => {
      shouldReconnectRef.current = false;
      socketRef.current?.close();
      socketRef.current = null;
      clearReconnectTimer();
    };
  }, [clearReconnectTimer, connect, connection, sessionId]);

  return {
    segments,
    connectionState,
    error,
    applySpeakerLabel,
  };
}
