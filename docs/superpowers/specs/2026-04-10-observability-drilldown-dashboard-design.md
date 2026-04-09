# Observability Drilldown Dashboard Design

Date: 2026-04-10
Status: Approved in chat, pending written-spec review
Scope: Single Grafana dashboard redesign for OpenClaw observability, plus the minimum supporting metric additions required to make drilldown useful.

## Context

The current `OpenClaw Metric` dashboard is good at telling us that the system is slow, but not good at telling us which stage of the request path is slow.

Recent investigation on a real Feishu session showed that:

- Queue wait was near zero and was not the bottleneck.
- End-to-end message latency was high because of large-context compaction, model failover, and a long prompt phase.
- A separate long run spent most of its time between tool batches, not inside individual Feishu API calls.
- Current panels surface summary symptoms, but do not provide stage-specific drilldown dimensions for failover, compaction, memory flush, prompt duration, tool duration, or inter-tool gaps.

The redesign should keep a single dashboard, but restructure it around the debugging path operators actually follow during incidents.

## Goals

- Keep a single dashboard for day-to-day use.
- Make the dashboard usable for incident triage without immediately switching to Loki.
- Tie each core latency signal to the dimension that actually explains it.
- Preserve low-cardinality metrics design. High-cardinality identifiers stay in logs and traces.
- Add explicit data links from summary panels and tables into Loki / Explore.

## Non-goals

- This spec does not split observability into multiple dashboards.
- This spec does not introduce high-cardinality metrics keyed by `sessionId`, `sessionKey`, or `runId`.
- This spec does not attempt to replace logs; it makes logs easier to reach from the right summary panels.

## Design Principles

### 1. Organize by debugging path, not implementation module

The dashboard should answer:

1. Is the system unhealthy?
2. Which stage is unhealthy?
3. Which dimension best explains that stage?
4. Which logs should I open next?

Rows should therefore follow the request path instead of grouping loosely by "messages", "queues", or "sessions".

### 2. Every core signal gets its own drilldown dimension

We should stop treating `channel`, `provider`, `model`, and `lane` as the only useful dimensions for every panel.

Recommended primary drilldown dimensions:

- Message latency: `channel`, `agent`, `outcome`
- Queue wait: `lane`
- Session stuck: `state`, then `channel` / `agent`
- Run duration: `provider`, `model`
- Failover: `requested -> candidate`, `reason`, `stage`
- Compaction: `trigger`, `outcome`
- Memory flush: `reason`, `outcome`
- Prompt duration: `provider`, `model`
- Tool duration: `tool`
- Inter-tool gap: `prev_tool -> next_tool`

### 3. Summary panels are not enough

Each core signal should have a standard three-panel pattern:

- A symptom stat for fast triage
- A trend panel for recent time behavior
- A top-N table for immediate drilldown

### 4. Use percentiles for latency, not just averages

Latency panels should default to `p95` or `p99` where the metric shape supports it. Averages remain useful for cost and throughput, but they hide long-tail failures in the exact paths we are trying to debug.

### 5. Keep metrics low-cardinality

Metrics may include labels such as:

- `channel`
- `agent`
- `provider`
- `model`
- `lane`
- `tool`
- `outcome`
- `reason`
- `trigger`

Metrics must not include:

- `sessionId`
- `sessionKey`
- `runId`
- message identifiers

These belong in logs and traces only. Panels and tables should use data links to jump into Loki with the right filters.

## Target Dashboard Structure

The redesigned single dashboard should use these rows.

## Row 1: Triage

Purpose: answer "which stage is currently bad?"

Panels:

- Message latency `p95`
- Message error ratio
- Queue wait `p95`
- Stuck sessions
- Run duration `p95`
- Failover rate
- Compaction duration `p95`
- Tool duration `p95`

Notes:

- This row should stay compact and mostly stat-based.
- Each stat should link into its stage-specific row or Loki query.

## Row 2: Message Path

Purpose: answer "is the end-to-end request path failing at the message layer?"

Panels:

- Messages processed by outcome
- Message latency by channel
- Message latency by agent
- Top slow agents
- Top error agents

Primary drilldown:

- `channel -> agent -> outcome -> logs`

## Row 3: Queue and Session

Purpose: answer "is latency caused by waiting before execution?"

Panels:

- Queue wait `p95` by lane
- Queue depth by lane
- Enqueue vs dequeue by lane
- Stuck sessions by state
- Stuck session age `p95`
- Top slow lanes

Primary drilldown:

- `lane -> derived agent / conversation kind -> logs`

## Row 4: Model Path

Purpose: answer "is the active model path slow or unstable?"

Panels:

- Run duration `p95` by provider/model
- Prompt duration `p95` by provider/model
- Context used vs limit `p95`
- Failover count by requested/candidate
- Failover count by reason
- Top slow models

Primary drilldown:

- `provider/model -> failover reason -> logs`

## Row 5: Context Path

Purpose: answer "is large-context handling causing latency or instability?"

Panels:

- Compaction count by trigger/outcome
- Compaction duration `p95` by trigger
- Memory flush count by reason/outcome
- Memory flush duration `p95`
- Compaction failures / timeouts

Primary drilldown:

- `trigger -> outcome -> logs`

## Row 6: Tool Path

Purpose: answer "is work happening inside tools, or between tool batches?"

Panels:

- Tool call count by tool
- Tool duration `p95` by tool
- Tool error ratio by tool
- Inter-tool gap `p95` by `prev_tool -> next_tool`
- Top slow tools
- Top slow tool chains

Primary drilldown:

- `tool -> prev/next tool -> logs`

This row is required because recent incident analysis showed that the dominant latency came from long gaps between tool batches, not from individual Feishu Bitable API calls.

## Row 7: Incident Tables

Purpose: provide jump-off points into logs without changing dashboards.

Panels:

- Recent failover reasons
- Recent compaction failures
- Recent memory flush failures
- Top slow lanes
- Top slow tools

All tables in this row should include data links into Grafana Explore / Loki.

## Variables

Top-level visible variables should stay small:

- `channel`
- `agent`
- `provider`
- `model`
- `outcome`

Variables such as `lane`, `tool`, `failover_reason`, and `compaction_trigger` should not all be exposed globally. They either belong to row-specific queries, hidden variables, or panel data links.

## Required Metric Additions

Current metrics already support message, queue, session, and run-level summaries. The following additional low-cardinality metrics are needed to make the redesign useful.

### 1. Failover

New metrics:

- `openclaw.failover.total`

Labels:

- `stage`
- `decision`
- `reason`
- `provider`
- `model`
- `candidate_provider`
- `candidate_model`

Primary log sources today:

- `src/agents/pi-embedded-runner/run/failover-observation.ts`
- `src/agents/model-fallback-observation.ts`

### 2. Compaction

New metrics:

- `openclaw.compaction.total`
- `openclaw.compaction.duration_ms`

Labels:

- `trigger`
- `outcome`
- `provider`
- `model`

Primary source today:

- `src/agents/pi-embedded-runner/compact.ts`

### 3. Memory Flush

New metrics:

- `openclaw.memory_flush.total`
- `openclaw.memory_flush.duration_ms`

Labels:

- `reason`
- `outcome`

Primary source today:

- `src/auto-reply/reply/agent-runner-memory.ts`

### 4. Prompt Duration

New metrics:

- `openclaw.prompt.duration_ms`

Labels:

- `provider`
- `model`
- `channel`

Primary source today:

- `src/agents/pi-embedded-runner/run/attempt.ts`

### 5. Tool Duration

New metrics:

- `openclaw.tool.call.total`
- `openclaw.tool.duration_ms`

Labels:

- `tool`
- `outcome`

Primary source today:

- `src/agents/pi-embedded-subscribe.handlers.tools.ts`

### 6. Inter-tool Gap

New metrics:

- `openclaw.tool.gap_ms`

Labels:

- `prev_tool`
- `next_tool`

Primary source today:

- `src/agents/pi-embedded-subscribe.handlers.tools.ts`

## Panel Interaction and Data Links

Every top-N table and most symptom stats should include a data link into Grafana Explore with the relevant Loki filters prefilled.

Examples:

- Failover panels link to failover decision logs
- Compaction panels link to `[compaction-diag]`
- Prompt panels link to `embedded run prompt end`
- Tool panels link to `embedded run tool start/end`

The dashboard should not force the operator to manually rebuild filters after spotting an anomaly.

## Rollout Plan

Phase 1:

- Reorganize the existing dashboard into the new row structure using existing metrics.
- Add data links from summary panels and top-N tables into Explore / Loki.

Phase 2:

- Add the missing low-cardinality metrics for failover, compaction, memory flush, prompt duration, tool duration, and tool gaps.
- Add the new stage-specific panels to the same dashboard.

Phase 3:

- Replace average-based latency panels with percentile-based variants where the metric shape supports it.
- Trim or remove older panels that duplicate the new drilldown path without adding value.

## Risks

- Adding too many visible template variables will make the single dashboard harder to use than the current one.
- Adding high-cardinality labels would damage metrics cost and query usability.
- Leaving old average-based panels as the primary symptom indicators will preserve current blind spots.
- Failing to add data links will keep operators bouncing manually between dashboard and Explore.

## Validation

The redesign should be validated against at least one known slow-session incident and should prove that an operator can answer the following within a few minutes:

1. Is the issue queueing, model execution, context handling, or tools?
2. Which dimension explains the slow stage?
3. Which logs should be opened next?

Validation should explicitly include the recent Feishu slow-session patterns:

- timeout-driven failover
- long compaction runs
- long prompt phases
- long inter-tool gaps with normal per-tool API latency
