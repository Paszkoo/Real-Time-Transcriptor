import type { SessionArtifact, SummaryFormat } from "@real-time-transcriptor/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { type BackendConnection } from "../lib/backendApi";
import {
  artifactTypeForTab,
  connectLlmStream,
  startSessionProcessing,
  taskForTab,
} from "../lib/llmApi";

type InsightsTab = "correct" | "summarize" | "todos";

interface GeneratingContext {
  tab: InsightsTab;
  summaryFormat: SummaryFormat;
  sessionId: string;
}

interface UseSessionInsightsOptions {
  sessionId: string;
  connection: BackendConnection;
  artifacts: SessionArtifact[];
  onArtifactsUpdated: () => void;
}

function matchesContext(a: GeneratingContext, b: GeneratingContext): boolean {
  return a.tab === b.tab && a.summaryFormat === b.summaryFormat && a.sessionId === b.sessionId;
}

export function useSessionInsights({
  sessionId,
  connection,
  artifacts,
  onArtifactsUpdated,
}: UseSessionInsightsOptions) {
  const [activeTab, setActiveTab] = useState<InsightsTab>("summarize");
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>("bullets");
  const [streamText, setStreamText] = useState("");
  const [generatingContext, setGeneratingContext] = useState<GeneratingContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const activeGenerationRef = useRef<GeneratingContext | null>(null);

  const viewContext: GeneratingContext = {
    tab: activeTab,
    summaryFormat,
    sessionId,
  };

  const isGenerating =
    generatingContext !== null && matchesContext(generatingContext, viewContext);

  const artifactType = artifactTypeForTab(activeTab, summaryFormat);
  const savedArtifact = artifacts.find((artifact) => artifact.artifact_type === artifactType);

  const isActiveGeneration = useCallback((started: GeneratingContext) => {
    const active = activeGenerationRef.current;
    return active !== null && matchesContext(active, started);
  }, []);

  useEffect(() => {
    setError(null);
  }, [activeTab, summaryFormat, sessionId]);

  useEffect(() => {
    socketRef.current?.close();
    socketRef.current = null;
    activeGenerationRef.current = null;
    setGeneratingContext(null);
    setStreamText("");
    setError(null);
  }, [sessionId]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  const clearGeneration = useCallback(() => {
    activeGenerationRef.current = null;
    setGeneratingContext(null);
  }, []);

  const generate = useCallback(async () => {
    setError(null);
    setStreamText("");
    socketRef.current?.close();

    const startedContext: GeneratingContext = {
      tab: activeTab,
      summaryFormat,
      sessionId,
    };
    activeGenerationRef.current = startedContext;
    setGeneratingContext(startedContext);

    const task = taskForTab(activeTab);
    const result = await startSessionProcessing(connection, sessionId, {
      task,
      ...(task === "summarize" ? { format: summaryFormat } : {}),
    });

    if (!result.ok) {
      clearGeneration();
      setError(result.error?.message ?? "Could not start LLM processing.");
      return;
    }

    socketRef.current = connectLlmStream(connection, result.data.job_id, {
      onToken: (content) => {
        if (isActiveGeneration(startedContext)) {
          setStreamText((current) => current + content);
        }
      },
      onDone: (content) => {
        if (isActiveGeneration(startedContext)) {
          setStreamText(content);
          clearGeneration();
        }
        onArtifactsUpdated();
      },
      onError: (_code, message) => {
        if (isActiveGeneration(startedContext)) {
          setError(message);
          clearGeneration();
        }
      },
    });
  }, [
    activeTab,
    clearGeneration,
    connection,
    isActiveGeneration,
    onArtifactsUpdated,
    sessionId,
    summaryFormat,
  ]);

  const displayedText = isGenerating
    ? streamText
    : streamText || savedArtifact?.content || "";

  return {
    activeTab,
    setActiveTab,
    summaryFormat,
    setSummaryFormat,
    displayedText,
    isGenerating,
    error,
    generate,
  };
}
