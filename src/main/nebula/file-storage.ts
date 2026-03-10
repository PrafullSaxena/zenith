/**
 * NoteFileStorage -- JSON file I/O for Nebula notes on disk.
 *
 * Notes are stored as `{storagePath}/notes/{id}.json` files, providing
 * human-readable, portable persistence alongside the SQLite index.
 *
 * This module runs ONLY in the main process.
 *
 * IMPORTANT: Does NOT import renderer types. The note shape is duplicated
 * locally to avoid cross-process imports.
 */

import fs from 'fs'
import path from 'path'

// ── Local note shape (duplicated from renderer types to avoid cross-process import) ──

interface NoteFileShape {
  id: string
  title: string
  content: object // Tiptap JSON document
  drawing: object | null // tldraw snapshot
  summary: string | null // AI-generated summary
  topics: string[] // AI-extracted topic keywords
  createdAt: string // ISO 8601 timestamp
  updatedAt: string // ISO 8601 timestamp
}

// ── Tiptap JSON types for plain text extraction ──────────────────────

interface TiptapNode {
  type?: string
  text?: string
  content?: TiptapNode[]
  [key: string]: unknown
}

// ── NoteFileStorage class ─────────────────────────────────────────────

export class NoteFileStorage {
  private notesDir: string
  private audioDir: string

  constructor(storagePath: string) {
    this.notesDir = path.join(storagePath, 'notes')
    this.audioDir = path.join(storagePath, 'audio')
    fs.mkdirSync(this.notesDir, { recursive: true })
    fs.mkdirSync(this.audioDir, { recursive: true })
  }

  /**
   * Write a note to disk as a pretty-printed JSON file.
   */
  writeNote(note: NoteFileShape): void {
    const filePath = path.join(this.notesDir, `${note.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(note, null, 2), 'utf-8')
  }

  /**
   * Read a note from disk by ID. Returns null if the file does not exist.
   */
  readNote(id: string): NoteFileShape | null {
    const filePath = path.join(this.notesDir, `${id}.json`)
    if (!fs.existsSync(filePath)) return null

    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw) as NoteFileShape
    } catch {
      // Corrupted or unreadable file -- treat as missing
      console.warn(`[NoteFileStorage] Failed to read note ${id}:`)
      return null
    }
  }

  /**
   * Delete a note file from disk. Silently ignores if the file does not exist.
   */
  deleteNote(id: string): void {
    const filePath = path.join(this.notesDir, `${id}.json`)
    try {
      fs.unlinkSync(filePath)
    } catch {
      // File doesn't exist or already deleted -- ignore
    }
  }

  /**
   * List all note IDs by scanning the notes directory for .json files.
   * Returns an array of IDs (filenames without extension).
   */
  listNoteFiles(): string[] {
    try {
      const files = fs.readdirSync(this.notesDir)
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.basename(f, '.json'))
    } catch {
      // Directory doesn't exist or unreadable
      return []
    }
  }

  // ── Audio file I/O ───────────────────────────────────────────────────

  /**
   * Save an audio buffer to disk as `{storagePath}/audio/{noteId}.webm`.
   * Creates the audio subdirectory if needed. Returns the file path.
   */
  saveAudio(noteId: string, audioBuffer: Buffer): string {
    fs.mkdirSync(this.audioDir, { recursive: true })
    const filePath = path.join(this.audioDir, `${noteId}.webm`)
    fs.writeFileSync(filePath, audioBuffer)
    return filePath
  }

  /**
   * Load an audio file from disk by note ID.
   * Returns null if the file does not exist.
   */
  loadAudio(noteId: string): Buffer | null {
    const filePath = path.join(this.audioDir, `${noteId}.webm`)
    if (!fs.existsSync(filePath)) return null
    try {
      return fs.readFileSync(filePath)
    } catch {
      console.warn(`[NoteFileStorage] Failed to read audio for note ${noteId}`)
      return null
    }
  }

  /**
   * Delete an audio file from disk. Silently ignores if the file does not exist.
   */
  deleteAudio(noteId: string): void {
    const filePath = path.join(this.audioDir, `${noteId}.webm`)
    try {
      fs.unlinkSync(filePath)
    } catch {
      // File doesn't exist or already deleted -- ignore
    }
  }

  // ── Plain text extraction ───────────────────────────────────────────

  /**
   * Recursively extract plain text from a Tiptap JSON document.
   *
   * Walks the `content` arrays and collects all `text` fields.
   * The resulting plain text is used for FTS5 indexing in SQLite.
   */
  extractPlainText(tiptapJson: object): string {
    const parts: string[] = []

    function walk(node: TiptapNode): void {
      if (node.text) {
        parts.push(node.text)
      }
      if (Array.isArray(node.content)) {
        for (const child of node.content) {
          walk(child)
        }
      }
    }

    walk(tiptapJson as TiptapNode)
    return parts.join(' ').trim()
  }
}
