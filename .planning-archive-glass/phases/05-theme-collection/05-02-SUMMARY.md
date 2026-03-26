---
phase: 05-theme-collection
plan: 02
subsystem: ui
tags: [themes, oklch, glass-preview, crossfade, settings]

requires:
  - phase: 01-design-tokens
    provides: CSS custom property theme architecture, oklch color system
  - phase: 03-shell-migration
    provides: ThemeCard component, theme selector grid in GeneralSettings

provides:
  - 6 new theme metadata entries with correct names and oklch colors
  - Enhanced ThemeCard with mini glass preview strip
  - GlassBadge NEW indicator on new collection themes
  - Theme crossfade animation via CSS class toggle
  - Portfolio metadata colors converted to oklch

affects: [05-theme-collection]

tech-stack:
  added: []
  patterns: [theme-crossfade-class-toggle, mini-glass-preview-css-only]

key-files:
  created: []
  modified:
    - src/renderer/src/lib/theme-metadata.ts
    - src/renderer/src/components/settings/GeneralSettings.tsx
    - src/renderer/src/assets/main.css

key-decisions:
  - "Theme crossfade uses transient .theme-transitioning class on <html> toggled via JS setTimeout(350ms) to avoid transitions on initial load"
  - "Mini glass preview is CSS-only: outer div with theme bg, inner div with rgba glass surface, bottom accent line"
  - "NEW badge uses GlassBadge variant=accent; shown only when theme is not active (active shows check icon)"

patterns-established:
  - "Theme crossfade: add .theme-transitioning class before theme change, remove after 350ms"
  - "Mini glass preview: CSS-only simulation with bg + rgba glass surface + accent line"

requirements-completed: [THEME-07, THEME-08]

duration: 2min
completed: 2026-03-25
---

# Phase 05 Plan 02: Theme Metadata and Selector UI Summary

**6 new theme metadata entries with oklch colors, enhanced ThemeCard with mini glass preview strip, NEW badges, and 300ms crossfade animation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T22:41:37Z
- **Completed:** 2026-03-24T22:43:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced 6 placeholder theme entries (aurora, midnight, sakura, ocean, copper, monochrome) with correct new themes (midnight-bloom, copper-forge, ocean-depth, nebula-dust, obsidian, jade-temple) with populated oklch colors
- Converted Portfolio theme metadata from hex to oklch notation for consistency
- Enhanced ThemeCard with mini glass preview strip below color dots showing simulated glass surface
- Added GlassBadge "NEW" on inactive new collection theme cards
- Added smooth 300ms crossfade animation on theme switch via .theme-transitioning CSS class

## Task Commits

Each task was committed atomically:

1. **Task 1: Update theme metadata with new theme entries** - `886e107` (feat)
2. **Task 2: Enhance ThemeCard with mini glass preview, NEW badge, and crossfade** - `c7b9db0` (feat)

## Files Created/Modified
- `src/renderer/src/lib/theme-metadata.ts` - Replaced 6 placeholders with correct new theme entries, converted Portfolio colors to oklch
- `src/renderer/src/components/settings/GeneralSettings.tsx` - Added mini glass preview strip, GlassBadge NEW indicator, triggerThemeCrossfade function
- `src/renderer/src/assets/main.css` - Added .theme-transitioning CSS rule for crossfade animation

## Decisions Made
- Theme crossfade uses a transient `.theme-transitioning` class on `<html>` toggled via JS `setTimeout(350ms)` to avoid transitions on initial page load
- Mini glass preview is CSS-only: outer div with theme bg color, inner div with `rgba(255,255,255,0.03)` bg and `rgba(255,255,255,0.08)` border, bottom accent line
- NEW badge uses `GlassBadge variant="accent"` positioned `absolute top-2 right-2`; shown only when theme is inactive (active themes show check icon instead)
- Crossfade transitions use `!important` to override any existing transitions during the brief transition period

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Theme metadata is ready for the theme selector to display all 18 themes
- New themes will become visible in the selector once 05-01 creates their CSS blocks in main.css (the `getNewThemes().filter((t) => t.colors.bg !== '')` check passes since colors are now populated)
- 05-03 cross-theme QA can validate all 18 themes once 05-01 CSS blocks are in place

---
*Phase: 05-theme-collection*
*Completed: 2026-03-25*
