---
phase: 19-re-groom-digest
plan: "01"
subsystem: ipc
tags: [electron, ipc, taskgroomer, preload, typescript]

# Dependency graph
requires:
  - phase: 18-ai-grooming-engine
    provides: groomTask() function, groomingRunActive lock, TaskDatabase with listTasks/updateTask

provides:
  - taskgroomer:regroom IPC handler in main process
  - window.api.taskgroomer.reGroom(taskId) preload bridge method
  - Typed reGroom declaration in ElectronAPI (electron.d.ts)

affects:
  - 19-02 (renderer hook/store that calls reGroom)
  - 19-03 (UI button that triggers reGroom)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-task re-groom reuses shared groomingRunActive lock — one AI call at a time"
    - "Jira merge strategy: null-coalescing preserves existing key/URL when AI returns null"
    - "Re-groom returns full merged result synchronously (unlike batch groom fire-and-forget)"

key-files:
  created: []
  modified:
    - src/main/ipc-handlers.ts
    - src/preload/index.ts
    - src/renderer/src/types/electron.d.ts

key-decisions:
  - "taskgroomer:regroom awaits full result and returns it synchronously — no fire-and-forget pattern like batch groom"
  - "listTasks() called without status filter — re-groom works on any task status"
  - "Jira merge: result.jiraTicketKey ?? existingJiraKey — only overwrites if AI returns non-null"
  - "Task status not changed during re-groom — stays in current status per user decision"

patterns-established:
  - "Preload uses inline return type (unknown pattern); electron.d.ts uses Task['field'] references for typed returns"

requirements-completed:
  - GROOM-05

# Metrics
duration: 8min
completed: 2026-05-20
---

# Phase 19 Plan 01: Re-groom IPC Foundation Summary

**taskgroomer:regroom IPC handler wired in main process with shared lock, Jira merge strategy, and typed preload bridge exposed as window.api.taskgroomer.reGroom(taskId)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-20T18:00:00Z
- **Completed:** 2026-05-20T18:06:41Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `taskgroomer:regroom` IPC handler registered in `registerIpcHandlers()` after `taskgroomer:groom`
- Handler uses shared `groomingRunActive` module-level lock — returns `{started: false, reason: 'already_running'}` if batch is running
- Jira merge strategy: `result.jiraTicketKey ?? existingJiraKey` — preserves existing Jira ticket when AI returns null
- Handler returns merged result synchronously (not fire-and-forget) so renderer can update task in-place
- `reGroom(taskId)` bridge method added to preload with full inline return type annotation
- Typed `reGroom` declaration added to `ElectronAPI` in `electron.d.ts` using `Task['priority']` and `Task['suggestedAction']` references

## Task Commits

Each task was committed atomically:

1. **Task 1: Add taskgroomer:regroom IPC handler in main process** - `841b583` (feat)
2. **Task 2: Add reGroom to preload bridge and electron.d.ts types** - `3797ffb` (feat)

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP docs commit

## Files Created/Modified
- `src/main/ipc-handlers.ts` - Added `taskgroomer:regroom` handler with lock, groomTask call, Jira merge, and result return
- `src/preload/index.ts` - Added `reGroom` to `taskgroomer` object with typed inline return
- `src/renderer/src/types/electron.d.ts` - Added `reGroom` typed declaration to `ElectronAPI.taskgroomer`

## Decisions Made
- `taskgroomer:regroom` awaits full result and returns it synchronously — this differs intentionally from `taskgroomer:groom` which is fire-and-forget. Re-groom is a user-initiated single-task operation that needs an immediate response.
- `listTasks()` called without status filter — re-groom works on any task status (dump, groomed, done, delegated, aborted) per user decision from planning.
- Task status is not changed during re-groom — the handler only updates grooming metadata fields.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing TypeScript errors in unrelated files (cortex parser, nebula transcription, pdf-generator) were present before this plan and are out of scope per deviation boundary rules.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `taskgroomer:regroom` IPC channel is live and ready for Plans 02 and 03
- Plan 02 can now wire the Zustand store action and renderer hook that calls `window.api.taskgroomer.reGroom`
- Plan 03 can add the UI re-groom button that dispatches that store action

---
*Phase: 19-re-groom-digest*
*Completed: 2026-05-20*
