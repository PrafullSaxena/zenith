# Phase 4: DbInspector Plugin - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a SQL query console to the existing DbInspector plugin — query editor with intellisense, result display, execution controls, and export. The DbInspector plugin already has connection management, schema browser, connection switcher, and an Optimizer section. This phase adds the query execution experience on top of existing infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Query Editor Layout
- Split vertical by default (editor top, results bottom) — like DBeaver
- Toggle to switch to inline output mode (DataGrip-style) — results appear inline after each statement
- Multiple query tabs per connection, each with its own editor and results
- Tabs persist across sessions (save open tabs and content per connection, restore on launch)
- Status bar below editor showing execution time, row count, and affected rows

### Query Execution
- Selection-based + cursor-aware execution:
  - Highlight text to run selection
  - Ctrl+Enter (Cmd+Enter on Mac) runs current statement at cursor
  - Ctrl+Shift+Enter (Cmd+Shift+Enter on Mac) runs all statements
- Read-only queries by default — each tab has an individual toggle to enable write queries (INSERT/UPDATE/DELETE)
- No query timeout — queries run until complete, but always show a cancel button
- Spinner + elapsed time counter during execution

### Editor Features
- Editor library: Claude's discretion (CodeMirror 6 or Monaco — researcher decides)
- Auto-format SQL as user types or pastes
- Live syntax error highlighting (underline errors before execution)
- Saved/favorite queries library with names for quick access
- Floating icon on each query to send it to the existing Optimizer section for EXPLAIN ANALYZE

### Intellisense / Autocomplete
- Full context-aware: SQL keywords + table names + column names from connected schema + aliases from current query
- Auto-trigger after typing (suggestions appear after 2-3 characters)
- Ctrl+Space to force open suggestions
- Schema metadata in tooltips: Claude's discretion on detail level

### Schema Browser Integration
- Existing schema browser — make left panel collapsible
- Double-click a table/column in schema tree to insert its name at cursor position in editor

### Results Display
- Fetch 100 rows initially if no LIMIT specified, then load more on scroll (virtual scroll)
- Columns are resizable and sortable (click header to sort)
- NULL values shown as styled badge (dimmed/italic "NULL")
- Long text/JSON values: tooltip on hover for quick peek, click for full modal view

### Export & Clipboard
- Export formats: CSV and JSON
- File save dialog (native OS) for export location
- Copy: click cell to copy value, right-click row to copy row, toolbar button to copy all as TSV
- Export scope (all results vs loaded): Claude's discretion

### Error Handling
- SQL execution errors shown inline in results area with error message, line number highlighted in editor
- Connection loss: auto-reconnect + retry query once, show error if still fails
- Spinner with elapsed time counter visible during query execution

### Connection Management
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

</decisions>

<specifics>
## Specific Ideas

- "Like DBeaver query console" — the primary UX reference for editor layout and execution model
- "Like JetBrains DataGrip" — reference for the inline output toggle mode
- Floating EXPLAIN icon per query links to existing Optimizer section in DbInspector
- Per-tab write toggle is a safety feature — prevents accidental mutations
- Schema browser already exists — just needs collapsible panel enhancement

</specifics>

<deferred>
## Deferred Ideas

- Visual query builder (DBIS-09) — SQL editor focus for now, visual builder is a separate enhancement
- SQLite, MSSQL, Oracle engine support — start with PostgreSQL + MySQL
- Query explain/plan visualization — existing Optimizer section handles this

</deferred>

---

*Phase: 04-dbinspector-plugin*
*Context gathered: 2026-03-14*
