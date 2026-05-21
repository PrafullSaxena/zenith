---
phase: 21-intake-grooming-improvements-comments
plan: "03"
subsystem: task-groomer
tags: [ui, ipc, zustand, progress-stages, sources-ribbon]
dependency_graph:
  requires: [21-01]
  provides: [groomStage-ui, sourcesUsed-ui, SourcesRibbon]
  affects: [task-groomer-store, ipc-handlers, TaskGroomerView, TaskSidePanel]
tech_stack:
  added: []
  patterns: [stage-event-callback, inline-component-pattern, shimmer-with-stage]
key_files:
  created: []
  modified:
    - src/main/ipc-handlers.ts
    - src/renderer/src/stores/task-groomer-store.ts
    - src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx
    - src/renderer/src/plugins/task-groomer/TaskSidePanel.tsx
    - src/renderer/src/types/electron.d.ts
decisions:
  - groomStage resets to null both on startGroom (before run) and on __run_complete__ (after run)
  - SourcesRibbon defined as inline function inside TaskSidePanel.tsx (no separate file)
  - Ticket icon confirmed available in installed lucide-react version (verified with find)
  - FileText icon reused from existing imports for Confluence entry in ribbon
  - shimmer 'grooming' event now stage-specific (no longer a standalone pre-try push)
metrics:
  duration: 388s
  completed_date: "2026-05-21"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
requirements: [GROOM-03, GROOM-04]
---

# Phase 21 Plan 03: Groom Stage Labels + Integration Sources Ribbon Summary

Wire the two-pass grooming stages (analyzing / querying / summarizing) into the renderer via groomStage store field and stage-aware Groom button labels, and render a SourcesRibbon component in TaskSidePanel showing which of the 4 sources (AI, Jira, Confluence, Google) were queried for each groomed task.

## What Was Built

### Task 1: IPC, types, and store updates

**src/main/ipc-handlers.ts:**
- `runGroomingBatch` now passes an `onStage` callback to `groomTask` instead of pushing a standalone 'grooming' event before the try block. Each AI stage emits a stage-specific progress event with `stage: 'analyzing' | 'querying' | 'summarizing'`.
- Both the batch 'done' push and the `taskgroomer:regroom` return value now include `sourcesUsed` from the GroomingResult.

**src/renderer/src/types/electron.d.ts:**
- `Task` interface gains `sourcesUsed: ('ai' | 'jira' | 'confluence' | 'google')[] | null`.
- `onGroomProgress` callback data type gains optional `stage?: 'analyzing' | 'querying' | 'summarizing'`.
- `reGroom` return result includes `sourcesUsed: ('ai' | 'jira' | 'confluence' | 'google')[]`.

**src/renderer/src/stores/task-groomer-store.ts:**
- `TaskGroomerState` gains `groomStage: 'analyzing' | 'querying' | 'summarizing' | null` (initial: null).
- `startGroom` resets `groomStage: null` alongside `groomingActive: true`.
- `handleGroomProgress`:
  - When `status === 'grooming'` and `stage` is present: sets `groomStage`.
  - When `taskId === '__run_complete__'`: resets `groomStage: null`.
  - When `status === 'done'`: writes `sourcesUsed: taskResult.sourcesUsed ?? null` onto the task.
- `startReGroom` in-place update includes `sourcesUsed: r.sourcesUsed ?? null`.

### Task 2: UI components

**src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx:**
- Reads `groomStage` from store.
- Groom button label when `groomingActive`:
  - `'analyzing'` → "Analyzing tasks..."
  - `'querying'` → "Querying sources..."
  - `'summarizing'` → "Summarizing..."
  - `null` → "Grooming N..." (fallback during transition)
- Groom button `title` attribute shows capitalized stage name when active.

**src/renderer/src/plugins/task-groomer/TaskSidePanel.tsx:**
- New icons imported: `Bot`, `Ticket`, `Globe` (from lucide-react; Ticket confirmed available).
- Inline `SourcesRibbon` component with `RIBBON_ICONS` config: AI (violet), Jira (blue), Confluence (sky), Google (emerald).
- Active sources render at full color; unused sources at 30% opacity + grayscale.
- Ribbon placed at top of Grooming Results content (`hasGroomingData` branch), above priority/action badges.
- Rendered conditionally: `{task.sourcesUsed && <SourcesRibbon ... />}` — hidden until task has been groomed with the new agent.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All modified files exist on disk. Both task commits confirmed in git log:
- `14cb474` — Task 1: groomStage + sourcesUsed through IPC, store, and types
- `49d84f3` — Task 2: stage-aware Groom button labels + SourcesRibbon in TaskSidePanel
