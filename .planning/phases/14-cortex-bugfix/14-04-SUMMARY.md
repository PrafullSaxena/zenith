---
phase: 14-cortex-bugfix
plan: 04
subsystem: ui
tags: [cortex, agent-store, qa-panel, error-handling, settings-migration]

# Dependency graph
requires:
  - phase: 13-codebase-analyzer
    provides: QAPanel, ArchitectureDashboard, cortex-store, getCortexAgent
provides:
  - Agent store auto-loaded in QAPanel and ArchitectureDashboard on direct navigation
  - Visible inline error message when no agent is configured
  - Agent display in QAPanel header showing active provider name
affects: [cortex-bugfix, cortex Q&A functionality]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defensive provider load: check providers.length === 0 on mount, call loadProviders() if empty"
    - "Inline error-as-message: return an assistant chat message instead of silent early return on no-agent"
    - "Header agent badge: show active agent providerId in panel header for user awareness"

key-files:
  created: []
  modified:
    - src/renderer/src/plugins/cortex/components/QAPanel.tsx
    - src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx

key-decisions:
  - "Show user message before error message in chat (not after) so conversation flow is natural"
  - "Reuse getCortexAgent() return value for both hasAgent check and header badge (single call)"
  - "Settings migration verified correct: plugins.codebase-analyzer -> plugins.cortex (no code changes needed)"

patterns-established:
  - "Direct navigation guard: useEffect on mount checks store state and triggers load if empty"

requirements-completed: [CBAN-07]

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 14 Plan 04: Fix Ask Section Agent Resolution Summary

**QAPanel now loads agent store on mount, shows inline error on no-agent, and displays active provider name in header**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-15T08:02:15Z
- **Completed:** 2026-03-15T08:10:35Z
- **Tasks:** 4
- **Files modified:** 2

## Accomplishments
- Agent store auto-loads when user navigates directly to Cortex (bypassing MissionControl)
- Same auto-load guard added to ArchitectureDashboard for generateInsights flow
- Replaced silent early return with inline "No AI agent configured" error message in Q&A chat
- User question now appears in chat before the error message for natural conversation flow
- Active agent's providerId displayed in QAPanel header for user visibility
- Verified settings migration (`plugins.codebase-analyzer` → `plugins.cortex`) is correct — no code change needed

## Task Commits

1. **Task 1: Ensure agent store loaded before use** - `25d8b8a` (feat)
2. **Task 2: Add visible error state when no agent available** - `14afa1c` (feat)
3. **Task 3: Verify settings migration** - (verification only, no code change)
4. **Task 4: Add agent display in QA header** - `fab41c4` (feat)

## Files Created/Modified
- `src/renderer/src/plugins/cortex/components/QAPanel.tsx` - Added agent store load guard, inline error message, header agent badge
- `src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx` - Added agent store load guard for generateInsights flow

## Decisions Made
- User question is added to chat BEFORE the agent check, so even when no agent is configured the user sees their question followed by a clear error message (better conversational UX)
- `getCortexAgent()` called once and result stored in `agent` variable, used for both `hasAgent` guard and header badge rendering (avoids double call)
- Task 3 (settings migration verification) required no code changes — `migrateCortexSettings()` in `ipc-handlers.ts` correctly migrates `plugins.codebase-analyzer.defaultAgent` to `plugins.cortex.defaultAgent`, which is the key `getCortexAgent()` reads

## Deviations from Plan

None - plan executed exactly as written. Task 3 was verification-only per plan design, confirming the migration code already handles the correct key paths.

## Issues Encountered
None - all four tasks completed without blocking issues.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ask section now handles missing agent gracefully with clear user guidance
- Agent loading is resilient to direct-navigation entry paths
- Ready to continue remaining cortex bugfix plans

---
*Phase: 14-cortex-bugfix*
*Completed: 2026-03-15*

## Self-Check: PASSED

- QAPanel.tsx: FOUND
- ArchitectureDashboard.tsx: FOUND
- 14-04-SUMMARY.md: FOUND
- Commit 25d8b8a (Task 1): FOUND
- Commit 14afa1c (Task 2): FOUND
- Commit fab41c4 (Task 4): FOUND
