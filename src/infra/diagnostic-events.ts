import type { OpenClawConfig } from "../config/config.js";

export type DiagnosticSessionState = "idle" | "processing" | "waiting";

type DiagnosticBaseEvent = {
  ts: number;
  seq: number;
};

export type DiagnosticUsageEvent = DiagnosticBaseEvent & {
  type: "model.usage";
  sessionKey?: string;
  sessionId?: string;
  channel?: string;
  provider?: string;
  model?: string;
  usage: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    promptTokens?: number;
    total?: number;
  };
  lastCallUsage?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    total?: number;
  };
  context?: {
    limit?: number;
    used?: number;
  };
  costUsd?: number;
  durationMs?: number;
};

export type DiagnosticWebhookReceivedEvent = DiagnosticBaseEvent & {
  type: "webhook.received";
  channel: string;
  updateType?: string;
  chatId?: number | string;
};

export type DiagnosticWebhookProcessedEvent = DiagnosticBaseEvent & {
  type: "webhook.processed";
  channel: string;
  updateType?: string;
  chatId?: number | string;
  durationMs?: number;
};

export type DiagnosticWebhookErrorEvent = DiagnosticBaseEvent & {
  type: "webhook.error";
  channel: string;
  updateType?: string;
  chatId?: number | string;
  error: string;
};

export type DiagnosticMessageQueuedEvent = DiagnosticBaseEvent & {
  type: "message.queued";
  sessionKey?: string;
  sessionId?: string;
  channel?: string;
  agent?: string;
  source: string;
  queueDepth?: number;
};

export type DiagnosticMessageProcessedEvent = DiagnosticBaseEvent & {
  type: "message.processed";
  channel: string;
  agent?: string;
  messageId?: number | string;
  chatId?: number | string;
  sessionKey?: string;
  sessionId?: string;
  durationMs?: number;
  outcome: "completed" | "skipped" | "error";
  reason?: string;
  error?: string;
};

export type DiagnosticSessionStateEvent = DiagnosticBaseEvent & {
  type: "session.state";
  sessionKey?: string;
  sessionId?: string;
  prevState?: DiagnosticSessionState;
  state: DiagnosticSessionState;
  reason?: string;
  queueDepth?: number;
};

export type DiagnosticSessionStuckEvent = DiagnosticBaseEvent & {
  type: "session.stuck";
  sessionKey?: string;
  sessionId?: string;
  state: DiagnosticSessionState;
  ageMs: number;
  queueDepth?: number;
};

export type DiagnosticLaneEnqueueEvent = DiagnosticBaseEvent & {
  type: "queue.lane.enqueue";
  lane: string;
  queueSize: number;
};

export type DiagnosticLaneDequeueEvent = DiagnosticBaseEvent & {
  type: "queue.lane.dequeue";
  lane: string;
  queueSize: number;
  waitMs: number;
};

export type DiagnosticRunAttemptEvent = DiagnosticBaseEvent & {
  type: "run.attempt";
  sessionKey?: string;
  sessionId?: string;
  runId: string;
  attempt: number;
};

export type DiagnosticFailoverSource = "embedded_run" | "model_fallback";

export type DiagnosticFailoverStage = "prompt" | "assistant" | "model_fallback";

export type DiagnosticFailoverDecision =
  | "rotate_profile"
  | "fallback_model"
  | "surface_error"
  | "skip_candidate"
  | "probe_cooldown_candidate"
  | "candidate_failed"
  | "candidate_succeeded";

export type DiagnosticFailoverDecisionEvent = DiagnosticBaseEvent & {
  type: "failover.decision";
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  source: DiagnosticFailoverSource;
  stage: DiagnosticFailoverStage;
  decision: DiagnosticFailoverDecision;
  reason?: string;
  requestedProvider?: string;
  requestedModel?: string;
  candidateProvider?: string;
  candidateModel?: string;
  nextProvider?: string;
  nextModel?: string;
};

export type DiagnosticCompactionOutcome = "compacted" | "skipped" | "failed";

export type DiagnosticCompactionRunEvent = DiagnosticBaseEvent & {
  type: "compaction.run";
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  channel?: string;
  agent?: string;
  provider?: string;
  model?: string;
  trigger?: string;
  outcome: DiagnosticCompactionOutcome;
  reason?: string;
  durationMs?: number;
};

export type DiagnosticMemoryFlushReason = "threshold" | "transcript_size";

export type DiagnosticMemoryFlushOutcome = "triggered" | "completed" | "failed";

export type DiagnosticMemoryFlushEvent = DiagnosticBaseEvent & {
  type: "memory.flush";
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  channel?: string;
  agent?: string;
  provider?: string;
  model?: string;
  reason: DiagnosticMemoryFlushReason;
  outcome: DiagnosticMemoryFlushOutcome;
  durationMs?: number;
};

export type DiagnosticPromptOutcome = "completed" | "error" | "aborted";

export type DiagnosticPromptDurationEvent = DiagnosticBaseEvent & {
  type: "prompt.duration";
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  channel?: string;
  agent?: string;
  provider?: string;
  model?: string;
  outcome: DiagnosticPromptOutcome;
  durationMs: number;
};

export type DiagnosticToolOutcome = "completed" | "failed";

export type DiagnosticToolCallEvent = DiagnosticBaseEvent & {
  type: "tool.call";
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  agent?: string;
  tool: string;
  outcome: DiagnosticToolOutcome;
  durationMs?: number;
};

export type DiagnosticToolGapEvent = DiagnosticBaseEvent & {
  type: "tool.gap";
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  agent?: string;
  prevTool: string;
  nextTool: string;
  gapMs: number;
};

export type DiagnosticHeartbeatEvent = DiagnosticBaseEvent & {
  type: "diagnostic.heartbeat";
  webhooks: {
    received: number;
    processed: number;
    errors: number;
  };
  active: number;
  waiting: number;
  queued: number;
};

export type DiagnosticToolLoopEvent = DiagnosticBaseEvent & {
  type: "tool.loop";
  sessionKey?: string;
  sessionId?: string;
  toolName: string;
  level: "warning" | "critical";
  action: "warn" | "block";
  detector: "generic_repeat" | "known_poll_no_progress" | "global_circuit_breaker" | "ping_pong";
  count: number;
  message: string;
  pairedToolName?: string;
};

export type DiagnosticEventPayload =
  | DiagnosticUsageEvent
  | DiagnosticWebhookReceivedEvent
  | DiagnosticWebhookProcessedEvent
  | DiagnosticWebhookErrorEvent
  | DiagnosticMessageQueuedEvent
  | DiagnosticMessageProcessedEvent
  | DiagnosticSessionStateEvent
  | DiagnosticSessionStuckEvent
  | DiagnosticLaneEnqueueEvent
  | DiagnosticLaneDequeueEvent
  | DiagnosticRunAttemptEvent
  | DiagnosticFailoverDecisionEvent
  | DiagnosticCompactionRunEvent
  | DiagnosticMemoryFlushEvent
  | DiagnosticPromptDurationEvent
  | DiagnosticToolCallEvent
  | DiagnosticToolGapEvent
  | DiagnosticHeartbeatEvent
  | DiagnosticToolLoopEvent;

export type DiagnosticEventInput = DiagnosticEventPayload extends infer Event
  ? Event extends DiagnosticEventPayload
    ? Omit<Event, "seq" | "ts">
    : never
  : never;

type DiagnosticEventsGlobalState = {
  seq: number;
  listeners: Set<(evt: DiagnosticEventPayload) => void>;
  dispatchDepth: number;
};

function getDiagnosticEventsState(): DiagnosticEventsGlobalState {
  const globalStore = globalThis as typeof globalThis & {
    __openclawDiagnosticEventsState?: DiagnosticEventsGlobalState;
  };
  if (!globalStore.__openclawDiagnosticEventsState) {
    globalStore.__openclawDiagnosticEventsState = {
      seq: 0,
      listeners: new Set<(evt: DiagnosticEventPayload) => void>(),
      dispatchDepth: 0,
    };
  }
  return globalStore.__openclawDiagnosticEventsState;
}

export function isDiagnosticsEnabled(config?: OpenClawConfig): boolean {
  return config?.diagnostics?.enabled === true;
}

export function emitDiagnosticEvent(event: DiagnosticEventInput) {
  const state = getDiagnosticEventsState();
  if (state.dispatchDepth > 100) {
    console.error(
      `[diagnostic-events] recursion guard tripped at depth=${state.dispatchDepth}, dropping type=${event.type}`,
    );
    return;
  }

  const enriched = {
    ...event,
    seq: (state.seq += 1),
    ts: Date.now(),
  } satisfies DiagnosticEventPayload;
  state.dispatchDepth += 1;
  for (const listener of state.listeners) {
    try {
      listener(enriched);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? (err.stack ?? err.message)
          : typeof err === "string"
            ? err
            : String(err);
      console.error(
        `[diagnostic-events] listener error type=${enriched.type} seq=${enriched.seq}: ${errorMessage}`,
      );
      // Ignore listener failures.
    }
  }
  state.dispatchDepth -= 1;
}

export function onDiagnosticEvent(listener: (evt: DiagnosticEventPayload) => void): () => void {
  const state = getDiagnosticEventsState();
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

export function resetDiagnosticEventsForTest(): void {
  const state = getDiagnosticEventsState();
  state.seq = 0;
  state.listeners.clear();
  state.dispatchDepth = 0;
}
