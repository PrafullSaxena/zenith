---
phase: 03-codereviewbot-plugin
plan: "03"
subsystem: ipc-bridge
tags: [electron-ipc, contextbridge, zustand, parse-diff, bitbucket, ai-streaming, preload]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Electron shell with IPC handlers, preload contextBridge, settings store, credentials store"
  - phase: 03-codereviewbot-plugin plan 01
    provides: "Bitbucket OAuth flow, API client, token manager"
  - phase: 03-codereviewbot-plugin plan 02
    provides: "AI provider factory and review streaming with IPC forwarding"
provides:
  - "IPC handlers for bitbucket:connect/disconnect/isConnected/listPRs/getPRDiff/postComment"
  - "IPC handlers for ai:startReview/cancelReview"
  - "Preload contextBridge extensions for bitbucket and ai namespaces"
  - "TypeScript declarations for window.api.bitbucket and window.api.ai"
  - "Renderer-side types: PullRequest, DiffFile, ReviewComment, ReviewSession, ReviewHistoryEntry"
  - "Zustand review store with full review lifecycle management"
affects: [03-codereviewbot-plugin plan 04, 05-astropatch]

# Tech tracking
tech-stack:
  added: []
  patterns: [ipc-handler-to-preload-to-type-declaration alignment, zustand-ipc-streaming-listener-lifecycle, parse-diff-type-conversion]

key-files:
  created:
    - src/renderer/src/types/bitbucket.ts
    - src/renderer/src/types/review.ts
    - src/renderer/src/stores/review-store.ts
  modified:
    - src/main/ipc-handlers.ts
    - src/main/settings-store.ts
    - src/preload/index.ts
    - src/renderer/src/types/electron.d.ts

key-decisions:
  - "Fire-and-forget streamReview call in ai:startReview handler -- streaming happens asynchronously via IPC events, handler returns immediately"
  - "Session-scoped IPC listeners with removeStreamListeners cleanup in done/error/cancel paths to prevent listener accumulation"
  - "parse-diff output converted to custom DiffFile[] type for renderer-safe consumption without Node.js imports"
  - "Review comment parsing via line-by-line JSON detection from accumulated rawText after streaming completes"

patterns-established:
  - "IPC bridge pattern: handler -> preload -> electron.d.ts must align exactly for each channel"
  - "Zustand streaming pattern: setup listeners in startReview, accumulate state in onStreamChunk, cleanup in done/error/cancel"
  - "Review history persistence: optimistic local update then settings.set() IPC, capped at 100 entries"

requirements-completed: [CRVW-01, CRVW-04, CRVW-05, CRVW-08]

# Metrics
duration: 3min
completed: 2026-03-07
---

# Phase 03 Plan 03: IPC Bridge and Review Store Summary

**Bitbucket and AI IPC bridge with preload contextBridge, TypeScript declarations, and Zustand review store managing full review lifecycle including streaming, comment posting, and persisted history**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T20:32:07Z
- **Completed:** 2026-03-06T20:35:22Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Wired Bitbucket backend (Plan 01) and AI streaming (Plan 02) to the renderer through IPC handlers, preload bridge, and type declarations
- Created renderer-side types for pull requests, diffs, review comments, sessions, and history entries
- Built Zustand review store managing the entire CodeReviewBot workflow: connection, PR browsing, diff fetching/parsing, AI review streaming with IPC listener lifecycle, comment posting, and persisted review history

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend IPC handlers and preload bridge with Bitbucket and AI channels** - `d842c6d` (feat)
2. **Task 2: Create renderer-side types and review Zustand store** - `c8b0fc2` (feat)

## Files Created/Modified
- `src/main/ipc-handlers.ts` - Added 8 new IPC handlers (6 Bitbucket + 2 AI) with TokenManager integration
- `src/main/settings-store.ts` - Added bitbucketClientId, bitbucketClientSecret defaults and reviewHistory namespace
- `src/preload/index.ts` - Extended contextBridge with bitbucket (6 methods) and ai (5 methods + cleanup) namespaces
- `src/renderer/src/types/electron.d.ts` - Updated ElectronAPI interface with bitbucket and ai type declarations
- `src/renderer/src/types/bitbucket.ts` - PullRequest, DiffFile, DiffChunk, DiffChange interfaces
- `src/renderer/src/types/review.ts` - ReviewComment, ReviewSession, ReviewHistoryEntry interfaces
- `src/renderer/src/stores/review-store.ts` - useReviewStore with 13 actions covering full review lifecycle

## Decisions Made
- Fire-and-forget streamReview in ai:startReview handler: the IPC handler starts streaming and returns immediately with { started: true, sessionId }, while chunks flow back via webContents.send events
- Session-scoped IPC listeners with explicit cleanup via removeStreamListeners() called in onStreamDone, onStreamError, and cancelReview to prevent listener accumulation across multiple reviews
- parse-diff output mapped to custom DiffFile[] renderer type to avoid any Node.js type dependencies in the renderer
- Review comment parsing uses line-by-line JSON detection from accumulated rawText (lines starting with { are attempted as JSON)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- IPC bridge connects all main-process backends to the renderer via window.api.bitbucket and window.api.ai
- Review store provides complete state management for Plan 04 (UI components)
- All renderer-side types are ready for component prop definitions
- electron.d.ts ensures full TypeScript coverage across the bridge boundary

## Self-Check: PASSED

All 3 created files verified on disk. Both task commits (d842c6d, c8b0fc2) verified in git log. 4 modified files confirmed via git diff.

---
*Phase: 03-codereviewbot-plugin*
*Completed: 2026-03-07*
