---
phase: 21-intake-grooming-improvements-comments
plan: "02"
subsystem: database
tags: [sqlite, better-sqlite3, ipc, electron, taskgroomer, comments]

# Dependency graph
requires:
  - phase: 14-task-groomer-foundation
    provides: TaskDatabase class, Task interface, IPC handler registration pattern
  - phase: 18-task-groomer-ai-agent
    provides: version < 2 migration pattern (priority_rationale column)
provides:
  - comments TEXT column on tasks table (version 3 migration, idempotent)
  - TaskComment interface (id, text, createdAt, updatedAt)
  - TaskDatabase.addComment / updateComment / deleteComment CRUD methods
  - IPC channels taskgroomer:addComment, taskgroomer:updateComment, taskgroomer:deleteComment
  - contextBridge exposure of three comment channels in preload
  - TaskComment interface + comments field on Task in electron.d.ts
affects:
  - 21-03-PLAN (Notes tab UI — will call these IPC channels)
  - Any phase reading Task objects (comments field now always present)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON column pattern: store structured arrays as TEXT, parse with try/catch fallback to []"
    - "Exclusive column management: comments never touched by updateTask / CAMEL_TO_SNAKE — dedicated methods only"
    - "Idempotent schema migration: version guard + try/catch around ALTER TABLE"

key-files:
  created: []
  modified:
    - src/main/taskgroomer/database.ts
    - src/main/ipc-handlers.ts
    - src/preload/index.ts
    - src/renderer/src/types/electron.d.ts

key-decisions:
  - "Comments column managed exclusively by addComment/updateComment/deleteComment — CAMEL_TO_SNAKE does NOT include 'comments', so updateTask (used by AI re-groom) never clobbers user annotations"
  - "comments field on Task interface is always TaskComment[] (never null) — rowToTask uses IIFE with try/catch to guarantee empty array fallback"
  - "Migration uses version < 3 guard with try/catch around ALTER TABLE — safe for both fresh installs and existing DBs with comments column already present"

patterns-established:
  - "JSON array column: TEXT DEFAULT '[]' + JSON.parse in rowToTask with IIFE try/catch"
  - "Dedicated method CRUD for columns that must not be touched by generic updateTask"

requirements-completed: [GROOM-03]

# Metrics
duration: 3min
completed: 2026-05-21
---

# Phase 21 Plan 02: Comments Persistence Backend Summary

**SQLite comments column (version 3 migration), TaskComment CRUD in TaskDatabase, three IPC channels, preload bridge, and Task type extension — all backend plumbing for the Notes tab UI**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-21T09:50:48Z
- **Completed:** 2026-05-21T09:53:36Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `comments TEXT DEFAULT '[]'` column to tasks table via version 3 idempotent migration
- Implemented `addComment`, `updateComment`, `deleteComment` methods on `TaskDatabase` — isolated from the `updateTask` / `CAMEL_TO_SNAKE` path so re-grooming never clobbers user comments
- Wired three IPC handlers (`taskgroomer:addComment`, `taskgroomer:updateComment`, `taskgroomer:deleteComment`) and exposed them via `contextBridge` in preload
- Extended `electron.d.ts` with `TaskComment` interface and `comments: TaskComment[]` on `Task` — renderer-visible and type-safe

## Task Commits

Each task was committed atomically:

1. **Task 1: Add comments column to TaskDatabase + CRUD methods** - `83c90b5` (feat)
2. **Task 2: Wire comment IPC handlers + preload bridge + electron.d.ts types** - `43df137` (feat)

**Plan metadata:** committed with final docs commit

## Files Created/Modified
- `src/main/taskgroomer/database.ts` — TaskComment export, TaskRow.comments, Task.comments, version < 3 migration, rowToTask mapping, addComment/updateComment/deleteComment methods
- `src/main/ipc-handlers.ts` — import TaskComment type, three new ipcMain.handle registrations
- `src/preload/index.ts` — addComment, updateComment, deleteComment in taskgroomer contextBridge object
- `src/renderer/src/types/electron.d.ts` — TaskComment interface, comments field on Task, three methods on ElectronAPI.taskgroomer

## Decisions Made
- `comments` intentionally excluded from `CAMEL_TO_SNAKE` map — enforces the invariant that re-grooming (which calls `updateTask` with AI fields) never overwrites user comments
- `Task.comments` typed as `TaskComment[]` (never `null`) — `rowToTask` guarantees `[]` fallback via IIFE try/catch; renderer code never needs null-guards on this field
- Version 3 migration uses try/catch around ALTER TABLE — idempotent for DBs where column was pre-created

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `tsconfig.web.json` (unrelated files: AboutView, MissionControl, rich-text-editor, cortex components, etc.) — confirmed out-of-scope, not caused by this plan's changes. All files modified in this plan compile cleanly.

## User Setup Required
None — no external service configuration required. SQLite migration runs automatically on next app start.

## Next Phase Readiness
- Backend plumbing complete: DB column + CRUD + IPC + preload + types all in place
- Plan 21-03 (Notes tab UI) can call `window.api.taskgroomer.addComment`, `updateComment`, `deleteComment` immediately
- No blockers

---
*Phase: 21-intake-grooming-improvements-comments*
*Completed: 2026-05-21*
