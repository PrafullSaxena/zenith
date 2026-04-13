/**
 * Nebula plugin type definitions.
 *
 * Process-agnostic — no renderer-only or main-process-only imports.
 * Used by both the Zustand store and UI components.
 */

// ── Note types ──────────────────────────────────────────────────────

/**
 * Tag attached to a note for categorization.
 */
export type NoteTag = { id: string; label: string; color: string }

/**
 * Full note file shape — matches the JSON structure persisted on disk.
 */
export interface NoteFile {
  id: string
  title: string
  content: object // Tiptap JSON document
  drawing: object | null // excalidraw snapshot ({ type: 'excalidraw', elements, appState, files })
  summary: string | null // AI-generated summary
  topics: string[]
  tags: NoteTag[]
  createdAt: string
  updatedAt: string
}

/**
 * Lightweight note metadata for list display — avoids loading full content.
 */
export interface NoteListItem {
  id: string
  title: string
  summary: string | null
  pinned: boolean
  hasDrawing: boolean
  contentPreview: string | null
  audioPath: string | null
  updatedAt: string
}

// ── Layout / Toast types ────────────────────────────────────────────

/**
 * Panel layout sizes for the Nebula resizable panel layout.
 */
export type PanelLayout = {
  sidebarSize: number
  editorSize: number
  drawingCollapsed: boolean
}

/**
 * Toast notification message displayed temporarily in the UI.
 */
export type ToastMessage = {
  id: string
  message: string
  noteId?: string
  type: 'info' | 'success' | 'error' | 'warning'
}

// ── Knowledge graph types ───────────────────────────────────────────

/**
 * Graph node for react-force-graph-2d.
 */
export interface GraphNode {
  id: string
  name: string
  val: number // connection count — determines node size
}

/**
 * Graph edge for react-force-graph-2d.
 */
export interface GraphEdge {
  source: string
  target: string
  label: string
  weight: number
}

/**
 * Complete graph data structure for react-force-graph-2d.
 */
export interface GraphData {
  nodes: GraphNode[]
  links: GraphEdge[]
}

// ── Voice / transcription types ─────────────────────────────────────

/**
 * Single transcription segment with speaker label and timestamps.
 */
export interface TranscriptionSegment {
  speaker: string
  text: string
  start: number
  end: number
}

/**
 * Full diarized transcription result from OpenAI.
 */
export interface DiarizedTranscript {
  text: string
  segments: TranscriptionSegment[]
}

/**
 * Persisted transcription record.
 */
export interface TranscriptionRecord {
  id: string
  noteId: string | null
  audioPath: string
  transcript: string
  speakers: TranscriptionSegment[]
  createdAt: string
}

// ── Search types ────────────────────────────────────────────────────

/**
 * FTS5 search result with highlighted matches and BM25 ranking.
 */
export interface SearchResult {
  id: string
  title: string
  titleHighlight: string | null
  summaryHighlight: string | null
  summary: string | null
  contentText: string | null
  updatedAt: string
  rank: number
}

// ── AI summarization types ──────────────────────────────────────────

/**
 * Structured AI summarization output.
 */
export interface SummarizationResult {
  title: string
  summary: string
  topics: string[]
  connections: string[]
}

// ── UI state types ──────────────────────────────────────────────────

/**
 * Tab identifiers for the 3-tab Nebula layout.
 */
export type NebulaTab = 'notes' | 'search' | 'knowledge'

/**
 * Voice recording state machine.
 */
export type VoiceRecordingState = 'idle' | 'recording' | 'processing'
