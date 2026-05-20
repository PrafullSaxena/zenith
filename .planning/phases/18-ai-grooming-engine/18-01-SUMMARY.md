---
phase: 18-ai-grooming-engine
plan: "01"
subsystem: ai
tags: [claude, vercel-ai-sdk, generateText, jira, confluence, web-search, grooming]

# Dependency graph
requires:
  - phase: 17-integrations
    provides: jira-client.ts, confluence-client.ts, search-client.ts, credentials.ts
  - phase: 14-data-foundation
    provides: database.ts Task interface
  - phase: prior-ai-providers
    provides: providers.ts createModel factory, getApiKeyForProvider
provides:
  - src/main/taskgroomer/grooming-agent.ts — groomTask(task) and GroomingResult type
affects:
  - 18-02 (IPC wiring will call groomTask)
  - 18-03 (UI will display GroomingResult fields)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "withTimeout<T> helper wraps integration promises; callers catch and return skip sentinels"
    - "Credential builders return null if any required field is missing — no network calls without full creds"
    - "generateText (non-streaming) used for batch grooming — streaming not needed for single-task result"
    - "researchLinks stored as JSON string in DB column; serialized only when isResearchMode=true"

key-files:
  created:
    - src/main/taskgroomer/grooming-agent.ts
  modified: []

key-decisions:
  - "generateText (non-streaming) over streamText — batch result is sufficient for grooming; no UI streaming needed"
  - "withTimeout helper races promise against setTimeout reject; each integration call catches independently to return skip sentinel"
  - "Credential builders return null for entire credential set if any required field is missing (fail-safe, not partial)"
  - "JSON parse error throws with 200-char raw text preview for debuggability"
  - "researchLinks serialized to JSON string for DB storage (matches existing research_links TEXT column)"

patterns-established:
  - "Skip sentinel pattern: const JIRA_SKIP: JiraSearchResponse = { results: [], skipped: true, reason: 'error' }"
  - "Integration parallelism: Promise.all + withTimeout + .catch(() => SKIP_SENTINEL)"
  - "Field validation via Set<string> for enum values (VALID_PRIORITIES, VALID_ACTIONS)"

requirements-completed:
  - GROOM-03
  - GROOM-04

# Metrics
duration: 2min
completed: 2026-05-20
---

# Phase 18 Plan 01: AI Grooming Agent Summary

**Core AI grooming function that queries Jira/Confluence/web in parallel with 30s timeout guards, calls Claude claude-sonnet-4-6 via generateText, and returns a validated GroomingResult with priority, suggestedAction, evidenceSummary, and optional research fields**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-20T08:42:09Z
- **Completed:** 2026-05-20T08:44:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `src/main/taskgroomer/grooming-agent.ts` — self-contained brain of the grooming engine
- Implemented `withTimeout<T>` helper and parallel integration queries with independent skip sentinels on failure
- Built prompt construction, Claude call via `generateText`, JSON parse + field validation, and `GroomingResult` mapping
- Zero TypeScript errors; all fields fully typed with no `any`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create grooming-agent.ts with integration queries and Claude AI call** - `04c81e6` (feat)

**Plan metadata:** `(next commit)` (docs: complete plan)

## Files Created/Modified
- `src/main/taskgroomer/grooming-agent.ts` — Core grooming agent: credential resolution, parallel integration queries with 30s timeouts, Claude AI call, JSON parsing and validation, GroomingResult construction

## Decisions Made
- **generateText over streamText:** Batch grooming result is sufficient — no UI streaming interface exists yet, simpler implementation
- **withTimeout pattern:** Each integration call wrapped independently so one timeout/error doesn't cancel the others; `.catch(() => SKIP)` is cleaner than nested try/catch blocks
- **Null-return credential builders:** If any required credential field (baseUrl, email, apiToken) is missing, the entire credentials object is null → immediate skip sentinel with zero network calls
- **JSON string for researchLinks:** Matches the existing `research_links TEXT` column in tasks.db; serialized only when `isResearchMode=true` and non-empty

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `groomTask(task: Task): Promise<GroomingResult>` is ready for IPC wiring in Plan 02
- `GroomingResult` interface is ready for renderer type consumption in Plan 03
- TypeScript compiles clean; no blockers

---
*Phase: 18-ai-grooming-engine*
*Completed: 2026-05-20*
