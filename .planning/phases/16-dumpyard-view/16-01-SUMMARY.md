---
phase: 16-dumpyard-view
plan: "01"
status: complete
completed: 2026-05-20
commit: 1914245
---

## What Was Built

1. **src/renderer/src/stores/task-groomer-store.ts** — Zustand store with:
   - State: `tasks`, `loading`, `error`, `activeTab`, `selectedTaskId`
   - `loadTasks()`: calls `window.api.taskgroomer.listTasks()`, sorts newest-first by `createdAt`
   - `updateTaskStatus(id, status)`: optimistic update → IPC call → revert on error
   - `setActiveTab()` / `setSelectedTaskId()` — simple setters
   - `isTaskStale(task)`: returns true when dump task has `updatedAt` ≥ 3 days ago
   - `staleDays(task)`: returns integer days since `updatedAt` for badge label

## Deviations

None. Plan implemented exactly as specified.

## Key Decisions

- `updatedAt` used as staleness anchor (covers re-dump case — user moved task back to dump)
- Optimistic update applied immediately to `tasks[]`; reverts to `prev` on IPC error
- Task type used directly from global declaration in `electron.d.ts` (no import needed)
- Sort applied after fetch in `loadTasks` action, not in store state getter

## Self-Check: PASSED

Files created:
- FOUND: src/renderer/src/stores/task-groomer-store.ts

TypeScript: zero errors
Commit: 1914245
