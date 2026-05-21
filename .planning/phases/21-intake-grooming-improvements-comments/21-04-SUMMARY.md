---
phase: 21-intake-grooming-improvements-comments
plan: "04"
subsystem: ui
tags: [zustand, react, lucide-react, ipc, optimistic-updates, comments]

# Dependency graph
requires:
  - phase: 21-intake-grooming-improvements-comments
    provides: "Plan 02 — addComment/updateComment/deleteComment IPC channels in preload + electron.d.ts; TaskComment type; comments column in tasks.db"
provides:
  - "addComment/updateComment/deleteComment Zustand store actions with optimistic delete"
  - "Notes tab UI in TaskSidePanel Dialog with full comment CRUD and timestamped display"
  - "Comment count badge on Notes tab button"
  - "key={task?.id} on DialogContent for automatic state reset on task switch"
affects:
  - "TaskSidePanel rendering"
  - "task-groomer-store comment state"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic delete pattern: snapshot prev → apply locally → confirm via IPC → revert on error"
    - "key= on DialogContent to reset all local useState without useEffect cleanup"
    - "Two-tab layout via activeTab local state + conditional render (no external tab library)"

key-files:
  created: []
  modified:
    - src/renderer/src/stores/task-groomer-store.ts
    - src/renderer/src/plugins/task-groomer/TaskSidePanel.tsx

key-decisions:
  - "key={task?.id ?? 'none'} on DialogContent resets all local state (tab, editing state) automatically when task changes — simpler than useEffect cleanup"
  - "No error toasts for comment actions — comment operations are low-stakes; IPC layer handles errors"
  - "deleteComment is optimistic: immediate local remove, confirm with server Task, revert on failure"
  - "Notes tab reads task.comments from store task object — never touched by grooming operations (per Plan 02 CAMEL_TO_SNAKE exclusion)"

patterns-established:
  - "Optimistic comment delete: snapshot prev tasks, apply filter, try IPC, catch revert — same shape as deleteTask"
  - "Two-tab modal: button + border-b-2 underline indicator + conditional render per tab — no Tabs primitive needed"

requirements-completed: [GROOM-03]

# Metrics
duration: 5min
completed: 2026-05-21
---

# Phase 21 Plan 04: Notes Tab UI + Comment CRUD Summary

**Notes tab wired to Zustand comment store actions (addComment/updateComment/deleteComment via IPC), with timestamped thread display, inline edit mode, optimistic delete, and automatic state reset on task switch.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-21T10:09:19Z
- **Completed:** 2026-05-21T10:14:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Three comment store actions added to TaskGroomerState with correct IPC wiring and optimistic delete (revert on IPC error)
- Notes tab renders timestamped comment thread — each entry shows timestamp, text, Edit button, Delete button
- Inline edit mode: pre-filled textarea + Save/Cancel, hides after Save
- New comment textarea at bottom with explicit Save button, clears on submit
- Comment count badge on Notes tab when comments exist
- Grooming operations can never clear comments (store actions only modify via addComment/updateComment/deleteComment)

## Task Commits

1. **Task 1: Add comment actions to task-groomer-store.ts** - `f49ef86` (feat)
2. **Task 2: Notes tab UI in TaskSidePanel.tsx** - `9e3f3e7` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/renderer/src/stores/task-groomer-store.ts` — Added addComment/updateComment/deleteComment to interface and implementation
- `src/renderer/src/plugins/task-groomer/TaskSidePanel.tsx` — Added two-tab layout, Notes tab with full comment CRUD UI

## Decisions Made
- key={task?.id ?? 'none'} on DialogContent: resets all local state on task switch without useEffect — cleaner than manual reset
- No toast on comment errors: low-stakes operation; IPC layer handles failure
- deleteComment optimistic: matches existing deleteTask pattern in the store (snapshot → apply → confirm/revert)
- Notes tab reads directly from task.comments in store — comments field excluded from grooming update path (established in Plan 02)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TS2304 "Cannot find name 'Task'" errors in both files (from tsconfig.web.json not resolving the global Task declared in electron.d.ts) — confirmed pre-existing before this plan's changes via git stash test. These are out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 21 (4 plans) is now complete:
- Plan 01: Two-pass grooming agent + structured Summary+Next Steps output
- Plan 02: Comment IPC channels + SQLite schema migration
- Plan 03: Groom stage labels + SourcesRibbon
- Plan 04: Notes tab UI (this plan)

All GROOM-03 requirements satisfied. Task comments are persistent, re-groom-safe, and fully CRUD-capable from the modal UI.

---
*Phase: 21-intake-grooming-improvements-comments*
*Completed: 2026-05-21*
