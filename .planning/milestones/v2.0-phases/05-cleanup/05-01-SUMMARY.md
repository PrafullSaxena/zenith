---
phase: 05-cleanup
plan: "05-01"
subsystem: ui
tags: [glass, threejs, 3d, cleanup, dependencies]

# Dependency graph
requires: []
provides:
  - "Clean codebase without Glass design system components"
  - "No Three.js / @react-three / d3-force-3d dependencies"
  - "No legacy 3D visualization components"
affects: [all-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All UI built from shadcn/ui primitives — no custom Glass wrappers"

key-files:
  created: []
  modified:
    - "package.json (Three.js deps already absent)"

key-decisions:
  - "cortex-theme.ts retained at src/renderer/src/plugins/cortex/cortex-theme.ts — it is plugin-specific color utilities (KIND_COLORS, METHOD_COLORS, REPO_TYPE_GRADIENTS), not a Glass design system component. lib/theme.ts does not contain these cortex-specific constants. Deleting it would break 5 active component imports."

patterns-established:
  - "Glass components removed: all UI uses shadcn/ui primitives (button.tsx, card.tsx, input.tsx, select.tsx, tabs.tsx, badge.tsx, dialog.tsx, skeleton.tsx, scroll-area.tsx)"

requirements-completed:
  - CLEN-01
  - CLEN-02
  - CLEN-03
  - CLEN-04

# Metrics
duration: 8min
completed: 2026-05-19
---

# Phase 05 Plan 01: Delete Glass Components, 3D Views, and Old Dependencies Summary

**All Glass UI components, Three.js 3D visualizations, and associated legacy CSS/deps fully removed from the codebase prior to this plan's formal execution**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-19T18:11:57Z
- **Completed:** 2026-05-19T18:19:00Z
- **Tasks:** 2
- **Files modified:** 0 (all deletions occurred in prior feature work)

## Accomplishments

- Verified zero imports of Glass* components anywhere in the renderer codebase
- Verified zero imports of Three.js / @react-three / d3-force-3d in any source file
- Verified all 3D component files (ActivityMesh3D, SchemaOrb3D, MindGraph3D, KnowledgeGraph3D, CostTreemap3D, Scene3DWrapper) are absent
- Verified glass-utils.ts, PluginHeader.tsx, ScrollContainer.tsx are absent
- Verified hljs-zenith.css and flow-styles.css are absent and have no import references
- Confirmed package.json has no three/d3-force-3d/@react-three packages
- TypeScript compilation errors are all pre-existing unrelated issues (cortex-store API mismatch, unused imports) — none caused by the plan's deletions

## Task Commits

Both tasks were verified as already complete. No new commits created (nothing to stage):

1. **Task 1: Delete Glass components and 3D views** — verified complete (all files absent, zero imports)
2. **Task 2: Remove Three.js dependencies and old CSS** — verified complete (deps absent, CSS files absent)

**Plan metadata:** (docs commit below)

## Files Created/Modified

None — all file deletions occurred in prior development work before this plan was executed.

## Decisions Made

- `cortex-theme.ts` at `src/renderer/src/plugins/cortex/cortex-theme.ts` was retained. The plan listed `src/renderer/src/plugins/cortex/components/cortex-theme.ts` (does not exist). The actual file provides cortex-domain color utilities (KIND_COLORS, METHOD_COLORS, REPO_TYPE_GRADIENTS) used by 5 active components and is unrelated to the Glass design system. `lib/theme.ts` does not contain these constants and is the wrong replacement target.

## Deviations from Plan

### Retained Files

**1. [Plan assumption error] cortex-theme.ts kept in cortex plugin root**
- **Found during:** Task 1 verification
- **Issue:** Plan listed `src/renderer/src/plugins/cortex/components/cortex-theme.ts` as a file to delete. This path does not exist. The actual `cortex-theme.ts` lives at the cortex plugin root, exports KIND_COLORS/METHOD_COLORS/REPO_TYPE_GRADIENTS, and is actively imported by 5 components (RepoCard.tsx, OverviewTab.tsx, MindGraphTab.tsx, DiagramsTab.tsx, APIListTab.tsx, ArchitectureDashboard.tsx). The plan's note that "theme constants now in lib/theme.ts" is incorrect — lib/theme.ts contains global theme tokens only, not cortex-specific entity color maps.
- **Decision:** Kept the file. Deleting it would break compilation. It is plugin-domain data, not Glass design system infrastructure.

---

**Total deviations:** 1 (plan assumption error — file path incorrect, file kept as needed)
**Impact on plan:** All Glass/3D cleanup goals achieved. Retained file is correct behavior.

## Issues Encountered

All Glass/3D components were already deleted in prior work (Excalidraw migration and UI revamp). The plan's formal execution confirmed a clean state rather than performing new deletions. Pre-existing TypeScript errors in cortex-store.ts and launchpad/charts/HistoryTrendLine.tsx are unrelated to this cleanup and require separate attention.

## Next Phase Readiness

- Codebase is free of all Glass component imports and Three.js dependencies
- All UI components use shadcn/ui primitives
- `cortex-theme.ts` plugin utilities remain available for cortex plugin components
- Ready for next cleanup phase or feature work

---
*Phase: 05-cleanup*
*Completed: 2026-05-19*
