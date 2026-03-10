/**
 * NebulaDatabase -- SQLite database manager for the Nebula plugin.
 *
 * Uses better-sqlite3 (synchronous API) with WAL mode and FTS5 indexing.
 * Provides CRUD for notes, full-text search, knowledge graph queries,
 * and transcription persistence.
 *
 * This module runs ONLY in the main process.
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

// ── Row shapes returned by prepared statements ────────────────────────

interface NoteRow {
  id: string
  title: string
  content: string
  drawing: string | null
  summary: string | null
  topics: string
  created_at: string
  updated_at: string
}

interface NoteListRow {
  id: string
  title: string
  summary: string | null
  updated_at: string
}

interface SearchRow {
  id: string
  title: string
  title_highlight: string | null
  summary_highlight: string | null
  summary: string | null
  updated_at: string
  rank: number
}

interface GraphNodeRow {
  id: string
  title: string
  connections: number
}

interface GraphEdgeRow {
  source_id: string
  target_id: string
  relationship: string
  weight: number
}

interface TranscriptionRow {
  id: string
  note_id: string | null
  audio_path: string
  transcript: string
  speakers: string | null
  created_at: string
}

interface RowidRow {
  rowid: number
}

// ── Public input shapes ───────────────────────────────────────────────

export interface UpsertNoteInput {
  id: string
  title: string
  content: string // Full Tiptap JSON as string
  drawing?: string | null
  summary?: string | null
  topics?: string[]
  contentText: string // Plain text extracted from Tiptap content (for FTS)
}

export interface UpsertEdgeTarget {
  targetId: string
  relationship: string
  weight: number
}

export interface SaveTranscriptionInput {
  id: string
  noteId: string | null
  audioPath: string
  transcript: string
  speakers: string // JSON string of TranscriptionSegment[]
}

// ── NebulaDatabase class ──────────────────────────────────────────────

export class NebulaDatabase {
  private db: Database.Database

  constructor(storagePath?: string) {
    const dbPath = storagePath
      ? path.join(storagePath, 'nebula.db')
      : path.join(app.getPath('userData'), 'nebula.db')

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.initSchema()
  }

  // ── Schema ──────────────────────────────────────────────────────────

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Untitled',
        content TEXT NOT NULL DEFAULT '{}',
        drawing TEXT,
        summary TEXT,
        topics TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS graph_edges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        relationship TEXT NOT NULL DEFAULT 'related',
        weight REAL NOT NULL DEFAULT 1.0,
        UNIQUE(source_id, target_id)
      );

      CREATE TABLE IF NOT EXISTS transcriptions (
        id TEXT PRIMARY KEY,
        note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
        audio_path TEXT NOT NULL,
        transcript TEXT NOT NULL,
        speakers TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    // FTS5 migration: the original schema used content='notes' which
    // references a 'content_text' column that does not exist in the notes
    // table, causing SQLITE_ERROR on every write.  Fix: recreate as a
    // standalone FTS table (no content sync) so we manage the index manually.
    this.migrateFts()
  }

  /**
   * Ensure the notes_fts table is a standalone FTS5 table.
   * Drops the old content-synced table if it exists and rebuilds.
   */
  private migrateFts(): void {
    // Check if notes_fts already exists
    const existing = this.db
      .prepare<[], { sql: string }>(
        `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notes_fts'`
      )
      .get()

    let needsRebuild = false

    if (existing && existing.sql && existing.sql.includes("content='notes'")) {
      // Old broken schema — drop and recreate
      this.db.exec(`DROP TABLE notes_fts`)
      needsRebuild = true
    }

    if (!existing) {
      // First-time creation — need to populate index
      needsRebuild = true
    }

    // Create standalone FTS table (no content= directive)
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title, summary, content_text
      )
    `)

    // Also check: FTS table exists but is empty while notes table has data
    // (can happen after incomplete migration from a previous session)
    if (!needsRebuild) {
      const ftsCount = this.db
        .prepare<[], { cnt: number }>(`SELECT COUNT(*) AS cnt FROM notes_fts`)
        .get()
      const notesCount = this.db
        .prepare<[], { cnt: number }>(`SELECT COUNT(*) AS cnt FROM notes`)
        .get()
      if ((ftsCount?.cnt ?? 0) === 0 && (notesCount?.cnt ?? 0) > 0) {
        needsRebuild = true
      }
    }

    if (needsRebuild) {
      this.rebuildFtsIndex()
    }
  }

  /**
   * Rebuild the entire FTS index from the notes table.
   * Called after migration or to repair a corrupted index.
   */
  private rebuildFtsIndex(): void {
    interface ContentRow {
      rowid: number
      title: string
      summary: string | null
      content: string
    }

    const rows = this.db
      .prepare<[], ContentRow>(
        `SELECT rowid, title, summary, content FROM notes`
      )
      .all()

    if (rows.length === 0) return

    const deleteFts = this.db.prepare(`DELETE FROM notes_fts`)
    const insertFts = this.db.prepare(
      `INSERT INTO notes_fts(rowid, title, summary, content_text) VALUES (?, ?, ?, ?)`
    )

    const txn = this.db.transaction(() => {
      deleteFts.run()
      for (const row of rows) {
        // Extract plain text from stored Tiptap JSON
        let plainText = ''
        try {
          const parsed = JSON.parse(row.content)
          plainText = this.extractText(parsed)
        } catch {
          plainText = ''
        }
        insertFts.run(row.rowid, row.title, row.summary ?? '', plainText)
      }
    })

    txn()
  }

  /**
   * Simple plain text extractor for Tiptap JSON documents.
   */
  private extractText(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as Record<string, unknown>
    if (n.type === 'text' && typeof n.text === 'string') return n.text
    if (Array.isArray(n.content)) {
      return n.content.map((child) => this.extractText(child)).join(' ')
    }
    return ''
  }

  // ── Notes CRUD ──────────────────────────────────────────────────────

  /**
   * Insert or replace a note. Also updates the FTS5 index manually.
   */
  upsertNote(note: UpsertNoteInput): void {
    const upsertStmt = this.db.prepare(`
      INSERT INTO notes (id, title, content, drawing, summary, topics, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        drawing = excluded.drawing,
        summary = excluded.summary,
        topics = excluded.topics,
        updated_at = datetime('now')
    `)

    const getRowid = this.db.prepare<[string], RowidRow>(
      `SELECT rowid FROM notes WHERE id = ?`
    )

    const deleteFts = this.db.prepare(
      `DELETE FROM notes_fts WHERE rowid = ?`
    )

    const insertFts = this.db.prepare(
      `INSERT INTO notes_fts(rowid, title, summary, content_text) VALUES (?, ?, ?, ?)`
    )

    const txn = this.db.transaction(() => {
      upsertStmt.run(
        note.id,
        note.title,
        note.content,
        note.drawing ?? null,
        note.summary ?? null,
        JSON.stringify(note.topics ?? [])
      )

      // Sync FTS: delete old entry if exists, then insert fresh
      const row = getRowid.get(note.id)
      if (row) {
        deleteFts.run(row.rowid)
        insertFts.run(row.rowid, note.title, note.summary ?? '', note.contentText)
      }
    })

    txn()
  }

  /**
   * Get a single note by ID.
   */
  getNote(id: string): NoteRow | undefined {
    return this.db
      .prepare<[string], NoteRow>(`SELECT * FROM notes WHERE id = ?`)
      .get(id)
  }

  /**
   * Delete a note. Removes FTS entry first, then the note row.
   * Cascade handles graph_edges cleanup.
   */
  deleteNote(id: string): void {
    const getRowid = this.db.prepare<[string], RowidRow>(
      `SELECT rowid FROM notes WHERE id = ?`
    )
    const deleteFts = this.db.prepare(
      `DELETE FROM notes_fts WHERE rowid = ?`
    )
    const deleteNote = this.db.prepare(
      `DELETE FROM notes WHERE id = ?`
    )

    const txn = this.db.transaction(() => {
      const row = getRowid.get(id)
      if (row) {
        deleteFts.run(row.rowid)
      }
      deleteNote.run(id)
    })

    txn()
  }

  /**
   * List all notes (lightweight: id, title, summary, updated_at).
   * Ordered by most recently updated first.
   */
  listNotes(): NoteListRow[] {
    return this.db
      .prepare<[], NoteListRow>(
        `SELECT id, title, summary, updated_at FROM notes ORDER BY updated_at DESC`
      )
      .all()
  }

  // ── FTS5 Search ─────────────────────────────────────────────────────

  /**
   * Full-text search using FTS5 with BM25 ranking and highlights.
   * Returns up to 20 results ordered by relevance.
   *
   * Supports prefix matching: typing "emp" will match "employee".
   * Each token is quoted and suffixed with '*' for safe FTS5 prefix queries.
   */
  searchNotes(query: string): SearchRow[] {
    if (!query.trim()) return []

    // Sanitize input: extract alphanumeric tokens, quote each, and add '*' for prefix matching
    const tokens = query
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
      .filter((t) => t.length > 0)

    if (tokens.length === 0) return []

    // Build FTS5 query: "emp"* "man"* → matches "employee management"
    const ftsQuery = tokens.map((t) => `"${t}"*`).join(' ')

    try {
      return this.db
        .prepare<[string], SearchRow>(
          `SELECT
             n.id,
             n.title,
             highlight(notes_fts, 0, '<mark>', '</mark>') AS title_highlight,
             highlight(notes_fts, 1, '<mark>', '</mark>') AS summary_highlight,
             n.summary,
             n.updated_at,
             bm25(notes_fts) AS rank
           FROM notes_fts
           JOIN notes n ON notes_fts.rowid = n.rowid
           WHERE notes_fts MATCH ?
           ORDER BY rank
           LIMIT 20`
        )
        .all(ftsQuery)
    } catch {
      // FTS5 MATCH can throw on malformed queries — return empty gracefully
      return []
    }
  }

  // ── Knowledge Graph ─────────────────────────────────────────────────

  /**
   * Replace all edges for a source note with new edges.
   * Wrapped in a transaction for atomicity.
   */
  upsertEdges(sourceId: string, targets: UpsertEdgeTarget[]): void {
    const deleteExisting = this.db.prepare(
      `DELETE FROM graph_edges WHERE source_id = ?`
    )
    const insertEdge = this.db.prepare(
      `INSERT OR IGNORE INTO graph_edges (source_id, target_id, relationship, weight) VALUES (?, ?, ?, ?)`
    )

    const txn = this.db.transaction(() => {
      deleteExisting.run(sourceId)
      for (const t of targets) {
        insertEdge.run(sourceId, t.targetId, t.relationship, t.weight)
      }
    })

    txn()
  }

  /**
   * Get full graph data: nodes (notes with connection counts) and links (edges).
   * Suitable for react-force-graph-2d.
   */
  getGraphData(): { nodes: GraphNodeRow[]; links: GraphEdgeRow[] } {
    const nodes = this.db
      .prepare<[], GraphNodeRow>(
        `SELECT n.id, n.title, COUNT(e.id) AS connections
         FROM notes n
         LEFT JOIN graph_edges e ON n.id = e.source_id OR n.id = e.target_id
         GROUP BY n.id`
      )
      .all()

    const links = this.db
      .prepare<[], GraphEdgeRow>(
        `SELECT source_id, target_id, relationship, weight FROM graph_edges`
      )
      .all()

    return { nodes, links }
  }

  // ── Transcriptions ──────────────────────────────────────────────────

  /**
   * Save a transcription record.
   */
  saveTranscription(record: SaveTranscriptionInput): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO transcriptions (id, note_id, audio_path, transcript, speakers)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(record.id, record.noteId, record.audioPath, record.transcript, record.speakers)
  }

  /**
   * Get all transcriptions linked to a specific note.
   */
  getTranscriptionsByNote(noteId: string): TranscriptionRow[] {
    return this.db
      .prepare<[string], TranscriptionRow>(
        `SELECT * FROM transcriptions WHERE note_id = ? ORDER BY created_at DESC`
      )
      .all(noteId)
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  /**
   * Close the database connection.
   */
  close(): void {
    this.db.close()
  }
}
