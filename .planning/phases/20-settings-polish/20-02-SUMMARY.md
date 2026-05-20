---
phase: 20-settings-polish
plan: "02"
subsystem: ui
tags: [react, zustand, lucide-react, task-groomer, tailwind]

# Dependency graph
requires:
  - phase: 18-04-batch-groom-ui
    provides: groomingTaskIds shimmer state, handleGroomProgress, lastGroomSummary, prevSummaryRef pattern
provides:
  - failedTaskIds Set<string> in Zustand store for tracking per-run failed task IDs
  - Persistent amber failure banner in TaskGroomerView with Retry and Dismiss actions
  - isGroomFailed prop on TaskCard with amber AlertCircle indicator and border tint
affects: [task-groomer, 20-settings-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "failureBannerDismissed local useState reset via prevSummaryRef change detection and groomingActive watcher"
    - "failedTaskIds tracked in Zustand alongside groomingTaskIds, cleared on startGroom()"

key-files:
  created: []
  modified:
    - src/renderer/src/stores/task-groomer-store.ts
    - src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx
    - src/renderer/src/plugins/task-groomer/TaskCard.tsx

key-decisions:
  - "failedTaskIds persists across the groom run (not cleared on __run_complete__) so banner and card indicators remain visible after the run ends"
  - "Banner auto-resets via two triggers: new lastGroomSummary reference (prevSummaryRef pattern) and groomingActive becoming true"
  - "AlertCircle icon placed before creation time span (rightmost position) to remain visible alongside stale badge and other chips"

patterns-established:
  - "failedTaskIds mirrors groomingTaskIds pattern: initialized as new Set(), cleared in startGroom(), accumulated in handleGroomProgress"

requirements-completed: [DATA-02]

# Metrics
duration: 3min
completed: 2026-05-21
---

# Phase 20 Plan 02: Settings Polish - Failure Banner Summary

**Persistent amber failure banner in TaskGroomerView and per-card AlertCircle warning icon for failed batch groom tasks, backed by failedTaskIds Zustand state**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-20T19:33:52Z
- **Completed:** 2026-05-20T19:36:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `failedTaskIds: Set<string>` to Zustand store with correct accumulation in `handleGroomProgress` (status='failed') and reset in `startGroom()`
- Rendered persistent amber banner in TaskGroomerView showing "N task(s) failed to groom" with Retry and Dismiss buttons; auto-resets on new run start
- Added `isGroomFailed` prop to TaskCard rendering an amber `AlertCircle` icon and subtle `border-amber-400/15` tint on failed task cards

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failure banner state and banner UI to TaskGroomerView** - `b31a490` (feat)
2. **Task 2: Add isGroomFailed prop and warning icon to TaskCard** - `91856ed` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/renderer/src/stores/task-groomer-store.ts` - Added failedTaskIds field to interface + initial state; reset in startGroom(); accumulate in handleGroomProgress status=failed
- `src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx` - Added failureBannerDismissed state, showFailureBanner computed value, amber banner JSX between PageHeader and tab content, isGroomFailed prop pass-through to TaskCard
- `src/renderer/src/plugins/task-groomer/TaskCard.tsx` - Added isGroomFailed prop, AlertCircle import, warning icon render, amber border tint className condition

## Decisions Made
- `failedTaskIds` is not cleared on `__run_complete__` (unlike `groomingTaskIds`) so banner and per-card indicators remain visible after the run ends — this is intentional, the user needs to see which tasks failed
- Banner reset uses two independent triggers: detecting `lastGroomSummary` reference change (via `prevSummaryRef` pattern already in use) and `groomingActive` becoming true — both are needed to cover schedule-triggered runs
- `AlertCircle` icon positioned before creation time (rightmost slot after stale badge) to maintain left-to-right data density without displacing existing badges

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Failure banner and per-card indicators are fully functional
- `failedTaskIds` is available in the store for any future plan that needs to query which tasks failed
- Ready for next plan in phase 20-settings-polish

---
*Phase: 20-settings-polish*
*Completed: 2026-05-21*
