---
phase: 14-cortex-bugfix
plan: 02
subsystem: ui
tags: [react-flow, flow-utils, cortex, diagram, call-graph, path-normalization]

# Dependency graph
requires:
  - phase: 14-cortex-bugfix plan 01
    provides: Correct CallEdge type with callerId/calleeId fields populated by Java parser
provides:
  - Fixed fallback edge IDs using callerId-calleeId composite key
  - Relaxed handler entity matching with path normalization + controller parent fallback
  - Secondary fallback entity graph when routes exist but handler matching fails
  - Real CallEdge.type labels on BFS-traced edges (inject/call/route instead of hardcoded 'calls')
affects: [cortex, flow-utils, FlowsTab, diagram rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "callEdgeTypeMap lookup: Map<string, CallEdge['type']> keyed on 'callerId->calleeId' for O(1) edge type resolution during BFS"
    - "Path normalization helper normPath(): replaces backslashes, strips leading ./ for cross-platform entity matching"
    - "Two-tier handler matching: exact filePath match first, relaxed controller-parent match fallback"

key-files:
  created: []
  modified:
    - src/renderer/src/plugins/cortex/components/flow-utils.ts
    - src/renderer/src/plugins/cortex/components/FlowsTab.tsx

key-decisions:
  - "normPath() helper defined inline in loop — used only within handler-matching scope; no need to hoist to module level"
  - "Relaxed match uses parentId lookup chain rather than string contains to avoid false positives from partial name matches"
  - "callEdgeTypeMap stores first encountered type for duplicate caller-callee pairs — parsers may emit multiple edges"
  - "FlowsTab empty-state hint only shown when flowType=api and routes.length > 0 — avoids confusing non-BE repo users"

patterns-established:
  - "Dual-trigger fallback: nodes.length === 0 after BFS handles both zero-routes and routes-with-no-matched-handlers cases"

requirements-completed: [CBAN-05]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 14 Plan 02: Fix Flow Diagram Rendering Summary

**Flow diagrams now render for BE repos with real edge types (inject/call/route), path-normalized handler matching, and entity-graph fallback when handler resolution fails**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-14T22:10:39Z
- **Completed:** 2026-03-14T22:12:37Z
- **Tasks:** 4
- **Files modified:** 2

## Accomplishments
- Fixed broken fallback edge IDs: `c.id` (non-existent) replaced with `c.callerId-c.calleeId`
- Handler entity matching now normalizes path separators and strips `./` prefix; falls back to controller-parent name match when exact path fails
- Fallback entity graph (all controller/service/repository/middleware entities) now also fires when routes exist but none of their handlers matched — previously showed "No flow data available" with no diagram
- BFS-traced edges now carry the real `CallEdge.type` value (`inject`, `call`, `route`, etc.) via a `callEdgeTypeMap` lookup instead of hardcoded `'calls'`

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix fallback edge ID reference** - `5f8a875` (fix)
2. **Task 2: Fix handler entity matching** - `343f8a2` (fix)
3. **Task 3: Secondary fallback for routes-but-no-match case** - `64e1862` (fix)
4. **Task 4: Add CallEdge.type to BFS edge labels** - `cec9917` (feat)

## Files Created/Modified
- `src/renderer/src/plugins/cortex/components/flow-utils.ts` - All four fixes applied; callEdgeTypeMap added; normPath() helper; relaxed handler matching; improved fallback comment
- `src/renderer/src/plugins/cortex/components/FlowsTab.tsx` - Improved empty-state UX with icon and contextual hint when routes detected but handlers unresolvable

## Decisions Made
- `normPath()` helper kept inline (route loop scope only) — no need to hoist to module level since it's only used once
- Relaxed handler match traverses `parentId` chain for precision — avoids false positives from name substring collisions
- `callEdgeTypeMap` stores first-encountered type per caller-callee pair to handle parsers emitting duplicate edges

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `flow-utils.ts` (`FlowNodeData`/`FlowEdgeData` missing index signature for React Flow generic constraint) confirmed pre-existing via git stash verification — not caused by this plan's changes, out of scope per deviation rules.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Flow diagrams should now render for BE repos with proper call chains visible
- Edge labels will show semantic types (inject/call/route/inferred) from parser output
- Fallback entity graph ensures something meaningful always renders even when exact handler matching fails
- Pre-existing React Flow type constraint errors in flow-utils.ts could be addressed in a follow-up by adding index signature to FlowNodeData/FlowEdgeData interfaces

---
*Phase: 14-cortex-bugfix*
*Completed: 2026-03-14*
