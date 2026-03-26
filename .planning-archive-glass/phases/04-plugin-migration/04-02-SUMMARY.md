---
phase: 04-plugin-migration
plan: 2
subsystem: ui
tags: [react, glass-components, cortex, plugin-migration, PluginHeader, GlassCard, GlassSurface, EmptyState]

# Dependency graph
requires:
  - phase: 04-plugin-migration
    provides: GlassCard, GlassSurface, GlassChat, PluginHeader, EmptyState, GlassSkeleton, staggerContainer, staggerItem
provides:
  - Cortex plugin fully migrated to shared glass design system
  - cortex-theme.ts cleaned to functional-colors-only (60 lines, no inline glass patterns)
affects: [04-03-launchpad, 04-04-gitlens, 04-05-apiexplorer, 04-06-kanban]

# Tech tracking
tech-stack:
  added: []
  patterns: [Cortex glass migration complete, PluginHeader for main view headers, GlassCard for all card surfaces, GlassSurface for toolbars]

key-files:
  created: []
  modified:
    - src/renderer/src/plugins/cortex/CortexView.tsx
    - src/renderer/src/plugins/cortex/cortex-theme.ts
    - src/renderer/src/plugins/cortex/components/APIListTab.tsx
    - src/renderer/src/plugins/cortex/components/DiagramsTab.tsx
    - src/renderer/src/plugins/cortex/components/FlowsTab.tsx
    - src/renderer/src/plugins/cortex/components/InsightsPanel.tsx
    - src/renderer/src/plugins/cortex/components/MindGraphTab.tsx
    - src/renderer/src/plugins/cortex/components/OverviewTab.tsx
    - src/renderer/src/plugins/cortex/components/QAPanel.tsx
    - src/renderer/src/plugins/cortex/components/RepoCard.tsx
    - src/renderer/src/plugins/cortex/components/RepoManager.tsx
    - src/renderer/src/plugins/cortex/components/TestCoverageCard.tsx
    - src/renderer/src/plugins/cortex/components/ValidationPanel.tsx

key-decisions:
  - "RepoCard uses GlassCard variant=interactive instead of motion.div with custom whileHover for consistent hover behavior"
  - "OverviewTab stat cards wrapped in staggerContainer/staggerItem from motion.ts instead of cortex-theme cardVariants"
  - "QAPanel keeps custom chat rendering with GlassCard message bubbles rather than full GlassChat swap to preserve rich features"
  - "CortexView empty states use EmptyState component with actionLabel/onAction for consistent empty-state pattern"

patterns-established:
  - "Cortex migration pattern: PluginHeader for main view, GlassSurface rounded-none for sub-tab toolbars, GlassCard for all card surfaces"
  - "cortex-theme.ts reduced to functional color mappings only -- no inline glass patterns"

requirements-completed: [PLUG-01]

# Metrics
duration: 9min
completed: 2026-03-25
---

# Phase 04 Plan 02: Cortex Plugin Migration Summary

**All 13 Cortex component files migrated from inline cortex-theme glass constants to shared GlassCard/GlassSurface/PluginHeader/EmptyState, cortex-theme.ts cleaned to 60 lines of functional color mappings only**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-24T22:02:07Z
- **Completed:** 2026-03-24T22:12:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Replaced all GLASS_CARD usages (7 files) with GlassCard from shared ui library
- Replaced all GLASS_SURFACE usages (5 files) with GlassSurface from shared ui library
- CortexView migrated to PluginHeader with Brain icon, gradient title, and GlassTab bar
- OverviewTab and RepoManager migrated from cardVariants/useCardVariants to staggerContainer/staggerItem from motion.ts
- QAPanel assistant messages now render via GlassCard, suggested questions use GlassCard interactive variant
- RepoCard uses GlassCard variant=interactive for consistent hover behavior
- CortexView empty states replaced with EmptyState component
- cortex-theme.ts cleaned from 97 lines to 60 lines -- GLASS_CARD, GLASS_SURFACE, cardVariants, useCardVariants all deleted
- Zero legacy glass references remain in any Cortex file

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace GLASS_CARD usages in 7 component files** - `ae7ecb2` (feat)
2. **Task 2: Replace GLASS_SURFACE, add PluginHeader, clean cortex-theme.ts** - `3f3db40` (feat)

## Files Created/Modified
- `src/renderer/src/plugins/cortex/CortexView.tsx` - PluginHeader with Brain icon, EmptyState for missing analysis, pageTransition animation
- `src/renderer/src/plugins/cortex/cortex-theme.ts` - Cleaned to functional colors only (KIND_COLORS, METHOD_COLORS, REPO_TYPE_GRADIENTS)
- `src/renderer/src/plugins/cortex/components/APIListTab.tsx` - GLASS_CARD -> GlassCard for table container
- `src/renderer/src/plugins/cortex/components/DiagramsTab.tsx` - GLASS_SURFACE -> GlassSurface for toolbar
- `src/renderer/src/plugins/cortex/components/FlowsTab.tsx` - GLASS_SURFACE -> GlassSurface for toolbar
- `src/renderer/src/plugins/cortex/components/InsightsPanel.tsx` - GLASS_SURFACE -> GlassSurface for sub-tab bar
- `src/renderer/src/plugins/cortex/components/MindGraphTab.tsx` - GLASS_CARD -> GlassCard for hovered tooltip
- `src/renderer/src/plugins/cortex/components/OverviewTab.tsx` - GLASS_CARD/useCardVariants -> GlassCard + staggerContainer/staggerItem
- `src/renderer/src/plugins/cortex/components/QAPanel.tsx` - GLASS_CARD/GLASS_SURFACE -> GlassCard/GlassSurface
- `src/renderer/src/plugins/cortex/components/RepoCard.tsx` - GLASS_CARD -> GlassCard variant=interactive
- `src/renderer/src/plugins/cortex/components/RepoManager.tsx` - cardVariants/useCardVariants -> staggerContainer
- `src/renderer/src/plugins/cortex/components/TestCoverageCard.tsx` - GLASS_CARD -> GlassCard
- `src/renderer/src/plugins/cortex/components/ValidationPanel.tsx` - GLASS_SURFACE -> GlassSurface

## Decisions Made
- RepoCard uses GlassCard variant=interactive instead of custom motion.div whileHover -- consistent hover behavior across the app
- OverviewTab stat cards wrapped in staggerContainer parent with staggerItem children, replacing cortex-theme's custom cardVariants with index-based delays
- QAPanel keeps its rich custom chat UI (streaming, suggested questions, source citations, provider display) with GlassCard for message bubbles rather than swapping entirely to GlassChat -- GlassChat's simpler API can't support the full feature set
- CortexView empty states use the shared EmptyState component with actionLabel/onAction props

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MindGraphTab using bare GLASS_CARD without import**
- **Found during:** Task 1 (GLASS_CARD migration)
- **Issue:** MindGraphTab line 609 referenced GLASS_CARD as a className but didn't import it from cortex-theme (likely a previous partial migration left it broken)
- **Fix:** Replaced bare GLASS_CARD class reference with GlassCard component wrapping
- **Files modified:** src/renderer/src/plugins/cortex/components/MindGraphTab.tsx
- **Verification:** TypeScript compiles cleanly
- **Committed in:** ae7ecb2 (Task 1 commit)

**2. [Rule 2 - Missing Critical] QAPanel partial GlassChat migration**
- **Found during:** Task 1 (QAPanel migration)
- **Issue:** Plan specified full GlassChat migration, but QAPanel's features (suggested questions, streaming, source citations, clear button, provider display) exceed GlassChat's API
- **Fix:** Used GlassCard for message bubbles and GlassSurface for header/input areas instead, preserving all existing functionality
- **Files modified:** src/renderer/src/plugins/cortex/components/QAPanel.tsx
- **Verification:** TypeScript compiles, all store connections preserved
- **Committed in:** ae7ecb2 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. QAPanel deviation preserves full feature set while still removing inline glass constants.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cortex is the largest plugin migration -- all 13 component files now use shared ui/ components
- cortex-theme.ts is cleaned to functional-colors-only, ready as a reference pattern for other plugins
- Ready for 04-03 (Launchpad), 04-04 (GitLens), etc.

## Self-Check: PASSED

All 13 modified files verified on disk. Both task commits (ae7ecb2, 3f3db40) verified in git log.

---
*Phase: 04-plugin-migration*
*Completed: 2026-03-25*
