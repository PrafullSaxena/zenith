---
phase: 13-codereviewbot-user-comments
plan: 01
subsystem: ui
tags: [zustand, typescript, electron-store, review, annotations]

# Dependency graph
requires:
  - phase: 12-settings-polish
    provides: electron-store settings API pattern (window.api.settings.get/set)
provides:
  - UserComment interface and UserCommentMap type in review.ts
  - userComments state slice in review-store with add/delete/load/get actions
  - AI prompt injection of prior user annotations in startReview
affects: [13-02-PLAN.md, codereviewbot-ui-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - UserCommentMap keyed by {file}:{line} for O(1) per-line lookup
    - userCommentsKey() helper builds settings path per PR (workspace/repoSlug/prId)
    - effectiveGuidelines pattern injects user annotations into AI prompt before startReview

key-files:
  created: []
  modified:
    - src/renderer/src/types/review.ts
    - src/renderer/src/stores/review-store.ts

key-decisions:
  - "UserCommentMap keyed {file}:{line} — same convention as ReviewComment for consistent line addressing"
  - "User annotations injected as PRIOR USER ANNOTATIONS section in effectiveGuidelines — AI treats them as known context, not new findings"
  - "Settings key pattern userComments:{workspace}/{repoSlug}/{prId} scopes comments per PR, consistent with existing reviewSessions pattern"

patterns-established:
  - "userCommentsKey helper: same pattern as sessionsStorageKey for electron-store keying"
  - "effectiveGuidelines: only prepend annotation block when annotations are non-empty (guard pattern)"

requirements-completed: [UCM-01, UCM-02, UCM-04]

# Metrics
duration: 4min
completed: 2026-04-04
---

# Phase 13 Plan 01: User Comment Type and Store Slice Summary

**UserComment type + review-store slice with electron-store persistence and AI prompt injection of prior annotations**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T07:51:08Z
- **Completed:** 2026-04-04T07:55:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Defined `UserComment` interface and `UserCommentMap` type exported from `review.ts`
- Extended `review-store` with `userComments` state slice and four actions: `addUserComment`, `deleteUserComment`, `loadUserComments`, `getUserCommentsForLine`
- `startReview` now injects existing user annotations as prior context into `effectiveGuidelines` before calling the AI

## Task Commits

Each task was committed atomically:

1. **Task 1: Add UserComment type to review.ts** - `62cc71f` (feat)
2. **Task 2: Add user comment slice to review-store** - `102e75a` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/renderer/src/types/review.ts` - Added `UserComment` interface and `UserCommentMap` type
- `src/renderer/src/stores/review-store.ts` - Added user comment state slice, four actions, userCommentsKey helper, and effectiveGuidelines injection in startReview

## Decisions Made
- `UserCommentMap` keyed by `{file}:{line}` — same addressing convention as `ReviewComment` for O(1) lookup per diff line
- `userCommentsKey` follows `reviewSessions:workspace/repoSlug` precedent by scoping to `userComments:workspace/repoSlug/prId`
- `effectiveGuidelines` replaces raw `guidelines` in the `startReview` AI call only when annotations exist — no empty strings appended

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `UserComment` and `UserCommentMap` types are exported and ready for UI components
- Store actions (`addUserComment`, `deleteUserComment`, `loadUserComments`, `getUserCommentsForLine`) available for consumption by diff line components
- `startReview` automatically propagates user annotations to AI on every review run
- Ready for Phase 13-02: inline comment UI components on diff lines

---
*Phase: 13-codereviewbot-user-comments*
*Completed: 2026-04-04*

## Self-Check: PASSED

- FOUND: src/renderer/src/types/review.ts
- FOUND: src/renderer/src/stores/review-store.ts
- FOUND: .planning/phases/13-codereviewbot-user-comments/13-01-SUMMARY.md
- FOUND: commit 62cc71f (Task 1 - UserComment types)
- FOUND: commit 102e75a (Task 2 - user comment slice)
