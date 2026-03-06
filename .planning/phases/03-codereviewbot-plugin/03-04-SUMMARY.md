---
phase: 03-codereviewbot-plugin
plan: "04"
subsystem: ui
tags: [react, tailwind, diff-viewer, streaming-ui, tab-navigation, zustand, bitbucket, code-review]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Electron shell, plugin registry, settings store, agent store, activity store"
  - phase: 02-dashboard-views
    provides: "Dashboard patterns (MissionControl, ActivityFeed, StatusBadge, formatRelativeTime)"
  - phase: 03-codereviewbot-plugin plan 03
    provides: "IPC bridge, review store, renderer-side types for PRs/diffs/reviews"
provides:
  - "Full CodeReviewBot plugin UI: PR browsing, unified diff viewer, AI review streaming, comment posting, review history"
  - "Registry swap from stub to real CodeReviewBotView component"
  - "OAuth credential settings fields (bitbucketClientId, bitbucketClientSecret)"
affects: [05-astropatch]

# Tech tracking
tech-stack:
  added: []
  patterns: [tab-navigation-with-local-state, unified-diff-rendering, streaming-ui-with-auto-scroll, inline-comment-cards-with-severity-coloring]

key-files:
  created:
    - src/renderer/src/plugins/code-review-bot/CodeReviewBotView.tsx
    - src/renderer/src/plugins/code-review-bot/PRList.tsx
    - src/renderer/src/plugins/code-review-bot/PRDiffView.tsx
    - src/renderer/src/plugins/code-review-bot/ReviewPanel.tsx
    - src/renderer/src/plugins/code-review-bot/ReviewHistory.tsx
    - src/renderer/src/plugins/code-review-bot/SettingsPanel.tsx
  modified:
    - src/renderer/src/plugins/registry.ts

key-decisions:
  - "Tab navigation with local useState for diff/review/history tabs rather than router-based navigation"
  - "Unified diff view (not side-by-side) with green/red line backgrounds for add/del changes"
  - "Inline AI comment cards rendered below relevant diff lines with severity-colored left borders (red=critical, yellow=warning, cyan=suggestion)"
  - "Auto-scroll streaming output using useEffect + scrollRef pattern"
  - "Agent fallback: if no defaultAgent configured, uses first provider with connected status or API key"

patterns-established:
  - "Plugin view pattern: default export for React.lazy, useReviewStore for domain state, useSettingsStore for config, useAgentStore for AI provider"
  - "Tab navigation pattern: useState<Tab> with border-b-2 border-accent for active tab indicator"
  - "Diff rendering pattern: DiffFile[] -> collapsible file sections -> chunk headers -> colored diff lines -> inline comment cards"
  - "Review lifecycle UI: null -> streaming (pulse + auto-scroll) -> complete (summary + checkboxes) -> error (retry) -> cancelled (restart)"

requirements-completed: [CRVW-02, CRVW-03, CRVW-06, CRVW-07, CRVW-08]

# Metrics
duration: 4min
completed: 2026-03-07
---

# Phase 03 Plan 04: CodeReviewBot Plugin UI Summary

**Full CodeReviewBot plugin view with PR browsing, unified diff viewer with inline AI comment cards, streaming review panel, comment posting, and review history with activity log integration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T20:38:53Z
- **Completed:** 2026-03-06T20:42:57Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Built 6 React components delivering the complete CodeReviewBot user experience
- PR list with author, branch flow, and relative timestamps; unified diff viewer with syntax-colored additions/deletions, line numbers, collapsible file sections, and inline AI review comment cards with severity coloring
- Review panel handling all 5 session states (idle, streaming with auto-scroll, complete with comment checkboxes, error with retry, cancelled with restart)
- Review history with external PR links, comment/posted counts, and status badges
- Swapped registry from stub to real component and added OAuth credential settings fields
- Activity log integration: review completions recorded with duration and PR details

## Task Commits

Each task was committed atomically:

1. **Task 1: Build PR list, diff viewer, and review panel components** - `08eb02c` (feat)
2. **Task 2: Build review history, settings panel, main view, and update registry** - `0e7975a` (feat)

## Files Created/Modified
- `src/renderer/src/plugins/code-review-bot/PRList.tsx` - Scrollable PR list with author, branches, timestamps, and selection highlighting
- `src/renderer/src/plugins/code-review-bot/PRDiffView.tsx` - Unified diff viewer with green/red line coloring, line numbers, collapsible files, and inline AI comment cards
- `src/renderer/src/plugins/code-review-bot/ReviewPanel.tsx` - AI review streaming display with start/cancel/retry controls, comment summary, and post-to-Bitbucket buttons
- `src/renderer/src/plugins/code-review-bot/ReviewHistory.tsx` - Past reviews list with external PR links, comment counts, status badges, and timestamps
- `src/renderer/src/plugins/code-review-bot/SettingsPanel.tsx` - Inline Bitbucket connection status and connect/disconnect controls
- `src/renderer/src/plugins/code-review-bot/CodeReviewBotView.tsx` - Main orchestrating view with tab navigation, store integration, activity logging, and IPC cleanup
- `src/renderer/src/plugins/registry.ts` - Swapped CodeReviewBot from stub to real component, added bitbucketClientId and bitbucketClientSecret settings fields

## Decisions Made
- Tab navigation uses local useState rather than React Router sub-routes -- simpler and avoids polluting the URL for intra-plugin navigation
- Unified diff view chosen over side-by-side for better readability in the constrained panel width (2/3 of viewport)
- Inline AI comment cards use severity-colored left borders (red/yellow/cyan) for quick visual scanning
- Agent fallback logic: if no defaultAgent configured for the plugin, the first provider with connected/hasApiKey status is used
- Auto-scroll streaming output to bottom via useEffect on rawText changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CodeReviewBot plugin is fully wired: backend (Plan 01), AI streaming (Plan 02), IPC bridge + store (Plan 03), and UI (Plan 04) are complete
- Phase 03 is complete -- all 4 plans executed
- Ready for Phase 04 (DbInspector) or Phase 05 (AstroPatch) which can reuse the streaming UI and activity integration patterns

## Self-Check: PASSED

All 6 created files verified on disk. Both task commits (08eb02c, 0e7975a) verified in git log. SUMMARY.md created.

---
*Phase: 03-codereviewbot-plugin*
*Completed: 2026-03-07*
