# Phase 14: Data Foundation - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the persistent task storage layer for the Task Groomer plugin: tasks.db (SQLite via better-sqlite3), a TaskRepository class, IPC handlers, and electron-store config for grooming schedule. App boots and tasks survive restart. No UI, no capture, no grooming — this is the contract all other phases build against.

Follow existing Zenith patterns exactly:
- IPC naming: `taskgroomer:action` (mirrors `launchpad:getPricing`, `nebula:saveNote`)
- DB class: wrapper around better-sqlite3, WAL mode, `app.getPath('userData')/tasks.db`
- Preload: `window.api.taskgroomer.*` methods via contextBridge
- TypeScript: `ElectronAPI` interface in `src/renderer/src/types/electron.d.ts`
- Settings storage: `electron-store` under `plugins.taskgroomer.*`
- Plugin entry: register in `src/renderer/src/plugins/registry.ts`

Reference implementations: `src/main/pricing/pricing-db.ts`, `src/main/nebula/database.ts`, `src/main/ipc-handlers.ts`, `src/preload/index.ts`

</domain>

<decisions>
## Implementation Decisions

### Task Schema

Single `tasks` table with all fields, including grooming metadata columns (nullable until groomed). No migration needed when grooming lands in Phase 18.

**Core fields** (always present):
- `id` — TEXT PRIMARY KEY (UUID)
- `text` — TEXT NOT NULL (raw task text as typed)
- `status` — TEXT NOT NULL DEFAULT 'dump' — enum: `dump | groomed | done | delegated | aborted`
- `captureSource` — TEXT NOT NULL — enum: `typed | clipboard`
- `createdAt` — INTEGER NOT NULL (Unix ms timestamp)
- `updatedAt` — INTEGER NOT NULL (Unix ms timestamp)

**Grooming metadata** (nullable, populated by Phase 18 AI agent):
- `priority` — TEXT NULL — enum: `p1 | p2 | p3`
- `suggestedAction` — TEXT NULL — enum: `do | delegate | defer | delete`
- `jiraTicketKey` — TEXT NULL (e.g., "PROJ-123")
- `jiraTicketUrl` — TEXT NULL
- `evidenceSummary` — TEXT NULL (freeform text summary)
- `researchSummary` — TEXT NULL (mini-summary for research-mode tasks)
- `researchLinks` — TEXT NULL (JSON array of `{title, url}` objects)
- `groomedAt` — INTEGER NULL (Unix ms timestamp of last grooming run)

**No `deletedAt` / soft-delete**: `aborted` status covers the "soft removal" use case.

### IPC API Surface

Four channels exposed via `window.api.taskgroomer.*`:

| Channel | Args | Returns |
|---------|------|---------|
| `taskgroomer:createTask` | `{ text: string, captureSource: 'typed' \| 'clipboard' }` | `Task` (full object with generated id + timestamps) |
| `taskgroomer:listTasks` | `{ statuses?: string[] }` | `Task[]` (all matching rows; renderer sorts) |
| `taskgroomer:updateTask` | `{ id: string, fields: Partial<Task> }` | `Task` (updated object) — handles both status transitions AND grooming metadata writes |
| `taskgroomer:deleteTask` | `{ id: string }` | `{ success: boolean }` |

Renderer-side Zustand store handles sorting (e.g., newest first for Dump, priority-first for Groomed). No ORDER BY in SQL — keeps IPC params simple.

### Grooming Config Storage

Stored in `electron-store` under `plugins.taskgroomer.schedule`:

```json
{
  "enabled": true,
  "time": "09:00",
  "frequency": "daily"
}
```

**Frequency options**: `daily | weekdays | manual`

Default: `{ enabled: true, time: "09:00", frequency: "daily" }`

Accessed from renderer via existing `settings:get` / `settings:set` IPC channels (no new channels needed for config).

### DB Initialization & Migrations

- **Schema init**: `CREATE TABLE IF NOT EXISTS tasks (...)` runs on every app start (idempotent)
- **Migration strategy**: `PRAGMA user_version` tracks schema version. Sequential `if (version < N)` blocks run `ALTER TABLE` as needed — same pattern as `nebula/database.ts`
- **First run**: Empty DB, schema-only. No seed data — tasks start from user capture
- **Initial schema version**: 1

### Claude's Discretion

- Exact UUID generation approach (crypto.randomUUID or nanoid)
- WAL journal mode configuration details
- Error return shapes for failed IPC calls (consistent with existing handlers)
- Index strategy (e.g., index on `status` for listTasks filter)

</decisions>

<specifics>
## Specific Ideas

- Follow existing patterns exactly — no new architectural decisions. This plugin should feel identical to Launchpad or Nebula from a main-process structure standpoint.
- `captureSource` field helps the grooming agent in Phase 18 — clipboard tasks (URLs, Jira IDs) may get different grooming heuristics than manually typed ones.
- All grooming metadata columns present from day one means Phases 15-17 can insert/read tasks with zero schema changes. Phase 18 just starts writing to columns that already exist.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-data-foundation*
*Context gathered: 2026-05-20*
