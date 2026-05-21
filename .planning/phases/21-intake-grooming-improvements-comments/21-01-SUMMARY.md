---
phase: 21-intake-grooming-improvements-comments
plan: "01"
subsystem: taskgroomer/grooming-agent
tags: [grooming, ai, two-pass, ipc, typescript]
dependency_graph:
  requires: []
  provides: [groomTask, GroomingResult]
  affects: [ipc-handlers.ts/runGroomingBatch, ipc-handlers.ts/taskgroomer:regroom]
tech_stack:
  added: []
  patterns: [two-pass-ai, onStage-callback, sourcesUsed-tracking, no-sources-optimization]
key_files:
  created: []
  modified:
    - src/main/taskgroomer/grooming-agent.ts
decisions:
  - "Pass-1 doubles as pass-2 for simple tasks (no-sources optimization) — single AI call for self-evident tasks"
  - "sourcesUsed tracks which sources actually returned results (not just attempted)"
  - "evidenceSummary kept as backward-compat alias for summary — ipc-handlers.ts unchanged"
  - "maxOutputTokens used instead of maxTokens — AI SDK v3 renamed the parameter"
  - "onStage callback is optional — existing callers without it compile and run unchanged"
  - "Independent AI calls for pass-1 and pass-2 (not shared conversation context) — simpler implementation"
metrics:
  duration: 284s
  completed: 2026-05-21
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 21 Plan 01: Two-Pass Grooming Agent Summary

**One-liner:** Two-pass groomTask with source-selective AI calls, sourcesUsed tracking, and structured Summary+NextSteps output replacing flat evidenceSummary.

## What Was Built

Rewrote `src/main/taskgroomer/grooming-agent.ts` with a two-pass architecture:

**GroomingResult interface additions:**
- `summary: string | null` — structured `## Summary\n...\n\n## Next Steps\n...` output from AI
- `nextSteps: string | null` — always null (embedded in summary), kept for type completeness
- `sourcesUsed: ('ai' | 'jira' | 'confluence' | 'google')[]` — which sources were actually queried and returned non-empty results

**groomTask signature update:**
```ts
export async function groomTask(
  task: Task,
  onStage?: (stage: 'analyzing' | 'querying' | 'summarizing') => void
): Promise<GroomingResult>
```

**Two-pass logic:**
- Pass 1 (always): AI decides `sourcesNeeded`. For simple tasks (empty sourcesNeeded), also returns `summary + priority + suggestedAction` — no second AI call needed.
- Pass 2 (sources path only): Queries only the requested integrations in parallel, then calls AI with source results to produce structured summary.

**Stage events:**
- `onStage?.('analyzing')` — before pass-1
- `onStage?.('querying')` — before integration queries
- `onStage?.('summarizing')` — before pass-2

**Backward compatibility:**
- `evidenceSummary` is set to the same value as `summary` — existing DB writes in ipc-handlers.ts and store reads continue to work without changes
- `researchSummary` is null (replaced by structured summary field)
- ipc-handlers.ts `runGroomingBatch` and `taskgroomer:regroom` are unchanged — they call `groomTask(task)` without onStage and the result shape is additive-only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed maxTokens → maxOutputTokens**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** `maxTokens` is not a valid parameter in Vercel AI SDK v3's `generateText()`. The correct parameter is `maxOutputTokens`. The original file had the same error (pre-existing), confirmed by stashing the new file and running tsc.
- **Fix:** Changed `maxTokens: opts.maxTokens` to `maxOutputTokens: opts.maxTokens` in the `callAI` helper.
- **Files modified:** `src/main/taskgroomer/grooming-agent.ts`
- **Commit:** 57a4666

## Self-Check: PASSED

- FOUND: src/main/taskgroomer/grooming-agent.ts
- FOUND: commit 57a4666
- FOUND: 21-01-SUMMARY.md
- TypeScript: zero errors in grooming-agent.ts confirmed
