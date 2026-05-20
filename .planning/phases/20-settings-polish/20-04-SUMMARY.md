---
phase: 20-settings-polish
plan: "04"
subsystem: ui
tags: [tailwind, accessibility, focus-ring, capture-popup, groom-digest, status-dropdown]

requires:
  - phase: 19-groom-ux
    provides: GroomDigest panel and StatusDropdown components

provides:
  - GroomDigest task rows unified to text-sm with focus rings on close button and row buttons
  - StatusDropdown trigger with focus-visible ring matching primary/60
  - Capture popup polished with styled "Capture" submit button and card inner glow

affects:
  - task-groomer plugin UI consistency
  - capture popup keyboard and mouse interaction

tech-stack:
  added: []
  patterns:
    - "focus-visible:ring-2 focus-visible:ring-primary/60 pattern applied consistently to interactive elements"
    - "capture-submit CSS class with :active transform: scale(0.97) for press feedback"

key-files:
  created: []
  modified:
    - src/renderer/src/plugins/task-groomer/GroomDigest.tsx
    - src/renderer/src/plugins/task-groomer/StatusDropdown.tsx
    - src/renderer/src/plugins/capture/CapturePopup.tsx
    - src/renderer/src/plugins/capture/capture.css

key-decisions:
  - "No new decisions — plan executed exactly as written"

patterns-established:
  - "focus-visible ring on all interactive elements: ring-2 ring-primary/60 for consistency across plugin panels"
  - "Capture popup footer: left esc caption + right styled submit button replaces two-sided hint row"

requirements-completed:
  - DATA-02

duration: 2min
completed: 2026-05-21
---

# Phase 20 Plan 04: UI Polish — GroomDigest, StatusDropdown, Capture Popup Summary

**GroomDigest task rows unified to text-sm, focus-visible rings added to all interactive elements, and capture popup gained a styled "Capture" submit button with active press state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-20T19:33:55Z
- **Completed:** 2026-05-20T19:35:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- GroomDigest task row text unified from `text-xs` to `text-sm` to match TaskCard visual language
- Focus-visible rings added to GroomDigest close button and all task row buttons for keyboard accessibility
- StatusDropdown trigger button replaced `focus:outline-none` with `focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1`
- Capture popup footer replaced two-sided hint row with `capture-actions` layout: "esc to dismiss" caption + styled "Capture" submit button
- Capture submit button has active press state (`transform: scale(0.97)`), hover state, disabled state, and focus-visible outline
- Capture card gained subtle inner top highlight via `inset 0 1px 0 rgba(255, 255, 255, 0.04)` box-shadow

## Task Commits

1. **Task 1: Polish GroomDigest visual consistency and StatusDropdown a11y** - `fb24cc5` (feat)
2. **Task 2: Polish capture popup to match Zenith spotlight aesthetic** - `1e77ea0` (feat)

## Files Created/Modified
- `src/renderer/src/plugins/task-groomer/GroomDigest.tsx` - text-sm task rows, focus rings on close button and row buttons
- `src/renderer/src/plugins/task-groomer/StatusDropdown.tsx` - focus-visible ring on trigger button
- `src/renderer/src/plugins/capture/CapturePopup.tsx` - replaced capture-hint with capture-actions + submit button
- `src/renderer/src/plugins/capture/capture.css` - added capture-actions, capture-submit styles; updated card box-shadow

## Decisions Made
None - plan executed exactly as written.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four files pass TypeScript `--noEmit` check with zero errors
- Keyboard navigation is complete across GroomDigest, StatusDropdown, and CapturePopup
- Phase 20 polish is ready for final verification

---
*Phase: 20-settings-polish*
*Completed: 2026-05-21*
