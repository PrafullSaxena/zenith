/**
 * Zustand store for the DbInspector plugin.
 *
 * Manages database connections, schema browsing, AI Q&A sessions,
 * query optimization sessions, ER diagram generation, and history.
 *
 * Follows the same patterns as review-store.ts:
 *  - IPC calls via window.api.db.*
 *  - AI streaming via window.api.ai.startAnalysis + IPC event listeners
 *  - History persistence via window.api.settings.set/get
 *  - Activity logging via useActivityStore
 */

import { create } from 'zustand'
import type {
  DbConnection,
  ReadStrategy,
  ConnectionStatus,
  TableInfo,
  ColumnInfo,
  ForeignKey,
  IndexInfo,
  TableStats,
  DbQASession,
  QueryOptimizationSession,
  OptimizationSuggestion,
  OptimizerTile,
  ERDiagramSession,
  ERDiagramModeCache,
  DbHistoryEntry,
  DbInspectorTab,
  QueryResult,
  RelationshipMode,
  ERInferenceStatus,
  InferredRelationship,
  Cardinality,
  QueryTab,
  QueryExecution,
  QueryExecutionStatus,
  SavedQuery
} from '../types/database'
import {
  buildDbQASystemPrompt,
  buildQueryOptimizerSystemPrompt,
  buildRelationshipInferenceSystemPrompt
} from './db-prompts-renderer'
import { useTokenStore } from './token-store'
import {
  inferConventionRelationships,
  deduplicateRelationships,
  parseAIRelationshipOutput
} from '../plugins/db-inspector/relationship-inference'

// ── Constants ───────────────────────────────────────────────────────

const HISTORY_STORAGE_KEY = 'dbInspector.history'
const CONNECTIONS_STORAGE_KEY = 'plugins.db-inspector.connections'
const MAX_HISTORY_ENTRIES = 10

// ── Optimization output parser (structured section-based) ───────────

const OPTIMIZATION_RE =
  /^(missing-index|query-rewrite|anti-pattern|statistics|general)\|(high|medium|low)\|([^|]+)\|([^|]+?)(?:\|(.+))?$/i

const MAX_OPTIMIZER_TILES = 5

interface ParsedOptimizerOutput {
  insights: string[]
  mermaidDiagram: string
  tradeoffs: string[]
  suggestions: OptimizationSuggestion[]
  optimizedQuery: string
  summary: string
}

function parseOptimizerOutput(text: string): ParsedOptimizerOutput {
  const sections: Record<string, string> = {}
  const sectionPattern = /===\s*([\w]+)\s*===/g
  const matchList: { name: string; contentStart: number; headerStart: number }[] = []

  let m: RegExpExecArray | null
  while ((m = sectionPattern.exec(text)) !== null) {
    matchList.push({
      name: m[1].toUpperCase(),
      contentStart: m.index + m[0].length,
      headerStart: m.index
    })
  }

  // Use headerStart of next section as the end boundary (not lastIndexOf)
  for (let i = 0; i < matchList.length; i++) {
    const end =
      i + 1 < matchList.length ? matchList[i + 1].headerStart : text.length
    sections[matchList[i].name] = text.slice(matchList[i].contentStart, end).trim()
  }

  // --- Parse structured sections ---

  // Insights (bullet list)
  const insights = parseBulletList(sections.INSIGHTS ?? '')

  // Tradeoffs (bullet list)
  const tradeoffs = parseBulletList(sections.TRADEOFFS ?? '')

  // Mermaid diagram — strip code fences if present
  let mermaidDiagram = (sections.MERMAID ?? '').replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')

  // Optimized query — strip code fences if present
  let optimizedQuery = (sections.OPTIMIZED_QUERY ?? '').replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')

  // Summary
  const summary = sections.SUMMARY ?? ''

  // Suggestions (pipe-delimited)
  const suggestions = parseSuggestions(sections.SUGGESTIONS ?? '')

  // --- Fallback: if no sections found, try old pipe-delimited format ---
  if (matchList.length === 0) {
    const fallback = parseFallbackFormat(text)
    return fallback
  }

  // If no suggestions found in sections, also try parsing entire text as fallback
  if (suggestions.length === 0) {
    const fallbackSuggestions = parseSuggestions(text)
    if (fallbackSuggestions.length > 0) {
      return { insights, mermaidDiagram, tradeoffs, suggestions: fallbackSuggestions, optimizedQuery, summary }
    }
  }

  return { insights, mermaidDiagram, tradeoffs, suggestions, optimizedQuery, summary }
}

function parseBulletList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

function parseSuggestions(text: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = OPTIMIZATION_RE.exec(trimmed)
    if (match) {
      suggestions.push({
        type: match[1].toLowerCase() as OptimizationSuggestion['type'],
        severity: match[2].toLowerCase() as OptimizationSuggestion['severity'],
        title: match[3].trim(),
        explanation: match[4].trim(),
        suggestedSQL: match[5]?.trim() || undefined
      })
    }
  }
  return suggestions
}

/** Fallback parser for old pipe-delimited format (no section delimiters). */
function parseFallbackFormat(text: string): ParsedOptimizerOutput {
  const lines = text.split('\n')
  const suggestions: OptimizationSuggestion[] = []
  let summary = ''
  let pastSeparator = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed === '---') {
      pastSeparator = true
      continue
    }

    if (pastSeparator) {
      summary += (summary ? ' ' : '') + trimmed
      continue
    }

    const match = OPTIMIZATION_RE.exec(trimmed)
    if (match) {
      suggestions.push({
        type: match[1].toLowerCase() as OptimizationSuggestion['type'],
        severity: match[2].toLowerCase() as OptimizationSuggestion['severity'],
        title: match[3].trim(),
        explanation: match[4].trim(),
        suggestedSQL: match[5]?.trim() || undefined
      })
    }
  }

  return {
    insights: [],
    mermaidDiagram: '',
    tradeoffs: [],
    suggestions,
    optimizedQuery: '',
    summary
  }
}

// ── Store interface ─────────────────────────────────────────────────

interface DbStoreState {
  // Connection management
  connections: DbConnection[]
  activeConnectionId: string | null
  activeDatabase: string | null
  activeSchema: string | null
  connectionStatuses: Record<string, ConnectionStatus>
  isTestingConnection: boolean
  testResult: { success: boolean; serverVersion?: string; error?: string } | null

  // Database & Schema browsing
  databases: string[]
  isLoadingDatabases: boolean
  schemas: string[]
  tables: TableInfo[]
  columns: ColumnInfo[]
  foreignKeys: ForeignKey[]
  indexes: IndexInfo[]
  tableStats: TableStats | null
  isLoadingSchemas: boolean
  isLoadingTables: boolean
  isLoadingDetails: boolean
  selectedTable: string | null

  // AI Q&A
  qaSession: DbQASession | null
  /** Recent Ask AI questions (persisted, max 10) */
  qaQuestionHistory: string[]

  // Query Optimizer
  optimizerSession: QueryOptimizationSession | null
  optimizerTiles: OptimizerTile[]

  // ER Diagram
  erSession: ERDiagramSession | null
  selectedTablesForER: string[]
  erRelationshipMode: RelationshipMode
  erInferenceStatus: ERInferenceStatus
  erInferredRelationships: InferredRelationship[]
  erInferenceError: string | null

  // History
  history: DbHistoryEntry[]
  isLoadingHistory: boolean

  // Active tab
  activeTab: DbInspectorTab

  // Query console
  queryTabs: QueryTab[]
  activeQueryTabId: string | null
  savedQueries: SavedQuery[]
  /** Keyed by `connectionId:schema`, value is tableName → columns[]. Used for CodeMirror autocomplete. */
  columnsCache: Record<string, Record<string, { name: string; dataType: string }[]>>
  isLoadingAllColumns: boolean

  // ── Connection actions ──────────────────────────────────────────

  loadConnections: () => Promise<void>
  addConnection: (params: {
    name: string
    host: string
    port: number
    username: string
    password: string
    readStrategy: ReadStrategy
  }) => Promise<void>
  removeConnection: (id: string) => Promise<void>
  testConnection: (params: {
    host: string
    port: number
    username: string
    password: string
  }) => Promise<void>
  connectToDb: (connectionId: string) => Promise<void>
  disconnectDb: (connectionId: string) => Promise<void>
  setActiveConnection: (id: string | null) => void
  setActiveDatabase: (database: string) => Promise<void>
  setActiveSchema: (schema: string | null) => Promise<void>

  // ── Schema browsing actions ─────────────────────────────────────

  loadDatabases: () => Promise<void>
  loadSchemas: () => Promise<void>
  loadTables: () => Promise<void>
  loadTableDetails: (table: string) => Promise<void>
  setSelectedTable: (table: string | null) => void

  // ── AI Q&A actions ──────────────────────────────────────────────

  startQA: (
    question: string,
    providerId: string,
    modelName: string,
    command?: string
  ) => Promise<void>
  cancelQA: () => void
  loadQAHistory: () => Promise<void>
  clearQAHistory: () => Promise<void>

  // ── Query Optimizer actions ─────────────────────────────────────

  startOptimization: (
    sql: string,
    providerId: string,
    modelName: string,
    command?: string
  ) => Promise<void>
  cancelOptimization: () => void

  // ── ER Diagram actions ──────────────────────────────────────────

  setSelectedTablesForER: (tables: string[]) => void
  toggleTableForER: (table: string) => void
  generateERDiagram: () => Promise<void>
  switchERMode: (mode: RelationshipMode) => void
  generateAllERModes: (
    providerId?: string,
    modelName?: string,
    command?: string
  ) => Promise<void>
  cancelERInference: () => void

  // ── History actions ─────────────────────────────────────────────

  loadHistory: () => Promise<void>
  addHistoryEntry: (entry: Omit<DbHistoryEntry, 'id' | 'timestamp'>) => Promise<void>
  restoreFromHistory: (entry: DbHistoryEntry) => void

  // ── Tab actions ─────────────────────────────────────────────────

  setActiveTab: (tab: DbInspectorTab) => void

  // ── Query console actions ────────────────────────────────────────

  loadQueryTabs: (connectionId: string) => Promise<void>
  saveQueryTabs: () => Promise<void>
  addQueryTab: () => void
  closeQueryTab: (tabId: string) => void
  setActiveQueryTab: (tabId: string) => void
  updateQueryTabSql: (tabId: string, sql: string) => void
  toggleWriteMode: (tabId: string) => void
  toggleOutputMode: (tabId: string) => void
  renameQueryTab: (tabId: string, label: string) => void
  executeQuery: (tabId: string, sql: string) => Promise<void>
  loadMoreRows: (tabId: string, offset: number) => Promise<void>
  cancelQuery: (tabId: string) => Promise<void>
  loadAllColumnsForAutocomplete: () => Promise<void>
  loadSavedQueries: () => Promise<void>
  saveQuery: (name: string, sql: string) => Promise<void>
  deleteSavedQuery: (id: string) => Promise<void>
}

// ── Store creation ──────────────────────────────────────────────────

export const useDbStore = create<DbStoreState>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────

  connections: [],
  activeConnectionId: null,
  activeDatabase: null,
  activeSchema: null,
  connectionStatuses: {},
  isTestingConnection: false,
  testResult: null,

  databases: [],
  isLoadingDatabases: false,
  schemas: [],
  tables: [],
  columns: [],
  foreignKeys: [],
  indexes: [],
  tableStats: null,
  isLoadingSchemas: false,
  isLoadingTables: false,
  isLoadingDetails: false,
  selectedTable: null,

  qaSession: null,
  qaQuestionHistory: [],
  optimizerSession: null,
  optimizerTiles: [],
  erSession: null,
  selectedTablesForER: [],
  erRelationshipMode: 'fk-only' as RelationshipMode,
  erInferenceStatus: 'idle' as ERInferenceStatus,
  erInferredRelationships: [],
  erInferenceError: null,

  history: [],
  isLoadingHistory: false,

  activeTab: 'query-console',

  queryTabs: [],
  activeQueryTabId: null,
  savedQueries: [],
  columnsCache: {},
  isLoadingAllColumns: false,

  // ── Connection actions ──────────────────────────────────────────

  loadConnections: async () => {
    try {
      const raw = await window.api.settings.get(CONNECTIONS_STORAGE_KEY)
      const connections = Array.isArray(raw) ? (raw as DbConnection[]) : []
      set({ connections })
    } catch {
      set({ connections: [] })
    }
  },

  addConnection: async ({ name, host, port, username, password, readStrategy }) => {
    const id = `conn-${Date.now()}`
    const conn: DbConnection = {
      id,
      name,
      host,
      port,
      username,
      database: 'postgres',      // default database until user selects one
      defaultSchema: 'public',   // default schema until user selects one
      readStrategy
    }

    // Store password securely in main process (encrypted via safeStorage)
    await window.api.db.storeCredentials(id, password)

    const updated = [...get().connections, conn]
    set({ connections: updated })
    await window.api.settings.set(CONNECTIONS_STORAGE_KEY, updated)
  },

  removeConnection: async (id) => {
    // Disconnect if active
    if (get().connectionStatuses[id]?.connected) {
      await window.api.db.disconnect(id)
    }
    const updated = get().connections.filter((c) => c.id !== id)
    const statuses = { ...get().connectionStatuses }
    delete statuses[id]

    const newState: Partial<DbStoreState> = {
      connections: updated,
      connectionStatuses: statuses
    }

    // Clear active selection if removing active connection
    if (get().activeConnectionId === id) {
      newState.activeConnectionId = null
      newState.activeDatabase = null
      newState.activeSchema = null
      newState.databases = []
      newState.schemas = []
      newState.tables = []
    }

    set(newState as DbStoreState)
    await window.api.settings.set(CONNECTIONS_STORAGE_KEY, updated)
  },

  testConnection: async (params) => {
    set({ isTestingConnection: true, testResult: null })
    try {
      const result = await window.api.db.testConnection(params)
      set({ isTestingConnection: false, testResult: result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed'
      set({
        isTestingConnection: false,
        testResult: { success: false, error: message }
      })
    }
  },

  connectToDb: async (connectionId) => {
    const conn = get().connections.find((c) => c.id === connectionId)
    if (!conn) throw new Error('Connection not found')

    set({
      connectionStatuses: {
        ...get().connectionStatuses,
        [connectionId]: { connectionId, connected: false }
      }
    })

    try {
      // Retrieve encrypted password from main process
      const password = await window.api.db.getCredentials(connectionId)
      if (!password) throw new Error('Credentials not found — re-add connection')

      await window.api.db.connect(
        connectionId,
        conn.name,
        conn.host,
        conn.port,
        conn.username,
        password,
        conn.database,
        conn.defaultSchema,
        conn.readStrategy
      )

      set({
        connectionStatuses: {
          ...get().connectionStatuses,
          [connectionId]: { connectionId, connected: true }
        },
        activeConnectionId: connectionId,
        activeDatabase: conn.database,
        activeSchema: conn.defaultSchema || null,
        // Reset browsing state for clean start
        schemas: [],
        tables: [],
        selectedTable: null,
        columns: [],
        foreignKeys: [],
        indexes: [],
        tableStats: null
      })

      // Auto-load databases, then schemas (which auto-selects schema + loads tables)
      await get().loadDatabases()
      await get().loadSchemas()

      // Load query tabs for this connection
      await get().loadQueryTabs(connectionId)
      // Load columns for autocomplete (non-blocking)
      get().loadAllColumnsForAutocomplete().catch(() => {/* non-critical */})
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      set({
        connectionStatuses: {
          ...get().connectionStatuses,
          [connectionId]: { connectionId, connected: false, error: message }
        }
      })
    }
  },

  disconnectDb: async (connectionId) => {
    try {
      await window.api.db.disconnect(connectionId)
    } catch { /* ignore */ }

    const statuses = { ...get().connectionStatuses }
    statuses[connectionId] = { connectionId, connected: false }

    const newState: Partial<DbStoreState> = { connectionStatuses: statuses }
    if (get().activeConnectionId === connectionId) {
      newState.activeConnectionId = null
      newState.activeDatabase = null
      newState.activeSchema = null
      newState.databases = []
      newState.schemas = []
      newState.tables = []
    }

    set(newState as DbStoreState)
  },

  setActiveConnection: (id) => {
    const conn = id ? get().connections.find((c) => c.id === id) : null
    set({
      activeConnectionId: id,
      activeDatabase: conn?.database || null,
      activeSchema: conn?.defaultSchema || null,
      databases: [],
      schemas: [],
      tables: [],
      selectedTable: null,
      columns: [],
      foreignKeys: [],
      indexes: [],
      tableStats: null
    })
    // Load query tabs for the newly selected connection
    if (id) {
      get().loadQueryTabs(id).catch(() => {/* non-critical */})
    }
  },

  setActiveDatabase: async (database) => {
    const { activeConnectionId } = get()
    if (!activeConnectionId) return

    try {
      // Switch the underlying PostgreSQL connection to the new database
      await window.api.db.switchDatabase(activeConnectionId, database)

      // Update the connection metadata
      const updated = get().connections.map((c) =>
        c.id === activeConnectionId ? { ...c, database } : c
      )
      set({
        connections: updated,
        activeDatabase: database,
        activeSchema: null,
        schemas: [],
        tables: [],
        selectedTable: null,
        columns: [],
        foreignKeys: [],
        indexes: [],
        tableStats: null
      })
      await window.api.settings.set(CONNECTIONS_STORAGE_KEY, updated)

      // Reload schemas for the new database
      await get().loadSchemas()
    } catch (err) {
      console.error('[db-store] Failed to switch database:', err)
    }
  },

  setActiveSchema: async (schema) => {
    set({
      activeSchema: schema,
      tables: [],
      selectedTable: null,
      columns: [],
      foreignKeys: [],
      indexes: [],
      tableStats: null
    })
    if (schema) {
      await get().loadTables()
    }
  },

  // ── Schema browsing actions ─────────────────────────────────────

  loadDatabases: async () => {
    const { activeConnectionId } = get()
    if (!activeConnectionId) return

    set({ isLoadingDatabases: true })
    try {
      const databases = await window.api.db.getDatabases(activeConnectionId)
      set({ databases, isLoadingDatabases: false })
    } catch {
      set({ databases: [], isLoadingDatabases: false })
    }
  },

  loadSchemas: async () => {
    const { activeConnectionId } = get()
    if (!activeConnectionId) return

    set({ isLoadingSchemas: true })
    try {
      const schemas = await window.api.db.getSchemas(activeConnectionId)
      set({ schemas, isLoadingSchemas: false })

      // Auto-select the best schema if none is active (or current doesn't exist)
      const current = get().activeSchema
      if (!current || !schemas.includes(current)) {
        const pick = schemas.includes('public') ? 'public' : schemas[0] ?? null
        if (pick) {
          set({ activeSchema: pick, tables: [], selectedTable: null })
          // Cascade: load tables for the auto-selected schema
          await get().loadTables()
        }
      } else {
        // Schema already selected — ensure tables are loaded
        await get().loadTables()
      }
    } catch {
      set({ schemas: [], isLoadingSchemas: false })
    }
  },

  loadTables: async () => {
    const { activeConnectionId, activeSchema } = get()
    if (!activeConnectionId || !activeSchema) return

    set({ isLoadingTables: true })
    try {
      const tables = await window.api.db.getTables(activeConnectionId, activeSchema)
      set({ tables, isLoadingTables: false })
      // Cascade: load all columns for autocomplete after schema is loaded
      get().loadAllColumnsForAutocomplete().catch(() => {/* non-critical */})
    } catch {
      set({ tables: [], isLoadingTables: false })
    }
  },

  loadTableDetails: async (table) => {
    const { activeConnectionId, activeSchema } = get()
    if (!activeConnectionId || !activeSchema) return

    set({ isLoadingDetails: true, selectedTable: table })
    try {
      const [columns, indexes, tableStats] = await Promise.all([
        window.api.db.getColumns(activeConnectionId, activeSchema, table),
        window.api.db.getIndexes(activeConnectionId, activeSchema, table),
        window.api.db.getTableStats(activeConnectionId, activeSchema, table)
      ])
      const foreignKeys = await window.api.db.getForeignKeys(activeConnectionId, activeSchema)
      set({
        columns,
        indexes,
        tableStats,
        foreignKeys: foreignKeys.filter((fk) => fk.sourceTable === table || fk.targetTable === table),
        isLoadingDetails: false
      })
    } catch {
      set({ columns: [], indexes: [], tableStats: null, foreignKeys: [], isLoadingDetails: false })
    }
  },

  setSelectedTable: (table) => set({ selectedTable: table }),

  // ── AI Q&A actions ──────────────────────────────────────────────

  startQA: async (question, providerId, modelName, command) => {
    const { activeConnectionId, activeSchema } = get()
    if (!activeConnectionId || !activeSchema) return

    // Persist question to history (max 10, deduplicated, newest first)
    const rawQ = question.includes('---\nNew follow-up question:')
      ? question.split('---\nNew follow-up question:').pop()!.trim()
      : question.trim()
    if (rawQ) {
      const prev = get().qaQuestionHistory.filter((q) => q !== rawQ)
      const updated = [rawQ, ...prev].slice(0, 10)
      set({ qaQuestionHistory: updated })
      window.api.settings.set('db.qaQuestionHistory', updated)
    }

    const sessionId = `qa-${Date.now()}`
    const session: DbQASession = {
      sessionId,
      connectionId: activeConnectionId,
      schema: activeSchema,
      status: 'streaming',
      question,
      rawText: '',
      answer: '',
      startedAt: new Date().toISOString()
    }
    set({ qaSession: session })

    try {
      // Build schema context
      const schemaContext = await window.api.db.buildSchemaContext(activeConnectionId, activeSchema)
      const systemPrompt = buildDbQASystemPrompt(schemaContext)

      // Set up streaming listeners
      window.api.ai.onStreamChunk((data) => {
        const current = get().qaSession
        if (!current || current.sessionId !== data.sessionId) return
        const rawText = current.rawText + data.chunk
        set({ qaSession: { ...current, rawText, answer: rawText } })
      })

      window.api.ai.onStreamDone((data) => {
        const current = get().qaSession
        if (!current || current.sessionId !== data.sessionId) return
        set({ qaSession: { ...current, status: 'complete', answer: current.rawText } })

        // Capture token usage (fallback: estimate from rawText when main process doesn't send usage)
        const tokensUsed = data.usage
          ? data.usage.totalTokens
          : Math.max(1, Math.ceil(current.rawText.length / 4))
        const isEstimated = data.usage ? data.usage.isEstimated : true
        useTokenStore.getState().addEntry({
          sessionId: data.sessionId,
          providerId,
          providerName: modelName,
          tokensUsed,
          isEstimated
        })

        window.api.ai.removeStreamListeners()
      })

      window.api.ai.onStreamError((data) => {
        const current = get().qaSession
        if (!current || current.sessionId !== data.sessionId) return
        set({ qaSession: { ...current, status: 'error', error: data.error } })
        window.api.ai.removeStreamListeners()
      })

      // Start AI analysis
      await window.api.ai.startAnalysis(providerId, modelName, systemPrompt, question, sessionId, command)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Q&A'
      set({ qaSession: { ...session, status: 'error', error: message } })
    }
  },

  cancelQA: () => {
    const current = get().qaSession
    if (current && current.status === 'streaming') {
      window.api.ai.cancelAnalysis(current.sessionId)
      set({ qaSession: { ...current, status: 'cancelled' } })
      window.api.ai.removeStreamListeners()
    }
  },

  loadQAHistory: async () => {
    try {
      const raw = await window.api.settings.get('db.qaQuestionHistory')
      const history = Array.isArray(raw) ? (raw as string[]).slice(0, 10) : []
      set({ qaQuestionHistory: history })
    } catch {
      set({ qaQuestionHistory: [] })
    }
  },

  clearQAHistory: async () => {
    set({ qaQuestionHistory: [] })
    await window.api.settings.set('db.qaQuestionHistory', [])
  },

  // ── Query Optimizer actions ─────────────────────────────────────

  startOptimization: async (sql, providerId, modelName, command) => {
    const { activeConnectionId, activeSchema } = get()
    if (!activeConnectionId || !activeSchema) return

    const sessionId = `opt-${Date.now()}`
    const session: QueryOptimizationSession = {
      sessionId,
      connectionId: activeConnectionId,
      schema: activeSchema,
      status: 'analyzing',
      originalQuery: sql,
      explainOutput: '',
      rawText: '',
      suggestions: [],
      summary: '',
      insights: [],
      tradeoffs: [],
      mermaidDiagram: '',
      optimizedQuery: '',
      startedAt: new Date().toISOString()
    }
    set({ optimizerSession: session })

    try {
      // Build optimization context (includes EXPLAIN ANALYZE)
      const optimizationContext = await window.api.db.buildOptimizationContext(
        activeConnectionId,
        activeSchema,
        sql
      )

      // Extract EXPLAIN output for display
      const explainMatch = optimizationContext.match(
        /== EXPLAIN ANALYZE OUTPUT ==\n([\s\S]*?)\n\n==/
      )
      const explainOutput = explainMatch?.[1] ?? ''

      const systemPrompt = buildQueryOptimizerSystemPrompt(optimizationContext)

      set({
        optimizerSession: { ...get().optimizerSession!, status: 'streaming', explainOutput }
      })

      // Set up streaming listeners
      window.api.ai.onStreamChunk((data) => {
        const current = get().optimizerSession
        if (!current || current.sessionId !== data.sessionId) return
        set({ optimizerSession: { ...current, rawText: current.rawText + data.chunk } })
      })

      window.api.ai.onStreamDone((data) => {
        const current = get().optimizerSession
        if (!current || current.sessionId !== data.sessionId) return
        const parsed = parseOptimizerOutput(current.rawText)
        const completed: QueryOptimizationSession = {
          ...current,
          status: 'complete',
          suggestions: parsed.suggestions,
          summary: parsed.summary,
          insights: parsed.insights,
          tradeoffs: parsed.tradeoffs,
          mermaidDiagram: parsed.mermaidDiagram,
          optimizedQuery: parsed.optimizedQuery
        }
        // Push to tiles history (max 5, newest first)
        const tile: OptimizerTile = {
          id: current.sessionId,
          originalQuery: current.originalQuery,
          session: completed,
          timestamp: new Date().toISOString()
        }
        const tiles = [tile, ...get().optimizerTiles].slice(0, MAX_OPTIMIZER_TILES)
        set({ optimizerSession: completed, optimizerTiles: tiles })

        // Capture token usage (fallback: estimate from rawText when main process doesn't send usage)
        const tokensUsed = data.usage
          ? data.usage.totalTokens
          : Math.max(1, Math.ceil(current.rawText.length / 4))
        const isEstimated = data.usage ? data.usage.isEstimated : true
        useTokenStore.getState().addEntry({
          sessionId: data.sessionId,
          providerId,
          providerName: modelName,
          tokensUsed,
          isEstimated
        })

        window.api.ai.removeStreamListeners()
      })

      window.api.ai.onStreamError((data) => {
        const current = get().optimizerSession
        if (!current || current.sessionId !== data.sessionId) return
        set({ optimizerSession: { ...current, status: 'error', error: data.error } })
        window.api.ai.removeStreamListeners()
      })

      await window.api.ai.startAnalysis(
        providerId,
        modelName,
        systemPrompt,
        `Analyze this query:\n${sql}`,
        sessionId,
        command
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start optimization'
      set({ optimizerSession: { ...session, status: 'error', error: message } })
    }
  },

  cancelOptimization: () => {
    const current = get().optimizerSession
    if (current && (current.status === 'streaming' || current.status === 'analyzing')) {
      window.api.ai.cancelAnalysis(current.sessionId)
      set({ optimizerSession: { ...current, status: 'cancelled' } })
      window.api.ai.removeStreamListeners()
    }
  },

  // ── ER Diagram actions ──────────────────────────────────────────

  setSelectedTablesForER: (tables) => set({ selectedTablesForER: tables }),

  toggleTableForER: (table) => {
    const current = get().selectedTablesForER
    if (current.includes(table)) {
      set({ selectedTablesForER: current.filter((t) => t !== table) })
    } else {
      set({ selectedTablesForER: [...current, table] })
    }
  },

  generateERDiagram: async () => {
    const { activeConnectionId, activeSchema, selectedTablesForER } = get()
    if (!activeConnectionId || !activeSchema || selectedTablesForER.length === 0) return

    try {
      const tableData: { name: string; columns: ColumnInfo[] }[] = []
      for (const tableName of selectedTablesForER) {
        const cols = await window.api.db.getColumns(activeConnectionId, activeSchema, tableName)
        tableData.push({ name: tableName, columns: cols })
      }
      const allFks = await window.api.db.getForeignKeys(activeConnectionId, activeSchema)
      const mermaidSyntax = generateMermaidERD(tableData, allFks, selectedTablesForER)

      set({
        erSession: {
          connectionId: activeConnectionId,
          schema: activeSchema,
          selectedTables: selectedTablesForER,
          mermaidSyntax,
          generatedAt: new Date().toISOString(),
          relationshipMode: 'fk-only',
          inferredRelationships: [],
          modeCache: { 'fk-only': mermaidSyntax, convention: '', ai: null },
          conventionRelationships: [],
          aiRelationships: []
        }
      })
    } catch (err) {
      console.error('[db-store] ER diagram generation failed:', err)
    }
  },

  /** Switch the active mode from cache — no regeneration needed. */
  switchERMode: (mode) => {
    const { erSession } = get()
    if (!erSession) {
      set({ erRelationshipMode: mode })
      return
    }
    const cached = erSession.modeCache[mode]
    // Pick the right inferred relationships for display
    const inferred = mode === 'ai'
      ? erSession.aiRelationships
      : mode === 'convention'
        ? erSession.conventionRelationships
        : []

    set({
      erRelationshipMode: mode,
      erInferredRelationships: inferred,
      erSession: {
        ...erSession,
        mermaidSyntax: cached ?? erSession.modeCache.convention,
        relationshipMode: mode,
        inferredRelationships: inferred
      }
    })
  },

  /**
   * Generate all 3 ERD modes in one call:
   *  1. FK Only (instant)
   *  2. Convention (instant — shared columns + naming patterns)
   *  3. AI Inferred (streaming — only if agent available)
   * Results are cached so switching modes is instant.
   */
  generateAllERModes: async (providerId, modelName, command) => {
    const { activeConnectionId, activeSchema, selectedTablesForER, erRelationshipMode } = get()
    if (!activeConnectionId || !activeSchema || selectedTablesForER.length === 0) return

    set({ erInferenceError: null, erInferenceStatus: 'idle' })

    try {
      // Step 1: Fetch columns + real FKs
      const tableData: { name: string; columns: ColumnInfo[] }[] = []
      for (const tableName of selectedTablesForER) {
        const cols = await window.api.db.getColumns(activeConnectionId, activeSchema, tableName)
        tableData.push({ name: tableName, columns: cols })
      }
      const allFks = await window.api.db.getForeignKeys(activeConnectionId, activeSchema)

      // Step 2: Generate FK-only ERD (instant)
      const fkOnlySyntax = generateMermaidERD(tableData, allFks, selectedTablesForER)

      // Step 3: Generate Convention ERD (instant — includes shared column matching)
      const conventionInferred = inferConventionRelationships(tableData, selectedTablesForER)
      const conventionDeduped = deduplicateRelationships(allFks, conventionInferred)
      const conventionSyntax = generateMermaidERDWithInferred(
        tableData, allFks, conventionDeduped, selectedTablesForER
      )

      // Build initial cache
      const modeCache: ERDiagramModeCache = {
        'fk-only': fkOnlySyntax,
        convention: conventionSyntax,
        ai: null
      }

      // Determine which syntax to show based on current mode
      const activeMode = erRelationshipMode
      const activeSyntax = activeMode === 'convention'
        ? conventionSyntax
        : activeMode === 'ai'
          ? conventionSyntax // show convention while AI loads
          : fkOnlySyntax
      const activeInferred = activeMode === 'fk-only' ? [] : conventionDeduped

      const now = new Date().toISOString()
      set({
        erInferredRelationships: activeInferred,
        erSession: {
          connectionId: activeConnectionId,
          schema: activeSchema,
          selectedTables: selectedTablesForER,
          mermaidSyntax: activeSyntax,
          generatedAt: now,
          relationshipMode: activeMode,
          inferredRelationships: activeInferred,
          modeCache,
          conventionRelationships: conventionDeduped,
          aiRelationships: []
        }
      })

      // Step 4: Run AI inference if agent is configured (async, non-blocking for UI)
      if (providerId && modelName) {
        set({ erInferenceStatus: 'inferring' })
        const sessionId = `er-infer-${Date.now()}`
        set({ erInferenceStatus: 'streaming' })

        const schemaContext = await window.api.db.buildSchemaContext(
          activeConnectionId, activeSchema, selectedTablesForER
        )
        const systemPrompt = buildRelationshipInferenceSystemPrompt(schemaContext)
        const userPrompt = `Analyze these ${selectedTablesForER.length} tables and find ALL implicit foreign key relationships: ${selectedTablesForER.join(', ')}

For each table, examine every non-PK column and check if it could reference a PK or unique column in any other table. Consider column names, data types, and domain semantics. Be thorough — output every plausible relationship.`

        let rawText = ''

        await new Promise<void>((resolve, reject) => {
          window.api.ai.onStreamChunk((data) => {
            if (data.sessionId !== sessionId) return
            rawText += data.chunk
          })

          window.api.ai.onStreamDone((data) => {
            if (data.sessionId !== sessionId) return
            const aiInferred = parseAIRelationshipOutput(rawText)
            const merged = deduplicateRelationships(allFks, [...conventionDeduped, ...aiInferred])

            const tokensUsed = data.usage
              ? data.usage.totalTokens
              : Math.max(1, Math.ceil(rawText.length / 4))
            useTokenStore.getState().addEntry({
              sessionId,
              providerId,
              providerName: modelName,
              tokensUsed,
              isEstimated: !data.usage
            })

            const aiSyntax = generateMermaidERDWithInferred(
              tableData, allFks, merged, selectedTablesForER
            )

            // Update cache with AI results
            const currentSession = get().erSession
            const currentMode = get().erRelationshipMode
            const updatedCache: ERDiagramModeCache = {
              ...currentSession!.modeCache,
              ai: aiSyntax
            }

            // If user is currently viewing AI mode, show the new AI results
            const showAi = currentMode === 'ai'
            set({
              erInferenceStatus: 'complete',
              erInferredRelationships: showAi ? merged : get().erInferredRelationships,
              erSession: {
                ...currentSession!,
                mermaidSyntax: showAi ? aiSyntax : currentSession!.mermaidSyntax,
                relationshipMode: currentMode,
                inferredRelationships: showAi ? merged : currentSession!.inferredRelationships,
                modeCache: updatedCache,
                aiRelationships: merged
              }
            })
            window.api.ai.removeStreamListeners()
            resolve()
          })

          window.api.ai.onStreamError((data) => {
            if (data.sessionId !== sessionId) return
            set({ erInferenceStatus: 'error', erInferenceError: data.error })
            window.api.ai.removeStreamListeners()
            reject(new Error(data.error))
          })

          window.api.ai.startAnalysis(providerId, modelName, systemPrompt, userPrompt, sessionId, command)
        })
      }
    } catch (err) {
      console.error('[db-store] ER diagram generation failed:', err)
      set({
        erInferenceStatus: 'error',
        erInferenceError: err instanceof Error ? err.message : 'Generation failed'
      })
    }
  },

  cancelERInference: () => {
    set({ erInferenceStatus: 'idle' })
    window.api.ai.removeStreamListeners()
  },

  // ── History actions ─────────────────────────────────────────────

  loadHistory: async () => {
    set({ isLoadingHistory: true })
    try {
      const raw = await window.api.settings.get(HISTORY_STORAGE_KEY)
      const all = Array.isArray(raw) ? (raw as DbHistoryEntry[]) : []
      const history = all.slice(0, MAX_HISTORY_ENTRIES)
      if (history.length < all.length) {
        await window.api.settings.set(HISTORY_STORAGE_KEY, history)
      }
      set({ history, isLoadingHistory: false })
    } catch {
      set({ history: [], isLoadingHistory: false })
    }
  },

  addHistoryEntry: async (entry) => {
    const id = `db-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const timestamp = new Date().toISOString()
    const newEntry: DbHistoryEntry = { ...entry, id, timestamp }
    const updated = [newEntry, ...get().history].slice(0, MAX_HISTORY_ENTRIES)
    set({ history: updated })
    await window.api.settings.set(HISTORY_STORAGE_KEY, updated)
  },

  restoreFromHistory: (entry) => {
    switch (entry.type) {
      case 'qa':
        set({
          qaSession: {
            sessionId: `qa-restored-${Date.now()}`,
            connectionId: entry.connectionId,
            schema: entry.schema,
            status: 'complete',
            question: entry.question ?? '',
            rawText: entry.answer ?? '',
            answer: entry.answer ?? '',
            startedAt: entry.timestamp
          },
          activeTab: 'ask-ai'
        })
        break
      case 'optimize':
        set({
          optimizerSession: {
            sessionId: `opt-restored-${Date.now()}`,
            connectionId: entry.connectionId,
            schema: entry.schema,
            status: 'complete',
            originalQuery: entry.originalQuery ?? '',
            explainOutput: entry.explainOutput ?? '',
            rawText: '',
            suggestions: entry.suggestions ?? [],
            summary: entry.summary ?? '',
            insights: [],
            tradeoffs: [],
            mermaidDiagram: '',
            optimizedQuery: '',
            startedAt: entry.timestamp
          },
          activeTab: 'query-optimizer'
        })
        break
      case 'er-diagram':
        set({
          erSession: {
            connectionId: entry.connectionId,
            schema: entry.schema,
            selectedTables: entry.selectedTables ?? [],
            mermaidSyntax: entry.mermaidSyntax ?? '',
            generatedAt: entry.timestamp,
            relationshipMode: 'fk-only',
            inferredRelationships: [],
            modeCache: { 'fk-only': entry.mermaidSyntax ?? '', convention: '', ai: null },
            conventionRelationships: [],
            aiRelationships: []
          },
          erRelationshipMode: 'fk-only' as RelationshipMode,
          erInferredRelationships: [],
          selectedTablesForER: entry.selectedTables ?? [],
          activeTab: 'er-diagram'
        })
        break
    }
  },

  // ── Tab actions ─────────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── Query console actions ────────────────────────────────────────

  loadQueryTabs: async (connectionId) => {
    try {
      const raw = await window.api.settings.get(`queryConsole.tabs.${connectionId}`)
      const tabs = Array.isArray(raw) ? (raw as QueryTab[]) : []
      if (tabs.length > 0) {
        set({ queryTabs: tabs, activeQueryTabId: tabs[0].id })
      } else {
        // Create a default tab if none saved
        const defaultTab: QueryTab = {
          id: crypto.randomUUID(),
          connectionId,
          label: 'Query 1',
          sql: '',
          writeEnabled: false,
          outputMode: 'split',
          lastResult: null
        }
        set({ queryTabs: [defaultTab], activeQueryTabId: defaultTab.id })
      }
    } catch {
      const defaultTab: QueryTab = {
        id: crypto.randomUUID(),
        connectionId,
        label: 'Query 1',
        sql: '',
        writeEnabled: false,
        outputMode: 'split',
        lastResult: null
      }
      set({ queryTabs: [defaultTab], activeQueryTabId: defaultTab.id })
    }
  },

  saveQueryTabs: async () => {
    const { activeConnectionId, queryTabs } = get()
    if (!activeConnectionId) return
    try {
      await window.api.settings.set(`queryConsole.tabs.${activeConnectionId}`, queryTabs)
    } catch {
      // Non-critical — ignore
    }
  },

  addQueryTab: () => {
    const { queryTabs, activeConnectionId } = get()
    const connectionId = activeConnectionId ?? ''
    const newTab: QueryTab = {
      id: crypto.randomUUID(),
      connectionId,
      label: `Query ${queryTabs.length + 1}`,
      sql: '',
      writeEnabled: false,
      outputMode: 'split',
      lastResult: null
    }
    set({ queryTabs: [...queryTabs, newTab], activeQueryTabId: newTab.id })
    get().saveQueryTabs()
  },

  closeQueryTab: (tabId) => {
    const { queryTabs, activeQueryTabId, activeConnectionId } = get()
    const connectionId = activeConnectionId ?? ''
    const idx = queryTabs.findIndex((t) => t.id === tabId)
    if (idx === -1) return

    let remaining = queryTabs.filter((t) => t.id !== tabId)
    let newActiveId = activeQueryTabId

    if (remaining.length === 0) {
      // Create a fresh default tab if last one is closed
      const fresh: QueryTab = {
        id: crypto.randomUUID(),
        connectionId,
        label: 'Query 1',
        sql: '',
        writeEnabled: false,
        outputMode: 'split',
        lastResult: null
      }
      remaining = [fresh]
      newActiveId = fresh.id
    } else if (activeQueryTabId === tabId) {
      // Switch to nearest tab
      const nextIdx = Math.min(idx, remaining.length - 1)
      newActiveId = remaining[nextIdx].id
    }

    set({ queryTabs: remaining, activeQueryTabId: newActiveId })
    get().saveQueryTabs()
  },

  setActiveQueryTab: (tabId) => set({ activeQueryTabId: tabId }),

  // Debounce timer for updateQueryTabSql
  updateQueryTabSql: (() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    return (tabId: string, sql: string) => {
      const tabs = get().queryTabs.map((t) => (t.id === tabId ? { ...t, sql } : t))
      set({ queryTabs: tabs })
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        get().saveQueryTabs()
      }, 1000)
    }
  })(),

  toggleWriteMode: (tabId) => {
    const tabs = get().queryTabs.map((t) =>
      t.id === tabId ? { ...t, writeEnabled: !t.writeEnabled } : t
    )
    set({ queryTabs: tabs })
    get().saveQueryTabs()
  },

  toggleOutputMode: (tabId) => {
    const tabs = get().queryTabs.map((t) =>
      t.id === tabId ? { ...t, outputMode: t.outputMode === 'split' ? 'inline' : 'split' } : t
    )
    set({ queryTabs: tabs })
    get().saveQueryTabs()
  },

  renameQueryTab: (tabId, label) => {
    const tabs = get().queryTabs.map((t) => (t.id === tabId ? { ...t, label } : t))
    set({ queryTabs: tabs })
    get().saveQueryTabs()
  },

  executeQuery: async (tabId, sql) => {
    const { activeConnectionId, queryTabs } = get()
    if (!activeConnectionId) return

    const tab = queryTabs.find((t) => t.id === tabId)
    if (!tab) return

    const startTime = Date.now()

    // Set running state
    const runningResult: QueryExecution = {
      status: 'running' as QueryExecutionStatus,
      rows: [],
      fields: [],
      rowCount: 0,
      affectedRows: 0,
      executionTimeMs: 0,
      hasMore: false,
      sql,
      command: ''
    }

    set({
      queryTabs: queryTabs.map((t) =>
        t.id === tabId ? { ...t, lastResult: runningResult } : t
      )
    })

    try {
      const result = await window.api.db.query(
        activeConnectionId,
        sql,
        tab.writeEnabled,
        100,
        0
      )

      const executionTimeMs = Date.now() - startTime
      const successResult: QueryExecution = {
        status: 'success' as QueryExecutionStatus,
        rows: result.rows,
        fields: result.fields,
        rowCount: result.rowCount,
        affectedRows: (result as QueryResult & { affectedRows?: number }).affectedRows ?? 0,
        executionTimeMs,
        hasMore: (result as QueryResult & { hasMore?: boolean }).hasMore ?? false,
        sql,
        command: result.command ?? ''
      }

      set({
        queryTabs: get().queryTabs.map((t) =>
          t.id === tabId ? { ...t, lastResult: successResult } : t
        )
      })

      // Add to history
      const conn = get().connections.find((c) => c.id === activeConnectionId)
      await get().addHistoryEntry({
        type: 'query',
        connectionId: activeConnectionId,
        connectionName: conn?.name ?? 'Unknown',
        schema: get().activeSchema ?? '',
        executedSql: sql,
        executionTimeMs,
        resultRowCount: result.rowCount
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed'

      // Auto-reconnect on connection-loss errors, then retry once
      const isConnectionError = /ECONNRESET|ETIMEDOUT|Connection terminated|Client has encountered a connection error|ECONNREFUSED/i.test(message)
      if (isConnectionError) {
        try {
          await get().connectToDb(activeConnectionId)
          // Retry query after reconnect
          const tab2 = get().queryTabs.find((t) => t.id === tabId)
          if (tab2) {
            const retryResult = await window.api.db.query(activeConnectionId, sql, tab2.writeEnabled, 100, 0)
            const executionTimeMs = Date.now() - startTime
            const successResult: QueryExecution = {
              status: 'success' as QueryExecutionStatus,
              rows: retryResult.rows,
              fields: retryResult.fields,
              rowCount: retryResult.rowCount,
              affectedRows: (retryResult as QueryResult & { affectedRows?: number }).affectedRows ?? 0,
              executionTimeMs,
              hasMore: (retryResult as QueryResult & { hasMore?: boolean }).hasMore ?? false,
              sql,
              command: retryResult.command ?? ''
            }
            set({
              queryTabs: get().queryTabs.map((t) =>
                t.id === tabId ? { ...t, lastResult: successResult } : t
              )
            })
            return
          }
        } catch { /* reconnect/retry failed — fall through to show error */ }
      }

      // Try to extract line number from PostgreSQL error messages ("at line N")
      const lineMatch = message.match(/at line (\d+)/i)
      const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : undefined

      const errorResult: QueryExecution = {
        status: 'error' as QueryExecutionStatus,
        rows: [],
        fields: [],
        rowCount: 0,
        affectedRows: 0,
        executionTimeMs: Date.now() - startTime,
        hasMore: false,
        sql,
        command: '',
        error: message,
        errorLine
      }

      set({
        queryTabs: get().queryTabs.map((t) =>
          t.id === tabId ? { ...t, lastResult: errorResult } : t
        )
      })
    }
  },

  loadMoreRows: async (tabId, offset) => {
    const { activeConnectionId, queryTabs } = get()
    if (!activeConnectionId) return

    const tab = queryTabs.find((t) => t.id === tabId)
    if (!tab?.lastResult) return

    const { sql } = tab.lastResult

    try {
      const result = await window.api.db.query(
        activeConnectionId,
        sql,
        tab.writeEnabled,
        100,
        offset
      )

      const currentRows = tab.lastResult.rows
      const appendedRows = [...currentRows, ...result.rows]

      set({
        queryTabs: get().queryTabs.map((t) =>
          t.id === tabId
            ? {
                ...t,
                lastResult: {
                  ...t.lastResult!,
                  rows: appendedRows,
                  rowCount: appendedRows.length,
                  hasMore: (result as QueryResult & { hasMore?: boolean }).hasMore ?? false
                }
              }
            : t
        )
      })
    } catch (err) {
      console.error('[db-store] loadMoreRows failed:', err)
    }
  },

  cancelQuery: async (tabId) => {
    const { activeConnectionId } = get()
    if (!activeConnectionId) return
    try {
      await window.api.db.cancelQuery(activeConnectionId)
    } catch { /* ignore */ }

    set({
      queryTabs: get().queryTabs.map((t) =>
        t.id === tabId && t.lastResult?.status === 'running'
          ? { ...t, lastResult: { ...t.lastResult, status: 'cancelled' as QueryExecutionStatus } }
          : t
      )
    })
  },

  loadAllColumnsForAutocomplete: async () => {
    const { activeConnectionId, activeSchema } = get()
    if (!activeConnectionId || !activeSchema) return

    set({ isLoadingAllColumns: true })
    try {
      const columns = await window.api.db.allColumns(activeConnectionId, activeSchema)
      const cacheKey = `${activeConnectionId}:${activeSchema}`
      set((state) => ({
        columnsCache: { ...state.columnsCache, [cacheKey]: columns },
        isLoadingAllColumns: false
      }))
    } catch {
      set({ isLoadingAllColumns: false })
    }
  },

  loadSavedQueries: async () => {
    try {
      const raw = await window.api.settings.get('dbInspector.savedQueries')
      const savedQueries = Array.isArray(raw) ? (raw as SavedQuery[]) : []
      set({ savedQueries })
    } catch {
      set({ savedQueries: [] })
    }
  },

  saveQuery: async (name, sql) => {
    const { activeConnectionId } = get()
    const newQuery: SavedQuery = {
      id: crypto.randomUUID(),
      name,
      sql,
      connectionId: activeConnectionId ?? '',
      createdAt: new Date().toISOString()
    }
    const updated = [...get().savedQueries, newQuery]
    set({ savedQueries: updated })
    await window.api.settings.set('dbInspector.savedQueries', updated)
  },

  deleteSavedQuery: async (id) => {
    const updated = get().savedQueries.filter((q) => q.id !== id)
    set({ savedQueries: updated })
    await window.api.settings.set('dbInspector.savedQueries', updated)
  }
}))

// ── Exported helper: build CodeMirror schema from columnsCache ────────

/**
 * Transform columnsCache[connectionId:schema] from
 *   Record<tableName, { name: string, dataType: string }[]>
 * into the format CodeMirror's sql() extension expects:
 *   Record<tableName, string[]>  (column names only)
 */
export function buildCmSchema(
  tableColumns: Record<string, { name: string; dataType: string }[]> | undefined
): Record<string, string[]> {
  if (!tableColumns) return {}
  return Object.fromEntries(
    Object.entries(tableColumns).map(([table, cols]) => [table, cols.map((c) => c.name)])
  )
}

// ── Helper: Mermaid sanitization ──────────────────────────────────

/** Replace non-alphanumeric/underscore characters so mermaid doesn't choke. */
function sanitizeMermaidId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_')
}

/** Sanitize data type strings for mermaid ER attribute type field. */
function sanitizeMermaidType(dtype: string): string {
  return dtype
    .replace(/\(.*?\)/g, '')       // strip (precision) e.g. numeric(10,2) → numeric
    .replace(/\[\]/g, '_array')    // int[] → int_array
    .replace(/\s+/g, '_')         // spaces → underscores
    .replace(/[^a-zA-Z0-9_]/g, '') // strip remaining special chars
    || 'unknown'
}

// ── Helper: Generate Mermaid ERD ──────────────────────────────────

function generateMermaidERD(
  tables: { name: string; columns: ColumnInfo[] }[],
  foreignKeys: ForeignKey[],
  selectedTableNames: string[]
): string {
  const lines: string[] = ['erDiagram']

  for (const table of tables) {
    const safeName = sanitizeMermaidId(table.name)
    lines.push(`    ${safeName} {`)
    for (const col of table.columns) {
      const pkMarker = col.isPrimaryKey ? ' PK' : ''
      const fk = foreignKeys.find(
        (f) => f.sourceTable === table.name && f.sourceColumn === col.name
      )
      const fkMarker = fk ? ' FK' : ''
      const dtype = sanitizeMermaidType(col.dataType)
      const colName = sanitizeMermaidId(col.name)
      lines.push(`        ${dtype} ${colName}${pkMarker}${fkMarker}`)
    }
    lines.push('    }')
  }

  // Relationships
  const added = new Set<string>()
  for (const fk of foreignKeys) {
    const srcIn = selectedTableNames.includes(fk.sourceTable)
    const tgtIn = selectedTableNames.includes(fk.targetTable)
    if (srcIn && tgtIn) {
      const key = `${fk.sourceTable}-${fk.targetTable}-${fk.sourceColumn}`
      if (!added.has(key)) {
        added.add(key)
        const safeSrc = sanitizeMermaidId(fk.sourceTable)
        const safeTgt = sanitizeMermaidId(fk.targetTable)
        // Sanitize constraint name: strip quotes and special chars for mermaid label
        const safeLabel = (fk.constraintName || 'fk')
          .replace(/"/g, '')
          .replace(/[^a-zA-Z0-9_ -]/g, '_')
        lines.push(
          `    ${safeSrc} }|--|| ${safeTgt} : "${safeLabel}"`
        )
      }
    }
  }

  return lines.join('\n')
}

// ── Helper: Generate Mermaid ERD with inferred relationships ──────

function mapCardinalityToMermaid(cardinality: Cardinality): string {
  switch (cardinality) {
    case 'one-to-one':   return '||--||'
    case 'one-to-many':  return '||--|{'
    case 'many-to-one':  return '}|--||'
    case 'many-to-many': return '}|--|{'
    default:             return '}|--||'
  }
}

function generateMermaidERDWithInferred(
  tables: { name: string; columns: ColumnInfo[] }[],
  foreignKeys: ForeignKey[],
  inferredRelationships: InferredRelationship[],
  selectedTableNames: string[]
): string {
  const lines: string[] = ['erDiagram']

  // Build set of inferred FK columns for FK markers
  const inferredFkSet = new Set(
    inferredRelationships.map((r) => `${r.sourceTable}|${r.sourceColumn}`)
  )

  // Table definitions
  for (const table of tables) {
    const safeName = sanitizeMermaidId(table.name)
    lines.push(`    ${safeName} {`)
    for (const col of table.columns) {
      const pkMarker = col.isPrimaryKey ? ' PK' : ''
      const fk = foreignKeys.find(
        (f) => f.sourceTable === table.name && f.sourceColumn === col.name
      )
      const isInferredFk = inferredFkSet.has(`${table.name}|${col.name}`)
      const fkMarker = fk || isInferredFk ? ' FK' : ''
      const dtype = sanitizeMermaidType(col.dataType)
      const colName = sanitizeMermaidId(col.name)
      lines.push(`        ${dtype} ${colName}${pkMarker}${fkMarker}`)
    }
    lines.push('    }')
  }

  // Real FK relationships (solid)
  const added = new Set<string>()
  for (const fk of foreignKeys) {
    const srcIn = selectedTableNames.includes(fk.sourceTable)
    const tgtIn = selectedTableNames.includes(fk.targetTable)
    if (srcIn && tgtIn) {
      const key = `${fk.sourceTable}-${fk.targetTable}-${fk.sourceColumn}`
      if (!added.has(key)) {
        added.add(key)
        const safeSrc = sanitizeMermaidId(fk.sourceTable)
        const safeTgt = sanitizeMermaidId(fk.targetTable)
        const safeLabel = (fk.constraintName || 'fk')
          .replace(/"/g, '')
          .replace(/[^a-zA-Z0-9_ -]/g, '_')
        lines.push(`    ${safeSrc} }|--|| ${safeTgt} : "${safeLabel}"`)
      }
    }
  }

  // Inferred relationships (distinguished by label prefix)
  for (const rel of inferredRelationships) {
    const srcIn = selectedTableNames.includes(rel.sourceTable)
    const tgtIn = selectedTableNames.includes(rel.targetTable)
    if (srcIn && tgtIn) {
      const key = `${rel.sourceTable}-${rel.targetTable}-${rel.sourceColumn}`
      if (!added.has(key)) {
        added.add(key)
        const safeSrc = sanitizeMermaidId(rel.sourceTable)
        const safeTgt = sanitizeMermaidId(rel.targetTable)
        const notation = mapCardinalityToMermaid(rel.cardinality)
        const prefix = rel.source === 'ai' ? 'ai' : 'conv'
        const safeLabel = `${prefix}: ${rel.sourceColumn}`
        lines.push(`    ${safeSrc} ${notation} ${safeTgt} : "${safeLabel}"`)
      }
    }
  }

  return lines.join('\n')
}
