import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  onDiagnosticEvent,
  resetDiagnosticEventsForTest,
} from "../../../infra/diagnostic-events.js";
import { logModelFallbackDecision } from "../../model-fallback-observation.js";
import {
  createFailoverDecisionLogger,
  normalizeFailoverDecisionObservationBase,
} from "./failover-observation.js";

function normalizeObservation(
  overrides: Partial<Parameters<typeof normalizeFailoverDecisionObservationBase>[0]>,
) {
  return normalizeFailoverDecisionObservationBase({
    stage: "assistant",
    runId: "run:base",
    rawError: "",
    failoverReason: null,
    profileFailureReason: null,
    provider: "openai",
    model: "mock-1",
    profileId: "openai:p1",
    fallbackConfigured: false,
    timedOut: false,
    aborted: false,
    ...overrides,
  });
}

describe("normalizeFailoverDecisionObservationBase", () => {
  beforeEach(() => {
    resetDiagnosticEventsForTest();
  });

  afterEach(() => {
    resetDiagnosticEventsForTest();
  });

  it("fills timeout observation reasons for deadline timeouts without provider error text", () => {
    expect(
      normalizeObservation({
        runId: "run:timeout",
        timedOut: true,
      }),
    ).toMatchObject({
      failoverReason: "timeout",
      profileFailureReason: "timeout",
      timedOut: true,
    });
  });

  it("preserves explicit failover reasons", () => {
    expect(
      normalizeObservation({
        runId: "run:overloaded",
        rawError: '{"error":{"type":"overloaded_error"}}',
        failoverReason: "overloaded",
        profileFailureReason: "overloaded",
        fallbackConfigured: true,
        timedOut: true,
      }),
    ).toMatchObject({
      failoverReason: "overloaded",
      profileFailureReason: "overloaded",
      timedOut: true,
    });
  });

  it("emits embedded-run failover decisions to the diagnostics bus", () => {
    const events: Array<Record<string, unknown>> = [];
    onDiagnosticEvent((event) => {
      if (event.type === "failover.decision") {
        events.push(event as unknown as Record<string, unknown>);
      }
    });

    const recordDecision = createFailoverDecisionLogger({
      stage: "prompt",
      runId: "run-embedded",
      rawError: "deadline exceeded",
      failoverReason: "timeout",
      profileFailureReason: "timeout",
      provider: "newapi",
      model: "gpt-5.4",
      profileId: "openai:default",
      fallbackConfigured: true,
      timedOut: true,
      aborted: false,
    });
    recordDecision("fallback_model");

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "failover.decision",
      source: "embedded_run",
      stage: "prompt",
      decision: "fallback_model",
      reason: "timeout",
      requestedProvider: "newapi",
      requestedModel: "gpt-5.4",
    });
  });

  it("emits model-fallback decisions to the diagnostics bus", () => {
    const events: Array<Record<string, unknown>> = [];
    onDiagnosticEvent((event) => {
      if (event.type === "failover.decision") {
        events.push(event as unknown as Record<string, unknown>);
      }
    });

    logModelFallbackDecision({
      decision: "candidate_failed",
      runId: "run-fallback",
      requestedProvider: "newapi",
      requestedModel: "gpt-5.4",
      candidate: { provider: "hiyo", model: "gpt-5.4" },
      nextCandidate: { provider: "volcengine-plan", model: "glm-4.7" },
      reason: "timeout",
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "failover.decision",
      source: "model_fallback",
      stage: "model_fallback",
      decision: "candidate_failed",
      reason: "timeout",
      requestedProvider: "newapi",
      requestedModel: "gpt-5.4",
      candidateProvider: "hiyo",
      candidateModel: "gpt-5.4",
      nextProvider: "volcengine-plan",
      nextModel: "glm-4.7",
    });
  });
});
