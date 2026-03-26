---
phase: 03-core-pages-migration
plan: 01
subsystem: ui
tags: [framer-motion, AnimatePresence, theme-metadata, AnimatedCounter, GlassTab]

# Dependency graph
requires:
  - phase: 02-glass-component-library
    provides: GlassTab component, barrel export in ui/index.ts
  - phase: 01-design-system-foundation
    provides: motion.ts variants, useReducedMotion hook
provides:
  - Shared AnimatedCounter component in @renderer/components/ui
  - GlassTab vertical orientation support
  - THEME_METADATA constant with 12 classic theme color data
  - AnimatePresence page transitions in AppLayout
affects: [03-02-dashboard-migration, 03-03-settings-migration, 05-themes]

# Tech tracking
tech-stack:
  added: []
  patterns: [re-export for backward compatibility, orientation prop pattern]

key-files:
  created:
    - src/renderer/src/components/ui/AnimatedCounter.tsx
    - src/renderer/src/lib/theme-metadata.ts
  modified:
    - src/renderer/src/components/ui/index.ts
    - src/renderer/src/components/ui/GlassTab.tsx
    - src/renderer/src/components/AppLayout.tsx
    - src/renderer/src/plugins/cortex/components/AnimatedCounter.tsx

key-decisions:
  - "AnimatedCounter import path uses @renderer/lib/useReducedMotion directly (not Cortex re-export)"
  - "GlassTab vertical indicator uses w-0.5 left bar with rounded-r styling"
  - "Theme metadata uses raw oklch/hex values from CSS rather than computed values"

patterns-established:
  - "Re-export pattern: old location re-exports from new shared location for backward compatibility"
  - "Orientation prop pattern: default horizontal, optional vertical with layout changes"

requirements-completed: [CORE-01, CORE-04, CORE-05]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 03 Plan 01: Shared Utilities Summary

**Shared AnimatedCounter, GlassTab vertical orientation, theme metadata constant, and AnimatePresence page transitions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T20:27:03Z
- **Completed:** 2026-03-24T20:29:21Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- AnimatedCounter relocated from Cortex plugin to shared ui/ with backward-compatible re-export
- GlassTab extended with vertical orientation prop and left-bar active indicator
- THEME_METADATA constant created with accurate color data for all 12 classic themes
- AppLayout page transitions upgraded from CSS keyframes to framer-motion AnimatePresence

## Task Commits

Each task was committed atomically:

1. **Task 1: Relocate AnimatedCounter and extend GlassTab** - `c2a2d96` (feat)
2. **Task 2: Create theme metadata and add page transitions** - `1664a53` (feat)

## Files Created/Modified
- `src/renderer/src/components/ui/AnimatedCounter.tsx` - Shared animated number counter (moved from Cortex)
- `src/renderer/src/components/ui/index.ts` - Added AnimatedCounter barrel export
- `src/renderer/src/plugins/cortex/components/AnimatedCounter.tsx` - Re-export shim for backward compat
- `src/renderer/src/components/ui/GlassTab.tsx` - Added orientation prop with vertical layout
- `src/renderer/src/lib/theme-metadata.ts` - Theme color metadata for selector grid (12 classic + 6 placeholder)
- `src/renderer/src/components/AppLayout.tsx` - AnimatePresence page transitions replacing CSS animation

## Decisions Made
- AnimatedCounter imports useReducedMotion from @renderer/lib directly, not through the Cortex re-export chain
- GlassTab vertical indicator styled as w-0.5 left bar with rounded-r (matches design spec)
- Theme metadata stores raw oklch/hex strings from CSS rather than computed RGB values

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AnimatedCounter available for Dashboard migration (03-02)
- GlassTab vertical orientation ready for Settings page (03-03)
- THEME_METADATA ready for theme selector grid (03-03)
- Page transitions active for all routes immediately

---
*Phase: 03-core-pages-migration*
*Completed: 2026-03-25*
