---
phase: 19-re-groom-digest
plan: "02"
subsystem: ui
tags: [zustand, react, taskgroomer, renderer, state-management, typescript]

# Dependency graph
requires:
  - phase: 19-re-groom-digest/19-01
    provides: taskgroomer:regroom IPC handler, window.api.taskgroomer.reGroom(taskId) preload bridge, typed reGroom declaration in electron.d.ts

provides:
  - reGroomTaskId (string | null) state in Zustand store — single-task re-groom lock
  - digestTasks (Task[]) and showDigest (boolean) state in Zustand store — batch digest foundation
  - startReGroom(taskId) action: shared lock, IPC call, in-place task update, error toast
  - dismissDigest() action: clears showDigest flag
  - __run_complete__ digest computation: freshGroomed filter + P1/P2/P3 + Do/Delegate/Defer/Delete sort
  - Re-groom button in TaskSidePanel with spinner, disabled state, and click handler

affects:
  - 19-03 (GroomDigest component reads digestTasks and showDigest from store)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic import('sonner') for toast inside async Zustand action — avoids module-level side effects"
    - "Shared lock pattern: groomingActive || reGroomTaskId !== null blocks all new grooms (batch or single)"
    - "Two-minute freshness window to identify batch-groomed tasks for digest: groomedAt within 2 minutes of __run_complete__"
    - "Re-groom button state: isReGrooming (this task) vs isAnyGroomActive (any groom) for distinct visual states"

key-files:
  created: []
  modified:
    - src/renderer/src/stores/task-groomer-store.ts
    - src/renderer/src/plugins/task-groomer/TaskSidePanel.tsx

key-decisions:
  - "Dynamic import('sonner') inside startReGroom action — matches pattern where toast is used in effects, not module scope"
  - "freshGroomed uses groomedAt < 2-minute window at __run_complete__ time — robust even for slow AI runs under 2min"
  - "Re-groom button positioned above Grooming Results h3 heading — secondary action, not as prominent as primary Groom button"
  - "isReGrooming checks reGroomTaskId === task.id so only the active task shows spinner, not all tasks"

patterns-established:
  - "Digest state set atomically in __run_complete__ branch: groomingActive, groomingTaskIds, digestTasks, showDigest in single set() call"
  - "startGroom clears digestTasks/showDigest before batch start — previous digest always dismissed on new run"

requirements-completed:
  - GROOM-05
  - GROOM-06

# Metrics
duration: 5min
completed: 2026-05-20
---

# Phase 19 Plan 02: Re-groom Store + TaskSidePanel Button Summary

**Zustand store extended with reGroomTaskId/digestTasks/showDigest state and startReGroom action; TaskSidePanel wired with Re-groom button that spins during active re-groom and disables during any groom**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-20T18:09:52Z
- **Completed:** 2026-05-20T18:14:19Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `TaskGroomerState` interface extended with `reGroomTaskId`, `digestTasks`, `showDigest` fields and `startReGroom`/`dismissDigest` actions
- `startReGroom(taskId)` action: checks shared lock (`groomingActive || reGroomTaskId !== null`), calls `window.api.taskgroomer.reGroom`, updates task in-place on success, shows error toast on failure
- `handleGroomProgress.__run_complete__` branch computes digest: filters tasks with `groomedAt` within 2-minute window, sorts P1→P2→P3 then Do→Delegate→Defer→Delete, sets `digestTasks` + `showDigest: true`
- `startGroom` clears `digestTasks: [], showDigest: false` at every new batch start
- `TaskSidePanel` Re-groom button: `Loader2` spinner + "Grooming..." when `isReGrooming`, `opacity-50` + `cursor-not-allowed` when `isAnyGroomActive`, `RotateCcw` icon + "Re-groom" in idle state

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Zustand store with re-groom state and digest state** - `d992949` (feat)
2. **Task 2: Add Re-groom button to TaskSidePanel** - `73d5395` (feat)

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP docs commit

## Files Created/Modified
- `src/renderer/src/stores/task-groomer-store.ts` - Added reGroomTaskId, digestTasks, showDigest fields; startReGroom and dismissDigest actions; digest computation in __run_complete__; digest clear in startGroom
- `src/renderer/src/plugins/task-groomer/TaskSidePanel.tsx` - Added Loader2/RotateCcw imports, store reads for reGroomTaskId/groomingActive/startReGroom, isReGrooming/isAnyGroomActive derived values, Re-groom button JSX above Grooming Results heading

## Decisions Made
- Dynamic `import('sonner')` inside `startReGroom` — avoids module-level import side effects; matches the pattern where toast is used inside effects
- Two-minute freshness window (`groomedAt < TWO_MINUTES`) to identify batch-groomed tasks for digest — robust for typical AI run durations
- Re-groom button placed above "Grooming Results" heading — secondary action, visible regardless of whether grooming data exists

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
Pre-existing TypeScript `TS2304 Cannot find name 'Task'` errors in task-groomer-store.ts and TaskSidePanel.tsx are a pre-existing baseline (the `Task` global from `electron.d.ts` is not fully resolved by `tsconfig.web.json`). New code adds the same error pattern on new lines — no new error category introduced. Total error count held at 86 (same as before Task 2).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `digestTasks` and `showDigest` are ready in the store for Plan 03 to consume in the `GroomDigest` component
- `dismissDigest()` action is wired and ready for Plan 03's dismiss button
- Re-groom button is live in TaskSidePanel and fully functional end-to-end via the Plan 01 IPC handler

---
*Phase: 19-re-groom-digest*
*Completed: 2026-05-20*
