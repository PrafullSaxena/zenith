---
phase: 04-dbinspector-plugin
plan: 01
subsystem: database
tags: [mysql, mysql2, postgresql, ipc, electron, typescript]

# Dependency graph
requires:
  - phase: 04-dbinspector-plugin
    provides: PostgresConnectionManager, existing db IPC handlers, database.ts types
provides:
  - MySqlConnectionManager with full pool-based connection and schema introspection
  - UnifiedDbManager routing all operations to PostgreSQL or MySQL by engine type
  - QueryTab/QueryExecution/SavedQuery/QueryExecutionStatus types in database.ts
  - db:query with allowWrite/limit/offset pagination and hasMore detection
  - db:cancelQuery IPC handler for query cancellation
  - db:allColumns IPC handler for bulk column fetch (autocomplete schema)
  - app:saveTextFile IPC handler using Electron native save dialog
  - engine field on DbConnection/DbConnectionConfig for MySQL/PostgreSQL discrimination
affects:
  - 04-02
  - 04-03
  - 04-04

# Tech tracking
tech-stack:
  added:
    - mysql2 (^3.19.1) — MySQL2 Promise-based driver with pool support
  patterns:
    - UnifiedDbManager wraps both PG and MySQL managers, routes by engineMap
    - DbManagerLike duck-type interface in introspection.ts (compatible with both managers)
    - cancelQuery via MySqlConnectionManager.cancelQuery (KILL QUERY) or pg_cancel_backend
    - Pagination via LIMIT/OFFSET injection when /\bLIMIT\b/i not in SQL
    - db:allColumns uses concurrency-limited batch of 5 for column fetching

key-files:
  created:
    - src/main/db/mysql.ts
    - src/main/db/db-manager.ts
  modified:
    - src/renderer/src/types/database.ts
    - src/main/ipc-handlers.ts
    - src/preload/index.ts
    - src/renderer/src/types/electron.d.ts
    - src/main/db/introspection.ts

key-decisions:
  - "engine field optional on DbConnection/DbConnectionConfig — defaults to postgresql for backward compat with safeStorage-encrypted connections"
  - "MySqlConnectionManager.cancelQuery tracks thread IDs via SELECT CONNECTION_ID() before each query, uses KILL QUERY for cancellation"
  - "db:query pagination: appends LIMIT N OFFSET M only if /\\bLIMIT\\b/i not present in SQL — user queries with explicit LIMIT are not double-wrapped"
  - "hasMore detection: result.rows.length === limit (i.e. if rows returned equals limit, more may exist)"
  - "introspection.ts updated to use DbManagerLike duck-type interface instead of PostgresConnectionManager — both managers satisfy it"
  - "db:allColumns uses concurrency limit of 5 to avoid overwhelming pool during bulk schema fetch"

patterns-established:
  - "DbManagerLike pattern: define minimal interface in introspection utilities instead of concrete manager type"
  - "UnifiedDbManager engineMap pattern: store engine per connectionId at connect time, route all subsequent calls"

requirements-completed:
  - DBIS-01
  - DBIS-02
  - DBIS-04
  - DBIS-06
  - DBIS-07

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 4 Plan 1: MySQL Driver, Unified DB Manager, and Query Console IPC Infrastructure Summary

**mysql2 pool-based MySqlConnectionManager + UnifiedDbManager routing engine by ID + db:query with pagination/write-mode + cancel/allColumns/saveTextFile IPC handlers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T03:40:24Z
- **Completed:** 2026-03-14T03:45:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created MySqlConnectionManager (521 lines) with full mysql2 pool-based connection, schema introspection via information_schema, query cancellation via KILL QUERY, and error message enhancement
- Created UnifiedDbManager (232 lines) routing all operations to PostgreSQL or MySQL by engine type with backward-compatible defaulting to postgresql
- Extended database.ts with QueryTab (outputMode: split/inline), QueryExecution, SavedQuery, QueryExecutionStatus types plus 'query' history type and 'query-console' tab
- Added db:query with allowWrite bypass, LIMIT/OFFSET pagination, and hasMore detection
- Added db:cancelQuery, db:allColumns (concurrency-limited bulk fetch), and app:saveTextFile IPC handlers
- Updated preload bridge and electron.d.ts type declarations for all new APIs

## Task Commits

1. **Task 1: Add query console types, MySQL driver, and unified DB manager** - `30969fe` (feat)
2. **Task 2: Wire IPC handlers and preload bridge for query console operations** - `6d4df63` (feat)

**Plan metadata:** [final commit hash] (docs: complete plan)

## Files Created/Modified

- `src/main/db/mysql.ts` - MySqlConnectionManager with pool-based connections and full schema introspection
- `src/main/db/db-manager.ts` - UnifiedDbManager routing PostgreSQL/MySQL by engine type
- `src/renderer/src/types/database.ts` - QueryTab/QueryExecution/SavedQuery/QueryExecutionStatus types; engine field on connections
- `src/main/ipc-handlers.ts` - UnifiedDbManager replaces PostgresConnectionManager; new db:cancelQuery/db:allColumns/app:saveTextFile; db:query with pagination
- `src/preload/index.ts` - New cancelQuery/allColumns/saveTextFile bridges; updated query/connect/testConnection signatures
- `src/renderer/src/types/electron.d.ts` - Type declarations for all new IPC methods
- `src/main/db/introspection.ts` - DbManagerLike interface replaces PostgresConnectionManager type parameter

## Decisions Made

- engine field optional on DbConnection/DbConnectionConfig — defaults to 'postgresql' for backward compat with safeStorage-encrypted connections
- MySqlConnectionManager.cancelQuery tracks thread IDs via SELECT CONNECTION_ID() before each query, uses KILL QUERY for cancellation
- db:query pagination: appends LIMIT N OFFSET M only if `/\bLIMIT\b/i` not present in SQL — user queries with explicit LIMIT are not double-wrapped
- hasMore detection: `result.rows.length === limit` (if rows returned equals limit, more may exist)
- introspection.ts updated to use DbManagerLike duck-type interface — both PostgresConnectionManager and UnifiedDbManager satisfy it
- db:allColumns uses concurrency limit of 5 to avoid overwhelming the pool during bulk schema fetch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated introspection.ts to use DbManagerLike interface**
- **Found during:** Task 2 (wiring IPC handlers)
- **Issue:** introspection.ts typed its manager parameter as `PostgresConnectionManager`, making it incompatible with `UnifiedDbManager` after the swap in ipc-handlers.ts
- **Fix:** Replaced the `PostgresConnectionManager` type import with a `DbManagerLike` interface in introspection.ts that both managers satisfy (duck typing)
- **Files modified:** src/main/db/introspection.ts
- **Verification:** TypeScript compiles clean (`npx tsc --noEmit`)
- **Committed in:** 6d4df63 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical compatibility fix)
**Impact on plan:** Required fix for UnifiedDbManager to work with existing introspection utilities. No scope creep.

## Issues Encountered

None — TypeScript compiled clean after both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend infrastructure complete for query console feature
- MySqlConnectionManager and UnifiedDbManager ready for connection UI in 04-02
- All IPC handlers registered and callable from renderer via window.api
- QueryTab/QueryExecution types ready for query console store and UI components
- Existing PostgreSQL connections fully backward-compatible (engine defaults to 'postgresql')

---
*Phase: 04-dbinspector-plugin*
*Completed: 2026-03-14*
