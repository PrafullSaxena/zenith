---
phase: 18-ai-grooming-engine
plan: 05
subsystem: database, ui
tags: [sqlite, better-sqlite3, react, electron, task-groomer, gap-closure]

# Dependency graph
requires:
  - phase: 18-ai-grooming-engine
    provides: grooming-agent.ts producing priorityRationale and researchLinks fields; tasks.db schema; TaskSidePanel UI shell
provides:
  - priority_rationale TEXT column in tasks.db with version < 2 ALTER TABLE migration guard
  - priorityRationale persisted through full write path: groomTask -> db.updateTask -> tasks.db -> rowToTask
  - TaskSidePanel renders priorityRationale as sub-label beneath priority badge
  - TaskSidePanel parses researchLinks JSON and renders clickable buttons via window.api.app.openExternal
affects: [task-groomer display, grooming persistence, GROOM-04, GROOM-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sequential version < N migration blocks with ALTER TABLE and try/catch for idempotent schema upgrades"
    - "IIFE pattern for JSON.parse try/catch in JSX — avoids extracting a separate component"
    - "window.api.app.openExternal for external links in Electron renderer — never <a href> (CSP blocks)"

key-files:
  created: []
  modified:
    - src/main/taskgroomer/database.ts
    - src/main/ipc-handlers.ts
    - src/renderer/src/types/electron.d.ts
    - src/renderer/src/plugins/task-groomer/TaskSidePanel.tsx

key-decisions:
  - "ALTER TABLE under version < 2 guard with try/catch allows both fresh installs and existing DBs to converge on same schema"
  - "IIFE for JSON.parse keeps try/catch scoped without an extra component or useMemo"
  - "window.api.app.openExternal (not <a href>) for research links — CSP in Electron renderer blocks external navigation"

patterns-established:
  - "Pattern 1: Sequential if(version < N) blocks in initSchema() for all future SQLite column additions"
  - "Pattern 2: IIFE in JSX for inline JSON parsing with graceful fallback on malformed input"

requirements-completed: [GROOM-04, GROOM-03]

# Metrics
duration: 12min
completed: 2026-05-20
---

# Phase 18 Plan 05: Gap Closure — priorityRationale Persistence and researchLinks Rendering

**priorityRationale now persisted to tasks.db via ALTER TABLE migration and rendered beneath the priority badge; researchLinks JSON parsed and rendered as openExternal buttons in TaskSidePanel**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-20T14:18:56Z
- **Completed:** 2026-05-20T14:30:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `priority_rationale TEXT` column to tasks.db via idempotent version < 2 ALTER TABLE migration — survives both fresh installs and existing databases
- Wired `priorityRationale: result.priorityRationale` into `db.updateTask` in `runGroomingBatch` — rationale now persisted on every successful groom, not just pushed ephemerally over IPC
- Rendered `task.priorityRationale` as a sub-label beneath the priority badge in TaskSidePanel using `pl-[4.5rem] -mt-1` alignment
- Parsed `task.researchLinks` JSON in TaskSidePanel using IIFE try/catch and rendered each `{title, url}` entry as a `<button>` calling `window.api.app.openExternal(link.url)` — compliant with Electron CSP restrictions

## Task Commits

Each task was committed atomically:

1. **Task 1: Persist priorityRationale through DB schema, CAMEL_TO_SNAKE map, and ipc-handlers write** - `4eaf446` (feat)
2. **Task 2: Add priorityRationale to renderer Task type and render both rationale and research links in TaskSidePanel** - `276a517` (feat)

**Plan metadata:** _(docs commit — see final_commit step)_

## Files Created/Modified

- `src/main/taskgroomer/database.ts` — Added `priority_rationale: string | null` to TaskRow, `priorityRationale: string | null` to Task interface, `priorityRationale: 'priority_rationale'` to CAMEL_TO_SNAKE, mapping in `rowToTask()`, version < 2 ALTER TABLE migration block
- `src/main/ipc-handlers.ts` — Added `priorityRationale: result.priorityRationale` to `db.updateTask` fields in `runGroomingBatch`
- `src/renderer/src/types/electron.d.ts` — Added `priorityRationale: string | null` to renderer Task interface
- `src/renderer/src/plugins/task-groomer/TaskSidePanel.tsx` — Added priority rationale sub-label; added research links IIFE block with openExternal buttons; removed stale Phase 18 comment

## Decisions Made

- ALTER TABLE with try/catch under version < 2 guard: allows both new installs (CREATE TABLE already has the column — ALTER would fail, caught and ignored) and existing DBs (no column yet — ALTER succeeds). Schema converges safely in all cases.
- IIFE for JSON.parse in JSX: keeps the try/catch scoped and the links variable local without introducing a useMemo hook or a new component.
- `window.api.app.openExternal` not `<a href target="_blank">`: Electron's CSP in the renderer blocks external navigation via anchor tags; openExternal routes through shell.openExternal in main process safely.

## Deviations from Plan

**1. [Rule 3 - Blocking] Re-applied renderer edits after git stash pop failure**
- **Found during:** Task 2 verification
- **Issue:** `git stash` (used to confirm pre-existing TS errors) failed to pop cleanly due to tsconfig.web.tsbuildinfo conflict, reverting both `electron.d.ts` and `TaskSidePanel.tsx` edits
- **Fix:** Dropped stash, re-applied all three edits to TaskSidePanel.tsx and the electron.d.ts edit; verified final state by reading the files
- **Files modified:** Same files already in scope
- **Verification:** Read back confirmed all edits in place; TypeScript verified no new errors introduced

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** No scope change; same edits as planned, just re-applied after tooling conflict.

## Issues Encountered

- Pre-existing `TS2304 Cannot find name 'Task'` errors in `TaskSidePanel.tsx` and `task-groomer-store.ts` — these are a pre-existing global type resolution issue in `tsconfig.web.json` and existed before these changes (confirmed by stash check). Zero new errors introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GROOM-04 fully satisfied: research mini-summary and clickable research links are user-visible in TaskSidePanel
- GROOM-03 enriched: priorityRationale survives app restarts (persisted in DB, not ephemeral IPC state)
- Phase 18 gap-closure complete — all 5 plans delivered; AI Grooming Engine end-to-end with all verified gaps closed
- Ready for Phase 19

---
*Phase: 18-ai-grooming-engine*
*Completed: 2026-05-20*
