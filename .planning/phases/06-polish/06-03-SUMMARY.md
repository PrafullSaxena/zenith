---
phase: 06-polish
plan: 03
subsystem: ui
tags: [accessibility, a11y, focus-ring, aria, reduced-motion, bundle-size]

requires:
  - phase: 03-shared-components
    provides: Input, Select, Tabs, Card, Button with base styles
provides:
  - Global reduced-motion CSS disabling all animations and transitions
  - Global focus-visible ring for keyboard navigation
  - Sidebar ARIA attributes (role=navigation, aria-labels)
  - Select trigger updated to focus-visible (was focus)
  - Bundle audit script confirming Three.js removal
affects: [accessibility, all-components, performance]

tech-stack:
  added: []
  patterns: [global prefers-reduced-motion CSS, global focus-visible outline]

key-files:
  created:
    - src/renderer/src/lib/bundle-audit.sh
  modified:
    - src/renderer/src/assets/main.css
    - src/renderer/src/components/layout/sidebar.tsx
    - src/renderer/src/components/ui/select.tsx

key-decisions:
  - "Nuclear reduced-motion approach: global CSS rule with 0.01ms duration for all animations/transitions"
  - "Global focus-visible outline as baseline, component-specific styles override via specificity"
  - "Select trigger changed from focus: to focus-visible: to match Input and Tabs patterns"

patterns-established:
  - "Global reduced-motion: all CSS animations/transitions disabled via media query"
  - "Global focus-visible: baseline keyboard focus ring for any interactive element"

requirements-completed: [POLS-05, POLS-06]

duration: 3min
completed: 2026-03-27
---

# Plan 06-03: Accessibility Audit + Bundle Size Audit Summary

**Global reduced-motion CSS, focus-visible rings, sidebar ARIA attributes, and Three.js removal confirmed with zero imports**

## Performance

- **Duration:** 3 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added global `@media (prefers-reduced-motion: reduce)` CSS rule disabling all animations and transitions
- Added global `:focus-visible` outline rule providing baseline keyboard navigation indicator
- Added `role="navigation"` and `aria-label="Main navigation"` to sidebar `<aside>` element
- Added `aria-label="Plugin navigation"` to the Reorder.Group plugin section
- Updated Select trigger from `focus:` to `focus-visible:` to match Input/Tabs pattern
- Confirmed zero three.js, @react-three, d3-force-3d imports in source code
- Created bundle-audit.sh script for measuring and comparing bundle sizes

## Files Created/Modified
- `src/renderer/src/assets/main.css` - Global reduced-motion + focus-visible CSS rules
- `src/renderer/src/components/layout/sidebar.tsx` - role=navigation, aria-labels
- `src/renderer/src/components/ui/select.tsx` - focus -> focus-visible on trigger
- `src/renderer/src/lib/bundle-audit.sh` - Bundle size measurement script

## Decisions Made
- Used nuclear reduced-motion approach (0.01ms durations) to catch all CSS animations, complementing Framer Motion's built-in reduced motion support
- Global focus-visible uses hsl(var(--ring)) to match the design system ring color token

## Deviations from Plan
None - plan executed as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Accessibility baseline established across all components
- Bundle audit confirms Three.js removal savings

---
*Phase: 06-polish*
*Completed: 2026-03-27*
