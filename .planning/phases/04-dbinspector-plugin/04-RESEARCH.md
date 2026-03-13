# Phase 4: DbInspector Plugin - Research

**Researched:** 2026-03-14
**Domain:** SQL query console — editor, execution, results display, MySQL support, export
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Split vertical layout by default (editor top, results bottom), like DBeaver
- Toggle to switch to inline output mode (DataGrip-style)
- Multiple query tabs per connection, each with own editor and results
- Tabs persist across sessions (save open tabs and content per connection, restore on launch)
- Status bar below editor showing execution time, row count, and affected rows
- Selection-based + cursor-aware execution: highlight to run selection, Ctrl+Enter runs current statement, Ctrl+Shift+Enter runs all
- Read-only queries by default; per-tab toggle to enable write queries (INSERT/UPDATE/DELETE)
- No query timeout; always show cancel button; spinner + elapsed time counter during execution
- Auto-format SQL as user types or pastes
- Live syntax error highlighting (underline errors before execution)
- Saved/favorite queries library with names for quick access
- Floating icon on each query to send it to existing Optimizer section for EXPLAIN ANALYZE
- Full context-aware autocomplete: SQL keywords + table names + column names from schema + aliases from current query
- Auto-trigger after typing (suggestions appear after 2-3 characters); Ctrl+Space to force open
- Existing schema browser — make left panel collapsible
- Double-click table/column in schema tree to insert name at cursor position in editor
- Fetch 100 rows initially if no LIMIT, then load more on scroll (virtual scroll)
- Columns resizable and sortable (click header to sort)
- NULL values shown as styled badge (dimmed/italic "NULL")
- Long text/JSON values: tooltip on hover, click for full modal view
- Export formats: CSV and JSON; native file save dialog
- Copy: click cell to copy value, right-click row to copy row, toolbar button to copy all as TSV
- SQL execution errors shown inline in results area with error message, line number highlighted in editor
- Connection loss: auto-reconnect + retry query once, show error if still fails
- Reuse existing connection form from DbInspector plugin settings
- Reuse existing connection switcher
- Add connection status badge (green/red dot) in query console toolbar
- Supported engines: PostgreSQL and MySQL

### Claude's Discretion
- Editor library choice (CodeMirror 6 vs Monaco)
- Export scope behavior (all results vs loaded only)
- Schema metadata detail level in autocomplete tooltips
- Keyboard shortcut map beyond the specified execution shortcuts
- Query history UI and search (DBIS-05 implementation details)

### Deferred Ideas (OUT OF SCOPE)
- Visual query builder (DBIS-09) — SQL editor focus for now, visual builder is a separate enhancement
- SQLite, MSSQL, Oracle engine support — start with PostgreSQL + MySQL
- Query explain/plan visualization — existing Optimizer section handles this
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DBIS-01 | Connect to PostgreSQL/MySQL databases with connection string or individual fields | MySQL driver (mysql2) needed; PostgreSQL already implemented via `pg` |
| DBIS-02 | Database connection credentials stored securely via safeStorage | Already implemented — safeStorage pattern in ipc-handlers.ts, credentials store |
| DBIS-03 | Browse database schema — list tables, columns, types, constraints | Already implemented — SchemaExplorer + postgres.ts; MySQL introspection needed |
| DBIS-04 | Execute read-only SQL queries with result table display | `db:query` IPC exists; result display component + CodeMirror editor needed |
| DBIS-05 | Query history with re-run capability | History store pattern established (Phase 03); extend DbHistoryEntry with 'query' type |
| DBIS-06 | Export query results to CSV/JSON | CSV/JSON serialization + native file save dialog via existing `app:selectDirectory` pattern |
| DBIS-07 | Multiple saved connections with quick-switch | Already implemented — ConnectionManager + connections array in db-store |
| DBIS-08 | Table data preview (first N rows) with pagination | Maps to results grid with virtual scroll; `db:query` IPC already wired |
| DBIS-09 | Visual query builder — DEFERRED per CONTEXT.md | Out of scope this phase |
</phase_requirements>

---

## Summary

Phase 4 adds a full SQL query console to the existing DbInspector plugin. The infrastructure is already substantial: `PostgresConnectionManager` handles connection pooling, `db:query` IPC is registered and callable from the renderer, `validateQuery()` enforces read-only mode, and the entire schema browsing pipeline (databases, schemas, tables, columns, foreign keys, indexes, stats) is wired end-to-end. What does NOT yet exist is: (1) the query editor component, (2) the results grid component, (3) the query tab management, (4) MySQL driver and introspection, and (5) export functionality.

The main strategic decision left to Claude is editor library choice. After researching both options, **CodeMirror 6 is the correct choice** for this project. It has a dramatically smaller bundle (approx 300KB vs Monaco's 5–10MB), ships with dedicated `@codemirror/lang-sql` that supports PostgreSQL and MySQL dialects natively, supports schema-aware autocomplete via the `schema` option (tables and columns injected at runtime), and is already used as the standard in tools like Sourcegraph that migrated away from Monaco precisely for these reasons. Monaco would add unnecessary weight and requires separate SQL language server configuration.

The existing codebase establishes clear patterns for everything this phase needs: Zustand store state + actions, IPC via `window.api.db.*`, history persistence via `settings.set/get`, the tab pattern from `DbInspectorView.tsx`, and the query execution + abort pattern from AI streaming. MySQL support requires adding `mysql2` as a dependency and creating a unified connection manager interface — the existing `PostgresConnectionManager` class is PostgreSQL-specific and cannot be reused for MySQL without abstraction.

**Primary recommendation:** Use CodeMirror 6 with `@codemirror/lang-sql` for the editor; add `mysql2` for MySQL support; use `@tanstack/react-virtual` (already in package.json transitively via react-query) for the virtual-scroll results grid; use `sql-formatter` for auto-format on paste.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@codemirror/view` | ^6.x | CodeMirror editor rendering layer | Required peer for all CM6 packages |
| `@codemirror/state` | ^6.x | Editor state management | Required peer for all CM6 packages |
| `@codemirror/lang-sql` | ^6.10.0 | SQL language: syntax highlighting, autocomplete, dialect support | Built-in SQL support with PostgreSQL + MySQL dialects and schema-aware completion |
| `@codemirror/autocomplete` | ^6.x | Autocomplete UI and completion sources | Drives the suggestion dropdown, Ctrl+Space binding |
| `@codemirror/commands` | ^6.x | Standard keymaps (history, indentation, execution bindings) | Required for keyboard shortcuts |
| `@codemirror/theme-one-dark` | ^6.x | Dark theme base for CodeMirror | Matches the project's dark-only theme |
| `mysql2` | ^3.x | MySQL connection driver (Promises API) | Pure-JS, no native bindings required for Electron, Promise-based API |
| `sql-formatter` | ^15.x | SQL auto-formatting | Supports PostgreSQL + MySQL dialects, pure JS, tree-shake friendly |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@codemirror/basic-setup` | ^6.x | Bundled common extensions (line numbers, gutter, fold, search) | Use as base, then layer SQL on top |
| `@codemirror/lint` | ^6.x | Lint markers (underline syntax errors) | Powers live syntax error highlighting requirement |
| `@tanstack/react-virtual` | ^3.x | Virtual scroll for large result tables | Use for the results grid to handle 100–10,000+ rows at 60fps |

Note: `@tanstack/react-query` is already in `package.json` at `^5.69.0`. `@tanstack/react-virtual` is the separate virtualizer package — check if it's already installed transitively before adding.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CodeMirror 6 | Monaco Editor | Monaco is 5–10MB vs CM6 ~300KB; Monaco lacks out-of-box SQL schema injection without language server; Sourcegraph migrated FROM Monaco TO CM6 for exactly these reasons |
| sql-formatter | prettier-plugin-sql | sql-formatter is simpler, no build plugin required, configurable dialect |
| @tanstack/react-virtual | react-window | TanStack Virtual is more composable, better TypeScript, already in ecosystem via react-query |
| mysql2 | mysql (v2) | mysql2 is the maintained successor, Promise-based, faster binary protocol support |

**Installation:**
```bash
npm install @codemirror/view @codemirror/state @codemirror/lang-sql @codemirror/autocomplete @codemirror/commands @codemirror/theme-one-dark @codemirror/basic-setup @codemirror/lint mysql2 sql-formatter @tanstack/react-virtual
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/db/
│   ├── postgres.ts          # EXISTING — PostgresConnectionManager
│   ├── mysql.ts             # NEW — MySqlConnectionManager (same interface)
│   ├── db-manager.ts        # NEW — UnifiedDbManager wrapping both drivers
│   └── introspection.ts     # EXISTING — extend with MySQL schema queries
│
├── renderer/src/plugins/db-inspector/
│   ├── DbInspectorView.tsx  # EXISTING — add 'query' tab to TABS array
│   ├── QueryConsole.tsx     # NEW — container: tabs + split layout
│   ├── QueryTab.tsx         # NEW — single tab: editor + results
│   ├── SqlEditor.tsx        # NEW — CodeMirror 6 wrapper component
│   ├── ResultsGrid.tsx      # NEW — virtual-scroll result table
│   ├── SavedQueriesPanel.tsx # NEW — saved/favorite queries library
│   ├── ConnectionManager.tsx # EXISTING — no changes
│   ├── SchemaExplorer.tsx   # EXISTING — add onInsertAtCursor prop + collapsible
│   └── ...                  # EXISTING — AskAI, QueryOptimizer, ERDiagram, DbHistory
│
├── renderer/src/stores/
│   └── db-store.ts          # EXTEND — add queryTabs, savedQueries, executeQuery action
│
└── renderer/src/types/
    └── database.ts          # EXTEND — add QueryTab, SavedQuery, QueryExecution types
```

### Pattern 1: CodeMirror 6 SQL Editor Setup
**What:** Create a controlled CodeMirror editor component with SQL language support, PostgreSQL dialect, schema-aware autocomplete, and custom keymaps for query execution.
**When to use:** For all SQL editing in the query console.

```typescript
// Source: https://github.com/codemirror/lang-sql (official repo)
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql, PostgreSQL, MySQL } from '@codemirror/lang-sql'
import { autocompletion } from '@codemirror/autocomplete'
import { defaultKeymap, history } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from '@codemirror/basic-setup'

// Schema passed to autocomplete — populated from db-store tables/columns
const dbSchema: Record<string, string[]> = {
  users: ['id', 'email', 'name', 'created_at'],
  orders: ['id', 'user_id', 'total', 'status'],
}

const state = EditorState.create({
  doc: initialSql,
  extensions: [
    basicSetup,
    oneDark,
    sql({
      dialect: PostgreSQL,  // or MySQL depending on connection engine
      schema: dbSchema,     // tables -> columns mapping for autocomplete
      upperCaseKeywords: false,
    }),
    keymap.of([
      { key: 'Mod-Enter', run: () => { onExecuteCurrentStatement(); return true } },
      { key: 'Mod-Shift-Enter', run: () => { onExecuteAll(); return true } },
      ...defaultKeymap,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(update.state.doc.toString())
    }),
  ],
})
```

### Pattern 2: Query Tab State Model
**What:** Each query tab has its own SQL content, result set, execution state, and write-mode toggle.
**When to use:** When managing multiple simultaneous tabs per connection.

```typescript
// New types to add to database.ts
export interface QueryTab {
  id: string
  connectionId: string
  label: string         // e.g. "Query 1", user-renameable
  sql: string
  writeEnabled: boolean  // per-tab write mode toggle
  lastResult: QueryExecution | null
}

export type QueryExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled'

export interface QueryExecution {
  status: QueryExecutionStatus
  rows: Record<string, unknown>[]
  fields: { name: string; dataTypeID: number }[]
  rowCount: number
  totalRowCount: number | null   // null = unknown (no COUNT(*) run)
  executionTimeMs: number
  error?: string
  errorLine?: number             // line number to highlight in editor
  hasMore: boolean               // true if rows were truncated at 100
  sql: string                    // the SQL that was executed
}
```

### Pattern 3: MySQL Unified Manager Interface
**What:** Abstract PostgreSQL and MySQL behind a common interface so IPC handlers don't need engine-specific logic.
**When to use:** New `db-manager.ts` that the IPC handlers call instead of `dbManager` directly.

```typescript
// Source: project pattern — mirrors existing PostgresConnectionManager API
export interface IDbManager {
  connect(config: DbConnectionConfig): Promise<void>
  disconnect(connectionId: string): Promise<void>
  isConnected(connectionId: string): boolean
  query(connectionId: string, sql: string): Promise<QueryResult>
  getTables(connectionId: string, schema: string): Promise<TableInfo[]>
  getColumns(connectionId: string, schema: string, table: string): Promise<ColumnInfo[]>
  getForeignKeys(connectionId: string, schema: string): Promise<ForeignKey[]>
  getIndexes(connectionId: string, schema: string, table: string): Promise<IndexInfo[]>
  getTableStats(connectionId: string, schema: string, table: string): Promise<TableStats>
  getSchemas(connectionId: string): Promise<string[]>
  getDatabases(connectionId: string): Promise<string[]>
  explain(connectionId: string, sql: string): Promise<string>
}

export class UnifiedDbManager {
  private managers = new Map<string, IDbManager>()  // connectionId -> manager

  getManager(connectionId: string): IDbManager { ... }
  // routes to PostgresConnectionManager or MySqlConnectionManager based on engine
}
```

### Pattern 4: Write-Mode Validation at IPC Layer
**What:** The existing `validateQuery()` only allows SELECT/EXPLAIN/WITH. For write-enabled tabs, bypass this validation for DML.
**When to use:** When user enables the per-tab write toggle.

```typescript
// Extend db:query IPC handler signature
ipcMain.handle('db:query', async (_event, connectionId: string, sql: string, allowWrite?: boolean) => {
  if (!allowWrite) {
    validateQuery(sql)  // throws for INSERT/UPDATE/DELETE
  }
  const result = await dbManager.query(connectionId, sql)
  return { rows: result.rows, fields: ..., rowCount: result.rowCount ?? 0, command: result.command }
})
```

### Pattern 5: Schema Metadata for Autocomplete
**What:** Build the CodeMirror `schema` object from the tables/columns already loaded in db-store.
**When to use:** When initializing or updating the editor when schema changes.

```typescript
// In SqlEditor.tsx — derive schema from store state
function buildCmSchema(
  tables: TableInfo[],
  columns: ColumnInfo[],
  selectedTable: string | null
): Record<string, string[]> {
  // columns in db-store are for selectedTable only
  // For full autocomplete, fetch all columns per table lazily
  const schema: Record<string, string[]> = {}
  for (const t of tables) {
    schema[t.name] = []  // populated as user expands tables
  }
  if (selectedTable && columns.length > 0) {
    schema[selectedTable] = columns.map(c => c.name)
  }
  return schema
}
// Note: for full column autocomplete across all tables, store must
// cache columns per table (lazy-load on first access)
```

### Pattern 6: Export to CSV/JSON
**What:** Serialize the result rows to CSV or JSON, then trigger native file save dialog via existing `app` IPC.
**When to use:** When user clicks export button.

```typescript
// In renderer — no new IPC needed; reuse app:selectDirectory pattern
function exportResults(rows: Record<string, unknown>[], fields: { name: string }[], format: 'csv' | 'json') {
  let content: string
  if (format === 'csv') {
    const headers = fields.map(f => f.name).join(',')
    const dataRows = rows.map(row =>
      fields.map(f => {
        const v = row[f.name]
        if (v === null || v === undefined) return ''
        const s = String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s
      }).join(',')
    )
    content = [headers, ...dataRows].join('\n')
  } else {
    content = JSON.stringify(rows, null, 2)
  }
  // Use Electron shell.saveFile or showSaveDialog via new IPC handler
  window.api.app.saveFile({ content, defaultFilename: `query-results.${format}` })
}
```

Note: `app.saveFile` IPC does not currently exist — needs to be added alongside `db:exportQueryResults` or as a general `app:saveTextFile` handler using Electron's `dialog.showSaveDialog`.

### Anti-Patterns to Avoid
- **Loading all columns upfront for autocomplete:** Fetching all columns for all tables at connect time is expensive on large schemas. Instead, lazily cache columns per table as the user expands them in the schema tree, and update the CodeMirror schema object incrementally.
- **Running queries in renderer process:** All SQL execution MUST go through IPC to the main process. The sandbox=true Electron setting prevents any direct node module access from renderer.
- **Single mutable result array for virtual scroll:** For "load more on scroll," append new rows to the array rather than replacing it. Replacing re-mounts the virtualizer and loses scroll position.
- **Sharing query tab state across connections:** Each tab is scoped to a connectionId. If the connection disconnects, tabs must show a disconnected state rather than throwing errors.
- **Not aborting long-running queries on tab close:** When a user closes a tab with an active query, abort the query via a `db:cancelQuery` IPC (needs to be added) rather than letting it run to completion against the pool.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL syntax highlighting and parsing | Custom regex tokenizer | `@codemirror/lang-sql` | Handles all SQL dialects, comments, string escaping, nested subqueries |
| SQL autocomplete dropdown | Custom dropdown + keyword list | `@codemirror/lang-sql` + `@codemirror/autocomplete` | Handles popup positioning, keyboard nav, filtering, scoring |
| SQL formatting | Custom whitespace normalization | `sql-formatter` | Handles CTE indentation, operator spacing, multi-statement formatting, dialect differences |
| Virtual scroll for 10K rows | Custom windowing math | `@tanstack/react-virtual` | Handles variable row heights, overscan, scroll restoration, 60fps |
| MySQL connection pooling | Custom tcp socket management | `mysql2` Pool API | Handles connection retries, idle timeout, prepared statements, binary protocol |
| CSV serialization | Custom string joining | Inline function (trivial) | CSV escaping of commas/quotes/newlines is 10 lines; no library needed |

**Key insight:** CodeMirror 6 does 95% of the editor work. The real complexity is in the tab state model, the schema loading strategy for autocomplete, and the MySQL abstraction layer.

---

## Common Pitfalls

### Pitfall 1: MySQL vs PostgreSQL Schema Queries
**What goes wrong:** Using PostgreSQL-specific catalog queries (pg_namespace, pg_class) for MySQL connections.
**Why it happens:** The existing `postgres.ts` uses pg_catalog directly for performance. MySQL uses `information_schema` with different column names (`TABLE_SCHEMA`, `TABLE_NAME` in MySQL vs `schemaname`, `relname` in PostgreSQL).
**How to avoid:** Create `mysql.ts` with a `MySqlConnectionManager` implementing the same interface but using `information_schema` queries. The unified manager routes by engine type stored in `DbConnectionConfig`.
**Warning signs:** "Unknown table 'pg_namespace'" errors in MySQL connections.

### Pitfall 2: CodeMirror 6 React Integration — EditorView Not a Controlled Component
**What goes wrong:** Treating CodeMirror's `EditorView` like a React controlled input. Setting `doc` as a prop and re-creating the editor on every state change.
**Why it happens:** React developers expect value/onChange patterns. CodeMirror 6 is imperative — you create it once and dispatch transactions.
**How to avoid:** Create the `EditorView` once in a `useEffect`, store it in a `useRef`, and use `view.dispatch({ changes: ... })` to update content from outside. Only recreate the editor when the dialect (PostgreSQL/MySQL) changes.
**Warning signs:** Editor loses cursor position on every keystroke; autocomplete popup flickers.

### Pitfall 3: validateQuery() Blocking Write Queries
**What goes wrong:** User enables the per-tab write toggle but DML queries (INSERT/UPDATE/DELETE) still fail because `validateQuery()` is always called in the `db:query` IPC handler.
**Why it happens:** The existing `validateQuery()` function hard-rejects anything that isn't SELECT/EXPLAIN/WITH. It's called unconditionally in the IPC handler.
**How to avoid:** Pass `allowWrite: boolean` as a parameter to `db:query` IPC. Only call `validateQuery()` when `allowWrite` is false. Also validate `allowWrite` against the connection's `readStrategy` — if `readStrategy === 'read-only'`, reject write queries regardless of the per-tab toggle.
**Warning signs:** "Only SELECT, WITH, and EXPLAIN statements are allowed" error when write mode is enabled.

### Pitfall 4: Tab Persistence Storage Key Collisions
**What goes wrong:** Tabs saved for connection A overwrite or mix with tabs from connection B because storage keys don't include the connection ID.
**Why it happens:** Using a generic key like `'queryConsole.tabs'` without namespacing by connection.
**How to avoid:** Use `'queryConsole.tabs.${connectionId}'` as the storage key. Load tabs on connection select, save on every tab change.
**Warning signs:** Opening one connection shows tabs from a previous connection.

### Pitfall 5: Result Grid Sorting with NULL Values
**What goes wrong:** Sorting a column with NULL values crashes or produces inconsistent ordering (NULL before vs after real values depends on JavaScript's `undefined` comparison).
**Why it happens:** `undefined` and `null` don't sort predictably with `a - b` or `a.localeCompare(b)`.
**How to avoid:** Normalize NULLs to a sentinel value in the sort comparator. PostgreSQL sorts NULLs last by default; replicate this by pushing `null` to the end.
**Warning signs:** Sort produces NaN, or NULL rows appear randomly in sorted output.

### Pitfall 6: mysql2 Requires Externalization from ASAR
**What goes wrong:** `mysql2` fails in production builds because it can't find its binary/native dependencies when packed in ASAR.
**Why it happens:** Similar to `better-sqlite3` — native addon packages need to be extracted from ASAR and potentially rebuilt.
**How to avoid:** mysql2 is described as "free from native bindings" in pure-JS mode, but verify this holds in the Electron build. Add mysql2 to `asarUnpack` in electron-builder config if issues arise. The existing `better-sqlite3` externalization pattern in `electron.vite.config.ts` is the template.
**Warning signs:** "Cannot find module" errors in production but not development.

### Pitfall 7: Double-click Insert in SchemaExplorer Loses Editor Focus
**What goes wrong:** Double-clicking a table name in SchemaExplorer inserts the name but then the editor is no longer focused, confusing the user.
**Why it happens:** The click event on the tree node steals focus from the CodeMirror editor. CodeMirror's `view.dispatch` updates content but doesn't re-focus the editor.
**How to avoid:** After dispatching the insert transaction, call `view.focus()` to return focus to the editor.
**Warning signs:** After double-clicking a table name, the next keystroke doesn't appear in the editor.

---

## Code Examples

### CodeMirror 6 Schema-Aware Autocomplete

```typescript
// Source: https://github.com/codemirror/lang-sql (official README)
import { sql, PostgreSQL } from '@codemirror/lang-sql'

// Build schema from tables + column metadata
const schema: Record<string, string[]> = {
  users: ['id', 'email', 'name', 'created_at', 'updated_at'],
  orders: ['id', 'user_id', 'status', 'total', 'created_at'],
  order_items: ['id', 'order_id', 'product_id', 'quantity', 'price'],
}

const sqlExtension = sql({
  dialect: PostgreSQL,
  schema,
  defaultSchema: 'public',
  upperCaseKeywords: false,
})
```

### Dispatch Insert-at-Cursor from Outside Editor

```typescript
// Source: CodeMirror 6 transaction API
function insertAtCursor(view: EditorView, text: string): void {
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  })
  view.focus()
}

// Usage: double-click on table in SchemaExplorer
onDoubleClickTable={(tableName) => {
  if (editorViewRef.current) {
    insertAtCursor(editorViewRef.current, tableName)
  }
}}
```

### TanStack Virtual for Result Rows

```typescript
// Source: https://tanstack.com/virtual/latest (official docs)
import { useVirtualizer } from '@tanstack/react-virtual'

function ResultsGrid({ rows, fields }: { rows: Record<string, unknown>[], fields: { name: string }[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,  // row height in px
    overscan: 10,
  })

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <table style={{ width: '100%' }}>
        <thead>...</thead>
        <tbody style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => (
            <tr
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
              }}
            >
              {fields.map(f => (
                <td key={f.name}>{rows[virtualRow.index][f.name] ?? <NullBadge />}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### mysql2 Pool (mirrors pg Pool API)

```typescript
// Source: https://github.com/sidorares/node-mysql2 (official README)
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: config.host,
  port: config.port,
  user: config.username,
  password: config.password,
  database: config.database,
  waitForConnections: true,
  connectionLimit: 5,
  idleTimeoutMillis: 30000,
  connectTimeout: 15000,
})

// Execute query (Promise-based, no callback API)
const [rows, fields] = await pool.execute(sql)
```

### SQL Formatter on Paste

```typescript
// Source: https://github.com/sql-formatter-org/sql-formatter (official)
import { format } from 'sql-formatter'

function formatSql(sql: string, engine: 'postgresql' | 'mysql'): string {
  try {
    return format(sql, {
      language: engine === 'postgresql' ? 'postgresql' : 'mysql',
      tabWidth: 2,
      keywordCase: 'upper',
    })
  } catch {
    return sql  // return unformatted if parse fails (e.g. partial SQL)
  }
}

// In CodeMirror — intercept paste events
EditorView.domEventHandlers({
  paste: (event, view) => {
    const text = event.clipboardData?.getData('text/plain')
    if (text) {
      event.preventDefault()
      const formatted = formatSql(text, connectionEngine)
      view.dispatch({ changes: { from: view.state.selection.main.from, insert: formatted } })
    }
  }
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monaco Editor for SQL in Electron apps | CodeMirror 6 | 2022–2024 (Sourcegraph migration) | ~20x smaller bundle, better modular extension system |
| react-window for virtualization | @tanstack/react-virtual v3 | 2023 | Better TypeScript, composable, no required div wrappers |
| mysql npm package | mysql2 | 2020+ | mysql2 is the maintained successor; mysql package is in maintenance mode |
| information_schema for PostgreSQL | pg_catalog directly | — | Existing code already uses this correctly for performance |

**Deprecated/outdated:**
- `mysql` (v2.x): in maintenance mode, use `mysql2` instead
- `react-window`: superseded by `@tanstack/react-virtual` in modern React projects
- `codemirror` (v5): legacy version; project should use `@codemirror/*` v6 packages

---

## Open Questions

1. **Export scope: all results vs loaded rows only**
   - What we know: User decided "Claude's discretion"
   - What's unclear: To export ALL results (beyond the 100-row initial fetch), we'd need to re-run the query without LIMIT or with increasing OFFSETs — complex and potentially dangerous for large tables
   - Recommendation: Export loaded rows only. Show a clear label "Export 100 loaded rows" or "Export all X rows loaded." Running a second unbounded query for export silently could surprise the user with long waits. Document this choice clearly in the UI.

2. **New IPC needed: `app:saveTextFile` or `db:exportQueryResults`**
   - What we know: No IPC handler currently exists for writing a string to disk via native file dialog
   - What's unclear: Should this be a general `app:saveTextFile(content, filename, filters)` or specific to query exports?
   - Recommendation: Add general `app:saveTextFile` handler using Electron `dialog.showSaveDialog` + `fs.writeFile`. More reusable across the app.

3. **Per-tab column caching for full autocomplete**
   - What we know: db-store currently loads columns only for `selectedTable` (the table you expand in the tree). Full autocomplete needs columns for all tables.
   - What's unclear: Pre-fetching all columns at connect time could be expensive for large schemas (50+ tables).
   - Recommendation: Lazy-fetch per table on first access. Cache in a `columnsCache: Map<string, ColumnInfo[]>` in db-store. Update the CodeMirror schema object incrementally as the cache fills.

4. **MySQL INFORMATION_SCHEMA introspection query differences**
   - What we know: MySQL uses `information_schema.COLUMNS`, `information_schema.TABLE_CONSTRAINTS` etc., all with different column names than PostgreSQL's pg_catalog.
   - What's unclear: MySQL schema browsing performance — `information_schema` in MySQL is notoriously slow on databases with many tables (unlike PostgreSQL where it's a view over pg_catalog).
   - Recommendation: Use `information_schema` for MySQL but add the same column name mapping, and add `WHERE TABLE_SCHEMA = ?` filter to avoid full DB scans. Flag this as a known limitation in any inline comments.

---

## Sources

### Primary (HIGH confidence)
- `@codemirror/lang-sql` GitHub repo — SQL dialect support, schema option, autocomplete config verified
- `mysql2` npm/GitHub — Pure-JS driver for Electron, Promise API, Pool creation syntax
- `sql-formatter` GitHub/npm — PostgreSQL + MySQL dialect support, `format()` API
- `@tanstack/react-virtual` official docs — `useVirtualizer` hook API, `getTotalSize()`, `getVirtualItems()`

### Secondary (MEDIUM confidence)
- Sourcegraph blog: "Migrating from Monaco to CodeMirror" — confirms bundle size differential and schema injection approach (verified with multiple sources)
- CodeMirror discuss forum threads — confirms schema option two-level limitation (table → columns), workarounds for alias completion

### Tertiary (LOW confidence — flag for validation)
- mysql2 ASAR packaging behavior in Electron production — described as "native-binding free" but needs live verification in this project's Electron build config
- @codemirror/lang-sql alias-aware autocomplete (current query aliases like `SELECT u.name FROM users u`) — forum posts suggest this is partially supported but behavior needs verification at implementation time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — CodeMirror 6 packages verified via GitHub, mysql2 via npm/GitHub, sql-formatter via GitHub
- Architecture: HIGH — based on direct code reading of postgres.ts, db-store.ts, ipc-handlers.ts, preload/index.ts
- Pitfalls: MEDIUM — CodeMirror React integration and mysql2 ASAR issues from community sources; validateQuery bypass is verified by reading the source

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (30 days — all libraries are stable)
