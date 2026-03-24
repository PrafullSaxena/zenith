---
phase: 13-codebase-analyzer
plan: 04
subsystem: ui
tags: [react-flow, dagre, visualization, flow-diagram, interactive-graph]

# Dependency graph
requires:
  - phase: 13-codebase-analyzer (Plans 01-03)
    provides: types (FlowNodeData, FlowEdgeData), analysis engine (entities, calls), InsightsPanel with Flows placeholder
provides:
  - Interactive React Flow diagrams for API flows, component trees, and data pipelines
  - Dagre auto-layout engine for hierarchical graph positioning
  - Custom nodes with hover tooltips, glow effects, and click-to-code navigation
  - Custom animated edges with flowing dot animation
  - Dark-themed React Flow integration
affects: [13-codebase-analyzer]

# Tech tracking
tech-stack:
  added: []
  patterns: [react-flow-custom-nodes, dagre-layout, memo-node-types, animated-edge-pattern]

key-files:
  created:
    - src/renderer/src/plugins/codebase-analyzer/components/flow-utils.ts
    - src/renderer/src/plugins/codebase-analyzer/components/FlowNode.tsx
    - src/renderer/src/plugins/codebase-analyzer/components/FlowEdge.tsx
    - src/renderer/src/plugins/codebase-analyzer/components/FlowDiagram.tsx
    - src/renderer/src/plugins/codebase-analyzer/components/FlowsTab.tsx
    - src/renderer/src/plugins/codebase-analyzer/components/flow-styles.css
  modified:
    - src/renderer/src/plugins/codebase-analyzer/components/InsightsPanel.tsx

key-decisions:
  - "nodeTypes/edgeTypes defined outside component scope for React Flow performance"
  - "FlowNode uses motion.div on inner content only to avoid React Flow transform conflicts"
  - "Dagre LR direction for API flows, TB for component trees and pipelines"
  - "Max 150 nodes cap with BFS traversal to prevent overwhelming graphs"

patterns-established:
  - "React Flow custom node pattern: memo + external definition + Handle positioning"
  - "Dagre layout pattern: build graph, set nodes/edges, compute layout, map positions back"
  - "Flow type selector pattern: filter available flow types by repo type"

requirements-completed: [CBAN-06, CBAN-11, CBAN-12, CBAN-13, CBAN-14]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 13 Plan 04: Flow Visualization Summary

**Interactive React Flow diagrams with dagre auto-layout, custom animated nodes/edges, hover tooltips, and click-to-code navigation for API flows, component trees, and data pipelines**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T11:03:42Z
- **Completed:** 2026-03-14T11:06:48Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Dagre-based layout engine with configurable direction (LR/TB) and graph builders for 3 diagram types
- Custom React Flow node with oklch stage colors, lucide icons, hover glow/tooltip, and file navigation
- Custom animated edge with smooth-step path and flowing dot animation
- FlowsTab with flow type selector, endpoint filter dropdown, and comprehensive empty states
- Dark theme CSS overrides for React Flow controls, minimap, and edge entrance animations

## Task Commits

Each task was committed atomically:

1. **Task 1: Flow Utilities, Custom Node, Custom Edge Components** - `2c1ae05` (feat)
2. **Task 2: FlowDiagram Container, FlowsTab, and Integration** - `83674cf` (feat)

## Files Created/Modified
- `flow-utils.ts` - Dagre layout engine, API/component/pipeline graph builders, stage color mapping
- `FlowNode.tsx` - Memo'd custom node with icon, label, summary, hover tooltip, click-to-code
- `FlowEdge.tsx` - Animated smooth-step edge with flowing dot animation
- `flow-styles.css` - Dark theme overrides, edge draw-in animation, minimap styling
- `FlowDiagram.tsx` - Reusable React Flow wrapper with layout, controls, minimap
- `FlowsTab.tsx` - Flow type selector, endpoint filter, empty states, node click handler
- `InsightsPanel.tsx` - Replaced Flows placeholder with FlowsTab component

## Decisions Made
- nodeTypes and edgeTypes defined outside component (not in useMemo) for optimal React Flow performance since they are static
- FlowNode wraps only inner content div with motion.div to avoid framer-motion transform conflicts with React Flow's own transform system
- API flows use LR direction (Controller -> Service -> Repo -> DB), component trees and pipelines use TB direction
- Max 150 nodes cap with BFS traversal from route handlers prevents overwhelming graphs
- Virtual "Database" nodes added at end of chains reaching repository entities

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Flow visualization complete, ready for Plan 05 (Code Viewer) and Plan 06 (Design Doc)
- Click-to-code navigation wired up; will fully work once Code tab implements file viewer

---
*Phase: 13-codebase-analyzer*
*Completed: 2026-03-14*
