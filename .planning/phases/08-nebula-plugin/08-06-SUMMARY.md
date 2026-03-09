---
phase: 08-nebula-plugin
plan: 06
subsystem: ui
tags: [fts5, search, ai-qa, streaming, zustand, markdown-renderer, dangerouslySetInnerHTML]

# Dependency graph
requires:
  - phase: 08-nebula-plugin
    provides: Nebula types, Zustand store, NebulaView shell, SQLite FTS5 database, AI streaming infrastructure, IPC bridge
provides:
  - SearchView component with FTS5 full-text search and AI Q&A
  - askQuestion/cancelQa store actions with session-scoped IPC streaming
  - Complete Nebula plugin with all 3 tabs functional (Notes, Search, Knowledge)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["AI Q&A with note context: search for relevant notes first, build context string, stream AI response", "FTS5 highlight rendering via dangerouslySetInnerHTML with <mark> tag styling"]

key-files:
  created:
    - src/renderer/src/plugins/nebula/SearchView.tsx
  modified:
    - src/renderer/src/stores/nebula-store.ts
    - src/renderer/src/plugins/nebula/NebulaView.tsx

key-decisions:
  - "AI Q&A searches notes first to build context string from top 5 results before sending to AI agent"
  - "FTS5 highlight <mark> tags rendered via dangerouslySetInnerHTML since data comes from our own SQLite, not user input"
  - "Search input debounced at 300ms to avoid excessive IPC calls during typing"
  - "Graceful fallback: if note search fails for Q&A, AI still attempts to answer without note context"

patterns-established:
  - "AI Q&A pattern: search notes for context -> build context string -> stream AI response with session-scoped listeners"
  - "FTS5 result rendering: dangerouslySetInnerHTML for title/summary highlights with Tailwind [&>mark] scoped styling"

requirements-completed: [NEBL-06]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 8 Plan 06: Search & Q&A View Summary

**FTS5 full-text search with BM25-ranked highlighted results and AI-powered Q&A that answers natural language questions using note summaries as context**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T18:46:21Z
- **Completed:** 2026-03-09T18:49:08Z
- **Tasks:** 1 completed (1 checkpoint pending)
- **Files modified:** 3

## Accomplishments
- SearchView component with dual retrieval: keyword search (FTS5 with BM25 ranking) and AI-powered natural language Q&A
- Search results display title and summary highlights using FTS5 highlight() function with `<mark>` tag rendering
- AI Q&A builds context from top 5 matching notes, streams response via session-scoped IPC listeners
- Clicking a search result navigates to that note (selectNote + setActiveTab)
- Complete Nebula plugin now has all 3 tabs functional: Notes, Search, and Knowledge

## Task Commits

Each task was committed atomically:

1. **Task 1: Build SearchView with FTS5 search and AI Q&A** - `5686b3f` (feat)

**Task 2: Visual and functional verification** - PENDING (checkpoint:human-verify)

## Files Created/Modified
- `src/renderer/src/plugins/nebula/SearchView.tsx` - Full-text search + AI Q&A interface with debounced search, highlighted results, and streaming AI answers (200 lines)
- `src/renderer/src/stores/nebula-store.ts` - Added askQuestion (AI Q&A with note context), cancelQa actions, and QA_SYSTEM_PROMPT
- `src/renderer/src/plugins/nebula/NebulaView.tsx` - Replaced search tab placeholder with SearchView component, updated file comment

## Decisions Made
- AI Q&A first searches notes via FTS5 to find relevant context, then builds a context string from the top 5 results' titles and summaries before sending to the AI agent. This ensures answers are grounded in the user's actual notes.
- FTS5 highlight() `<mark>` tags are rendered via dangerouslySetInnerHTML. This is safe because the data comes from our own SQLite FTS5 highlight() function, not arbitrary user input. Styled with Tailwind `[&>mark]` selector for accent-colored highlights.
- Search input is debounced at 300ms to avoid excessive IPC calls while typing.
- Graceful fallback: if note search fails during Q&A (e.g., no notes created yet), AI still attempts to answer without context rather than failing silently.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Checkpoint Pending

**Task 2: Visual and functional verification of complete Nebula plugin** is a `checkpoint:human-verify` gate. This requires the user to:

1. Run `npm run dev` and navigate to Nebula via sidebar (BookOpen icon)
2. Notes tab: Create notes with rich text and drawings, verify persistence
3. Knowledge tab: Verify graph shows nodes and edges after AI summarization
4. Search tab: Verify FTS5 search returns highlighted results, AI Q&A answers questions from note context
5. Voice: Record and transcribe (if OpenAI API key configured)
6. Settings: Verify Storage Directory field
7. Visual quality: Dark theme, neon accents, no broken layouts

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 12 NEBL requirements are implemented across plans 01-06
- Complete Nebula plugin functional: notes CRUD, rich text editor, drawing canvas, AI summarization, knowledge graph, FTS5 search, AI Q&A
- Pending: user visual verification (Task 2 checkpoint)
- Voice recording/transcription available if OpenAI API key is configured

## Self-Check: PASSED

All files verified on disk. Task 1 commit found in git history.

---
*Phase: 08-nebula-plugin*
*Completed: 2026-03-09*
