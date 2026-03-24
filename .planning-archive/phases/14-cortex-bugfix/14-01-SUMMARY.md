---
phase: 14-cortex-bugfix
plan: 01
subsystem: api
tags: [java, python, spring-boot, fastapi, flask, parser, call-graph]

# Dependency graph
requires:
  - phase: 13-codebase-analyzer
    provides: Java/Python parser infrastructure and CallEdge types in parser/index.ts

provides:
  - CallEdge interface aligned across java-parser.ts, python-parser.ts, parser/index.ts
  - Java and Python callEdges wired into parseRepository output
  - Spring Boot route detection for all annotation variants

affects: [cortex-bugfix, codebase-analyzer, flows-view, api-list-tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canonical CallEdge: { id, callerId, calleeId, filePath, line, type } across all parser files"
    - "Generated edge id as callerId->calleeId for uniqueness"
    - "Annotation-line finder pattern: scan backward for annotation line, then extract path from it"

key-files:
  created: []
  modified:
    - src/main/cortex/parser/java-parser.ts
    - src/main/cortex/parser/python-parser.ts
    - src/main/cortex/parser/index.ts

key-decisions:
  - "Canonical CallEdge type extended with type: 'spark-pipeline' and type: 'inject' | 'call' from subparsers — cast as CallEdge[] at aggregation boundary in index.ts"
  - "Injection edge id generated as callerId->calleeId string (no hash needed, these are unique entity id pairs)"
  - "Route path extraction rewritten to use annotation-line finder instead of fragile per-pattern backward regex scan"
  - "Multi-value @GetMapping({path1, path2}) creates one RouteInfo per path"

patterns-established:
  - "Parser CallEdge alignment: all parser files must use { id, callerId, calleeId, filePath, line, type } before pushing to calls array"
  - "callEdges must be wired in index.ts for every new language parser added"

requirements-completed: [CBAN-04, CBAN-05]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 14 Plan 01: Fix Parser Route Detection & CallEdge Wiring Summary

**Fixed empty APIs and Flows for Java/Python BE repos: aligned CallEdge interface across all parsers and wired callEdges into aggregation, plus rewrote Spring Boot route annotation extraction to handle all common patterns**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T22:06:18Z
- **Completed:** 2026-03-14T22:08:21Z
- **Tasks:** 4
- **Files modified:** 3

## Accomplishments
- CallEdge interface in java-parser.ts and python-parser.ts aligned to canonical `{ id, callerId, calleeId, filePath, line, type }` used by call-graph-builder and renderer
- Java and Python callEdges now pushed into the `calls` array in parseRepository — Flows section will no longer be empty for BE repos
- Spring Boot route path extraction rewritten: handles `@GetMapping("/path")`, `@GetMapping(value="/path")`, `@GetMapping(path="/path")`, `@GetMapping({"/p1","/p2"})` multi-value arrays, and bare `@GetMapping`

## Task Commits

Each task was committed atomically:

1. **Task 1: Align Java parser CallEdge to canonical interface** - `e7a3d38` (fix)
2. **Task 2: Align Python parser CallEdge to canonical interface** - `4e8e86c` (fix)
3. **Task 3: Wire Java/Python callEdges into parser index results** - `3c9333e` (fix)
4. **Task 4: Fix Java route path extraction regex** - `c943dab` (fix)

## Files Created/Modified
- `src/main/cortex/parser/java-parser.ts` - Updated CallEdge interface and injection edge push; rewrote route path extraction
- `src/main/cortex/parser/python-parser.ts` - Updated CallEdge interface and all 4 callEdges.push calls
- `src/main/cortex/parser/index.ts` - Added calls.push for javaResult.callEdges and pyResult.callEdges

## Decisions Made
- Cast `javaResult.callEdges as CallEdge[]` at aggregation boundary — subparser types use narrower type subsets which are compatible at runtime
- Injection edge `id` generated as `callerId->calleeId` (entity ids are file-path qualified, so collisions are impossible)
- Route path extraction now uses an annotation-line finder (scan for line starting with `@GetMapping`) instead of trying to match each pattern in one regex — cleaner and more composable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness
- Java/Python BE repo analysis now populates both routes and call edges correctly
- Flows section and APIListTab should show data for Spring Boot and FastAPI/Flask repos
- Plans 14-02 through 14-04 can build on this corrected data foundation

## Self-Check: PASSED

- FOUND: src/main/cortex/parser/java-parser.ts
- FOUND: src/main/cortex/parser/python-parser.ts
- FOUND: src/main/cortex/parser/index.ts
- FOUND: .planning/phases/14-cortex-bugfix/14-01-SUMMARY.md
- Commit e7a3d38 (Task 1) verified
- Commit 4e8e86c (Task 2) verified
- Commit 3c9333e (Task 3) verified
- Commit c943dab (Task 4) verified

---
*Phase: 14-cortex-bugfix*
*Completed: 2026-03-14*
