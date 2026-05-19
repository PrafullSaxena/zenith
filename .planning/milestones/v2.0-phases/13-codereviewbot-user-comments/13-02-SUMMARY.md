---
phase: 13-codereviewbot-user-comments
plan: 02
subsystem: ui
tags: [react, typescript, diff-viewer, inline-composer, user-comments, amber-badge]

# Dependency graph
requires:
  - phase: 13-01
    provides: UserComment/UserCommentMap types and review-store user comment slice
provides:
  - Inline comment composer triggered by clicking new line number in PRDiffView
  - User comment cards with amber "You" badge rendered inline on diff lines
  - CodeReviewBotView wires loadUserComments on PR select, passes add/delete handlers to PRDiffView
affects: [codereviewbot-ui-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - activeComposerKey state keyed "{file}:{line}" for per-line composer toggle
    - group/group-hover Tailwind pattern for hover-reveal MessageSquarePlus icon on line numbers
    - User comment rows as siblings of AI comment rows inside tbody — consistent with existing pattern

key-files:
  created: []
  modified:
    - src/renderer/src/plugins/code-review-bot/PRDiffView.tsx
    - src/renderer/src/plugins/code-review-bot/CodeReviewBotView.tsx

key-decisions:
  - "activeComposerKey toggles on second click — same key closes the composer (toggle semantics)"
  - "New line number td handles click (not old) — anchors annotation to the post-edit line convention"
  - "User comment rows and AI comment rows are siblings in tbody — no nesting, no layout breakage"

requirements-completed: [UCM-03, UCM-05, UCM-06]

# Metrics
duration: 2min
completed: 2026-04-04
---

# Phase 13 Plan 02: Inline Composer and User Comment Cards Summary

**Inline comment composer on diff line numbers + amber "You" badge user comment cards, wired into CodeReviewBotView**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-04T18:35:20Z
- **Completed:** 2026-04-04T18:37:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- PRDiffView now accepts `userComments`, `onAddUserComment`, `onDeleteUserComment` props
- New line number column is clickable — click opens an amber inline composer below that row; second click or Esc closes it
- `getUserCommentsForLine` helper does O(1) lookup from `UserCommentMap`
- User comment cards render with amber `border-l-amber-400`, `bg-amber-500/5`, and an amber "You" badge — visually distinct from AI severity badges
- AI comment cards and user comment cards coexist as sibling `<tr>` elements in the same `tbody` — no layout breakage
- Inline composer supports Cmd/Ctrl+Enter to save, Esc to cancel, and a Save/Cancel button pair
- CodeReviewBotView subscribes to `userComments`, `addUserComment`, `deleteUserComment`, `loadUserComments` from review-store
- `handlePRSelect` now calls `loadUserComments(workspace, repoSlug, pr.id)` after `loadDiff` on PR selection
- `handleAddUserComment` and `handleDeleteUserComment` callbacks created and passed to `<PRDiffView>`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add inline composer and user comment cards to PRDiffView** - `3183196` (feat)
2. **Task 2: Wire user comments into CodeReviewBotView** - `3a2882f` (feat)

## Files Created/Modified

- `src/renderer/src/plugins/code-review-bot/PRDiffView.tsx` — Added `userComments`/`onAddUserComment`/`onDeleteUserComment` props, `activeComposerKey`/`composerText` state, clickable new-line-number column with hover icon, `getUserCommentsForLine` helper, user comment card rows, inline composer row
- `src/renderer/src/plugins/code-review-bot/CodeReviewBotView.tsx` — Added four store subscriptions, `loadUserComments` call in `handlePRSelect`, `handleAddUserComment` and `handleDeleteUserComment` callbacks, updated `<PRDiffView>` JSX with new props

## Decisions Made

- `activeComposerKey` state is toggled: clicking the same line number again closes the composer — matches the mental model of toggling annotation mode
- New (right) line number column handles the click; this is consistent with `ReviewComment.line` which uses new-file line numbers throughout the codebase
- User comment and AI comment rows are both direct `<tr>` children of `<tbody>` — adding nested wrappers or portals would break the table layout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Phase 13 (UCM-01 through UCM-06) is now fully complete
- All user annotation infrastructure is in place: types, store slice, persistence, AI injection, and UI rendering
- Line numbers are clickable in the diff view; users can annotate any line before or after AI review runs
- User and AI comments coexist without layout breakage

---
*Phase: 13-codereviewbot-user-comments*
*Completed: 2026-04-04*

## Self-Check: PASSED

- FOUND: src/renderer/src/plugins/code-review-bot/PRDiffView.tsx
- FOUND: src/renderer/src/plugins/code-review-bot/CodeReviewBotView.tsx
- FOUND: commit 3183196 (Task 1 - PRDiffView inline composer)
- FOUND: commit 3a2882f (Task 2 - CodeReviewBotView wire-up)
