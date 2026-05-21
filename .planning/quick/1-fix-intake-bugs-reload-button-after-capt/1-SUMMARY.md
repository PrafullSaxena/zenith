---
phase: quick
plan: 1
subsystem: task-groomer
tags: [bug-fix, ui, ipc, zustand]
dependency_graph:
  requires: []
  provides: [reload-button-header, regroom-status-groomed]
  affects: [TaskGroomerView, task-groomer-store, ipc-handlers]
tech_stack:
  added: []
  patterns: [optimistic-update, in-place-zustand-update, status-promotion-on-regroom]
key_files:
  created: []
  modified:
    - src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx
    - src/renderer/src/stores/task-groomer-store.ts
    - src/main/ipc-handlers.ts
decisions:
  - "Phase 19-01 decision ('Task status NOT changed during re-groom') intentionally overridden — product requirement is that re-grooming promotes task to 'groomed'"
  - "Reload button placed as first item in statusIndicator div (before Kanban/List toggle and Groom button) so it is always visible regardless of active tab"
metrics:
  duration_seconds: 170
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
  completed_date: "2026-05-21"
---

# Quick Plan 1: Fix InTake Bugs — Reload Button + Re-groom Status Summary

**One-liner:** Added RefreshCw reload button to InTake header and fixed re-groom to promote task status to 'groomed' in both SQLite DB and Zustand store.

## What Was Built

Two targeted bug fixes for the InTake (Task Groomer) plugin:

1. **Reload button** — a RefreshCw icon button added as the first item in the `statusIndicator` of `PageHeader`. Clicking it calls `loadTasks()` and re-fetches all tasks from SQLite. The button shows `animate-spin` while loading and is disabled with `cursor-not-allowed` + `opacity-50` during the loading state.

2. **Re-groom status fix** — after a successful re-groom operation:
   - `ipc-handlers.ts` (`taskgroomer:regroom` handler): `db.updateTask` now includes `status: 'groomed'` in the fields object, persisting the promotion to SQLite.
   - `task-groomer-store.ts` (`startReGroom` action): the Zustand in-place update now includes `status: 'groomed' as const`, so the UI reflects the correct status immediately without requiring a reload.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add manual reload button to TaskGroomerView header | f24aacc | TaskGroomerView.tsx |
| 2 | Fix re-groom to set task status to 'groomed' on success | 1b885dd | ipc-handlers.ts, task-groomer-store.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx` — FOUND (reload button added, RefreshCw imported)
- `src/main/ipc-handlers.ts` — FOUND (status: 'groomed' in db.updateTask fields)
- `src/renderer/src/stores/task-groomer-store.ts` — FOUND (status: 'groomed' as const in startReGroom)
- Commit f24aacc — FOUND
- Commit 1b885dd — FOUND
- Pre-existing TypeScript errors in unrelated files (cortex-store, GroomedKanban, etc.) confirmed pre-existing via git stash verification — not introduced by this plan.
