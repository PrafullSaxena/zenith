/**
 * TaskDatabase -- SQLite database manager for the Task Groomer plugin.
 *
 * Uses better-sqlite3 (synchronous API) with WAL mode.
 * Provides CRUD for the tasks table with all grooming metadata columns
 * nullable from day one (Phase 18 AI agent writes them later).
 *
 * This module runs ONLY in the main process.
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

// ── Row shape returned by prepared statements ─────────────────────────

interface TaskRow {
  id: string
  text: string
  status: string
  capture_source: string
  created_at: number
  updated_at: number
  priority: string | null
  suggested_action: string | null
  jira_ticket_key: string | null
  jira_ticket_url: string | null
  evidence_summary: string | null
  research_summary: string | null
  research_links: string | null
  priority_rationale: string | null
  groomed_at: number | null
}

// ── Public interfaces ─────────────────────────────────────────────────

export interface Task {
  id: string
  text: string
  status: 'dump' | 'groomed' | 'done' | 'delegated' | 'aborted'
  captureSource: 'typed' | 'clipboard'
  createdAt: number // Unix ms
  updatedAt: number // Unix ms
  // Grooming metadata — nullable until Phase 18 AI agent writes them
  priority: 'p1' | 'p2' | 'p3' | null
  suggestedAction: 'do' | 'delegate' | 'defer' | 'delete' | null
  jiraTicketKey: string | null
  jiraTicketUrl: string | null
  evidenceSummary: string | null
  researchSummary: string | null
  researchLinks: string | null // JSON array: {title, url}[]
  priorityRationale: string | null
  groomedAt: number | null // Unix ms
}

export interface CreateTaskInput {
  text: string
  captureSource: 'typed' | 'clipboard'
}

export interface UpdateTaskInput {
  id: string
  fields: Partial<Omit<Task, 'id' | 'createdAt'>>
}

// ── Column name map: camelCase → snake_case ───────────────────────────

const CAMEL_TO_SNAKE: Record<string, string> = {
  text: 'text',
  status: 'status',
  captureSource: 'capture_source',
  updatedAt: 'updated_at',
  priority: 'priority',
  suggestedAction: 'suggested_action',
  jiraTicketKey: 'jira_ticket_key',
  jiraTicketUrl: 'jira_ticket_url',
  evidenceSummary: 'evidence_summary',
  researchSummary: 'research_summary',
  researchLinks: 'research_links',
  priorityRationale: 'priority_rationale',
  groomedAt: 'groomed_at'
}

// ── TaskDatabase class ────────────────────────────────────────────────

export class TaskDatabase {
  private db: Database.Database

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'tasks.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.initSchema()
  }

  // ── Schema ──────────────────────────────────────────────────────────

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id              TEXT    PRIMARY KEY,
        text            TEXT    NOT NULL,
        status          TEXT    NOT NULL DEFAULT 'dump',
        capture_source  TEXT    NOT NULL,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        priority        TEXT,
        suggested_action TEXT,
        jira_ticket_key  TEXT,
        jira_ticket_url  TEXT,
        evidence_summary TEXT,
        research_summary TEXT,
        research_links   TEXT,
        groomed_at       INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    `)

    // Set PRAGMA user_version = 1 to mark initial schema version.
    // Sequential if(version < N) blocks will run ALTER TABLE as needed in future phases.
    const version = this.db.pragma('user_version', { simple: true }) as number
    if (version < 1) {
      this.db.pragma('user_version = 1')
    }
    if (version < 2) {
      try {
        this.db.exec(`ALTER TABLE tasks ADD COLUMN priority_rationale TEXT`)
      } catch {
        // Column may already exist if schema was pre-created — safe to ignore
      }
      this.db.pragma('user_version = 2')
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private rowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      text: row.text,
      status: row.status as Task['status'],
      captureSource: row.capture_source as Task['captureSource'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      priority: (row.priority ?? null) as Task['priority'],
      suggestedAction: (row.suggested_action ?? null) as Task['suggestedAction'],
      jiraTicketKey: row.jira_ticket_key ?? null,
      jiraTicketUrl: row.jira_ticket_url ?? null,
      evidenceSummary: row.evidence_summary ?? null,
      researchSummary: row.research_summary ?? null,
      researchLinks: row.research_links ?? null,
      priorityRationale: row.priority_rationale ?? null,
      groomedAt: row.groomed_at ?? null
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────

  /**
   * Create a new task. Generates a UUID and timestamps automatically.
   */
  createTask(input: CreateTaskInput): Task {
    const id = crypto.randomUUID()
    const now = Date.now()

    this.db
      .prepare(
        `
      INSERT INTO tasks (id, text, status, capture_source, created_at, updated_at)
      VALUES (?, ?, 'dump', ?, ?, ?)
    `
      )
      .run(id, input.text, input.captureSource, now, now)

    const row = this.db.prepare<[string], TaskRow>(`SELECT * FROM tasks WHERE id = ?`).get(id)!

    return this.rowToTask(row)
  }

  /**
   * List tasks. If statuses array provided and non-empty, filters by those statuses.
   * No ORDER BY — renderer Zustand store handles sorting.
   */
  listTasks(statuses?: string[]): Task[] {
    if (statuses && statuses.length > 0) {
      // Use parameterized IN clause — build placeholder string dynamically
      const placeholders = statuses.map(() => '?').join(', ')
      const rows = this.db
        .prepare<string[], TaskRow>(`SELECT * FROM tasks WHERE status IN (${placeholders})`)
        .all(...statuses)
      return rows.map((r) => this.rowToTask(r))
    }

    const rows = this.db.prepare<[], TaskRow>(`SELECT * FROM tasks`).all()
    return rows.map((r) => this.rowToTask(r))
  }

  /**
   * Update task fields. Always refreshes updatedAt. Returns the updated Task.
   * Throws if the task id does not exist.
   */
  updateTask(input: UpdateTaskInput): Task {
    const { id, fields } = input

    // Build SET clause from provided fields, mapping camelCase to snake_case
    const setClauses: string[] = []
    const values: unknown[] = []

    for (const [camelKey, value] of Object.entries(fields)) {
      const snakeKey = CAMEL_TO_SNAKE[camelKey]
      if (!snakeKey) continue // ignore unknown or non-updatable fields
      setClauses.push(`${snakeKey} = ?`)
      values.push(value)
    }

    // Always update updated_at
    setClauses.push('updated_at = ?')
    values.push(Date.now())

    // id goes last for WHERE clause
    values.push(id)

    if (setClauses.length === 1) {
      // Only updated_at — still valid, proceed
    }

    this.db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)

    const row = this.db.prepare<[string], TaskRow>(`SELECT * FROM tasks WHERE id = ?`).get(id)

    if (!row) {
      throw new Error(`Task not found: ${id}`)
    }

    return this.rowToTask(row)
  }

  /**
   * Delete a task by id. Returns { success: true } unconditionally (idempotent).
   */
  deleteTask(id: string): { success: boolean } {
    this.db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id)
    return { success: true }
  }

  /**
   * Close the database connection.
   */
  close(): void {
    this.db.close()
  }
}
