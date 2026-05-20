---
phase: 18-ai-grooming-engine
plan: "02"
subsystem: ipc
tags: [electron, ipc, taskgroomer, schedule, ai-grooming]

# Dependency graph
requires:
  - phase: 18-01
    provides: groomTask(task) function and GroomingResult interface from grooming-agent.ts
provides:
  - taskgroomer:groom IPC handler registered in registerIpcHandlers()
  - runGroomingBatch function pushing per-task progress events on taskgroomer:groom:progress
  - initGroomingSchedule export with 3s catch-up and 60s poll schedule
  - taskgroomer:groom:start push event for schedule-triggered runs
  - groomingRunActive flag preventing concurrent batch runs
affects: [18-03, 18-04, renderer task groomer UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget IPC: handler returns immediately, async batch runs in background"
    - "Per-task push events over named IPC channel for streaming UI updates"
    - "isDestroyed() guard before webContents.send() in interval/timeout callbacks"
    - "Schedule catch-up: 3s delayed check on app start, 60s poll for scheduled time"

key-files:
  created: []
  modified:
    - src/main/ipc-handlers.ts
    - src/main/index.ts

key-decisions:
  - "isDestroyed() guard added in initGroomingSchedule before every webContents.send() call — window may close between setInterval tick and send"
  - "taskgroomer:groom handler returns {started: true} immediately (fire-and-forget) — batch runs as background async task"
  - "groomingRunActive module-level flag prevents double-trigger from both IPC and schedule"
  - "taskgroomer:groom:start is a separate push channel for schedule-triggered runs so renderer can react without initiating the IPC call"

patterns-established:
  - "Task groomer IPC: handler returns immediately, progress pushed per-task, sentinel event signals completion"

requirements-completed: [GROOM-01, GROOM-02]

# Metrics
duration: 1min
completed: 2026-05-20
---

# Phase 18 Plan 02: IPC Handler and Grooming Schedule Summary

**taskgroomer:groom IPC handler wired to grooming-agent with per-task progress push events, run-complete sentinel, and 60s schedule with app-start catch-up**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-05-20T08:47:30Z
- **Completed:** 2026-05-20T08:48:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Registered `taskgroomer:groom` IPC handler with fire-and-forget pattern (returns `{started: true}` immediately)
- Implemented `runGroomingBatch` pushing `grooming`/`done`/`failed` per-task progress events plus run-complete sentinel
- Exported `initGroomingSchedule` with 3s catch-up check on app start and 60s polling interval
- Wired `initGroomingSchedule(mainWindow)` in `main/index.ts` after `initPricingSync`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add taskgroomer:groom IPC handler with per-task progress push events** - `733932d` (feat)
2. **Task 2: Wire initGroomingSchedule in main/index.ts** - `a1325e0` (feat)

## Files Created/Modified
- `src/main/ipc-handlers.ts` - Added groomingRunActive flag, taskgroomer:groom handler, runGroomingBatch, initGroomingSchedule export
- `src/main/index.ts` - Added initGroomingSchedule import and call after initPricingSync

## Decisions Made
- `isDestroyed()` guard added before every `webContents.send()` in schedule callbacks — flagged by plan checker; window may be closed between the `setInterval`/`setTimeout` tick and the actual send
- `taskgroomer:groom` returns immediately with `{started: true}`; batch runs via `runGroomingBatch(win).finally(...)` — keeps renderer responsive during long AI calls
- `groomingRunActive` is module-level so both the IPC handler and the schedule share the same lock, preventing overlap

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added isDestroyed() guards in initGroomingSchedule**
- **Found during:** Task 1 (implementing initGroomingSchedule)
- **Issue:** Plan specified `mainWindow.webContents.send(...)` calls directly in setTimeout and setInterval callbacks, but the window can be destroyed between the tick firing and the send executing. The plan checker flagged this explicitly in the additional context.
- **Fix:** Added `if (mainWindow.isDestroyed()) return` at the top of both the `setTimeout` callback (3s catch-up) and the `setInterval` callback (60s poll), before any DB access or send calls.
- **Files modified:** src/main/ipc-handlers.ts
- **Verification:** TypeScript compiles clean; zero TS errors.
- **Committed in:** 733932d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical safety guard)
**Impact on plan:** Necessary correctness fix; prevents crash-on-send-to-destroyed-window. Zero scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- IPC layer complete: renderer can invoke `taskgroomer:groom` and listen to `taskgroomer:groom:progress` and `taskgroomer:groom:start`
- Phase 18-03 can now build the renderer-side Zustand store and Groom button UI that consumes these channels

---
*Phase: 18-ai-grooming-engine*
*Completed: 2026-05-20*
