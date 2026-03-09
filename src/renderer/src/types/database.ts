/**
 * Database types for the DbInspector plugin.
 * Connection strings are NEVER stored in the renderer — only in the main process credentials store.
 */

// ── Connection types ────────────────────────────────────────────────

export type ReadStrategy = 'read-only' | 'read-write'

/** Renderer-safe connection metadata (no password). */
export interface DbConnection {
  id: string
  name: string
  host: string
  port: number
  username: string
  database: string        // currently selected database
  defaultSchema: string
  readStrategy: ReadStrategy
}

/** Full connection config used by the main process (includes password). */
export interface DbConnectionConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string        // encrypted in credentials store, never sent to renderer
  database: string        // currently active database
  defaultSchema: string
  readStrategy: ReadStrategy
}

export interface ConnectionStatus {
  connectionId: string
  connected: boolean
  serverVersion?: string
  error?: string
}

export interface TestConnectionResult {
  success: boolean
  serverVersion?: string
  error?: string
}

// ── Schema browsing types ───────────────────────────────────────────

export interface TableInfo {
  name: string
  type: 'BASE TABLE' | 'VIEW'
  estimatedRows?: number
  totalSize?: string
}

export interface ColumnInfo {
  name: string
  dataType: string
  isNullable: boolean
  defaultValue: string | null
  ordinalPosition: number
  isPrimaryKey: boolean
  maxLength?: number
  precision?: number
}

export interface ForeignKey {
  constraintName: string
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
}

// ── Relationship inference types ──────────────────────────────────

/** How a relationship was discovered. */
export type RelationshipSource = 'fk' | 'convention' | 'ai'

/** Cardinality label for inferred relationships. */
export type Cardinality = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'

/** Relationship inference mode selector. */
export type RelationshipMode = 'fk-only' | 'convention' | 'ai'

/** Status of AI-powered relationship inference. */
export type ERInferenceStatus = 'idle' | 'inferring' | 'streaming' | 'complete' | 'error'

/** An inferred (non-FK) relationship between two tables. */
export interface InferredRelationship {
  source: RelationshipSource
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  cardinality: Cardinality
  confidence: number  // 0.0–1.0
  label: string       // human-readable, e.g. "user_id → users.id"
}

export interface IndexInfo {
  name: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
  indexType: string // btree, hash, gin, gist
}

export interface TableStats {
  estimatedRows: number
  totalSize: string
  indexSize: string
  lastVacuum: string | null
  lastAnalyze: string | null
}

// ── AI Q&A types ────────────────────────────────────────────────────

export type QASessionStatus = 'streaming' | 'complete' | 'error' | 'cancelled'

export interface DbQASession {
  sessionId: string
  connectionId: string
  schema: string
  status: QASessionStatus
  question: string
  rawText: string
  answer: string
  error?: string
  startedAt: string
}

// ── Query Optimizer types ───────────────────────────────────────────

export type OptimizerSessionStatus = 'analyzing' | 'streaming' | 'complete' | 'error' | 'cancelled'

export type OptimizationType =
  | 'missing-index'
  | 'query-rewrite'
  | 'anti-pattern'
  | 'statistics'
  | 'general'

export type OptimizationSeverity = 'high' | 'medium' | 'low'

export interface OptimizationSuggestion {
  type: OptimizationType
  severity: OptimizationSeverity
  title: string
  explanation: string
  suggestedSQL?: string
}

export interface QueryOptimizationSession {
  sessionId: string
  connectionId: string
  schema: string
  status: OptimizerSessionStatus
  originalQuery: string
  explainOutput: string
  rawText: string
  suggestions: OptimizationSuggestion[]
  summary: string
  insights: string[]
  tradeoffs: string[]
  mermaidDiagram: string
  optimizedQuery: string
  error?: string
  startedAt: string
}

export interface OptimizerTile {
  id: string
  originalQuery: string
  session: QueryOptimizationSession
  timestamp: string
}

// ── ER Diagram types ────────────────────────────────────────────────

/** Cached mermaid syntax for each relationship mode, generated once on button click. */
export interface ERDiagramModeCache {
  'fk-only': string
  convention: string
  ai: string | null // null = not yet generated (AI pending/skipped)
}

export interface ERDiagramSession {
  connectionId: string
  schema: string
  selectedTables: string[]
  mermaidSyntax: string
  generatedAt: string
  relationshipMode: RelationshipMode
  inferredRelationships: InferredRelationship[]
  modeCache: ERDiagramModeCache
  /** Convention-only inferred relationships (subset used in convention mode). */
  conventionRelationships: InferredRelationship[]
  /** Merged convention + AI relationships (used in AI mode). */
  aiRelationships: InferredRelationship[]
}

// ── History types ───────────────────────────────────────────────────

export type DbHistoryEntryType = 'qa' | 'optimize' | 'er-diagram'

export interface DbHistoryEntry {
  id: string
  type: DbHistoryEntryType
  connectionId: string
  connectionName: string
  schema: string
  timestamp: string
  // Q&A-specific
  question?: string
  answer?: string
  // Optimizer-specific
  originalQuery?: string
  explainOutput?: string
  suggestions?: OptimizationSuggestion[]
  summary?: string
  // ER Diagram-specific
  selectedTables?: string[]
  mermaidSyntax?: string
}

// ── Tab type ────────────────────────────────────────────────────────

export type DbInspectorTab = 'ask-ai' | 'query-optimizer' | 'er-diagram' | 'history'

// ── Query result types ──────────────────────────────────────────────

export interface QueryResult {
  rows: Record<string, unknown>[]
  fields: { name: string; dataTypeID: number }[]
  rowCount: number
  command: string
}
