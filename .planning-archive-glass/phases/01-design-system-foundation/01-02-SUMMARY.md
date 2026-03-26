---
phase: 01-design-system-foundation
plan: 02
subsystem: ui
tags: [framer-motion, animation, reduced-motion, a11y, design-system]

# Dependency graph
requires: []
provides:
  - Centralized motion variants module (stagger, page, modal, hover, slide)
  - Shared usePrefersReducedMotion hook at lib/ path
  - getReducedMotionVariants() accessibility helper
affects: [02-glass-component-library, 04-plugin-migration]

# Tech tracking
tech-stack:
  added: []
  patterns: [centralized-motion-variants, reduced-motion-safe-getter]

key-files:
  created:
    - src/renderer/src/lib/motion.ts
    - src/renderer/src/lib/useReducedMotion.ts
  modified:
    - src/renderer/src/plugins/cortex/components/useReducedMotion.ts

key-decisions:
  - "Motion variants exported as plain Variants objects (not hooks) for maximum flexibility"
  - "Cortex useReducedMotion.ts converted to re-export to preserve backward compatibility"

patterns-established:
  - "All animation configs import from @renderer/lib/motion — no inline variant definitions"
  - "Reduced-motion support via getReducedMotionVariants() strips transforms, uses near-instant opacity"

requirements-completed: [FOUND-02]

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 1 Plan 2: Motion Variants Summary

**Centralized motion variants module with 5 animation sets (stagger, page, modal, hover, slide), timing/easing constants, and reduced-motion accessibility helper**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T18:57:22Z
- **Completed:** 2026-03-24T18:59:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created lib/motion.ts with DURATION, EASE, STAGGER_DELAY constants matching design system spec
- Implemented all 5 variant sets (staggerContainer/Item, pageTransition, modalOverlay/Content, hoverLift, slidePanel)
- Built getReducedMotionVariants() that strips transforms and uses near-instant durations for a11y
- Relocated usePrefersReducedMotion hook to shared lib/ with backward-compatible re-export

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared motion variants module** - `ec86bd4` (feat)
2. **Task 2: Relocate usePrefersReducedMotion hook to shared lib** - `d9fb743` (feat)

## Files Created/Modified
- `src/renderer/src/lib/motion.ts` - Centralized motion variants, timing constants, easing constants, reduced-motion helper
- `src/renderer/src/lib/useReducedMotion.ts` - Shared usePrefersReducedMotion hook (moved from cortex)
- `src/renderer/src/plugins/cortex/components/useReducedMotion.ts` - Re-export from shared lib location

## Decisions Made
- Motion variants exported as plain Variants objects rather than hooks for maximum composability
- Cortex useReducedMotion.ts converted to a re-export rather than deleted to preserve all existing import paths

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Motion module ready for consumption by Phase 2 glass components
- All variant names and timing values stable — safe to import in downstream work
- Pre-existing TS errors in cortex-store.ts/db-store.ts/textcraft-store.ts are unrelated to this plan

---
*Phase: 01-design-system-foundation*
*Completed: 2026-03-24*
