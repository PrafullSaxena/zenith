/**
 * DbInspectorView — Main view for the DbInspector plugin.
 *
 * Layout:
 *  - Left panel: ConnectionManager (selector) + SchemaExplorer
 *  - Right panel: Tabbed content (Ask AI | Optimizer | ER Diagram | History)
 *
 * Connections are managed in Settings > DbInspector.
 * This view only selects from existing connections, connects/disconnects,
 * and browses schemas/tables.
 */
import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Zap,
  Network,
  Clock,
  Terminal,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  Search,
  GitFork,
  Sparkles,
  Link2,
  Loader2
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import type { EditorView } from '@codemirror/view'
import { useDbStore } from '../../stores/db-store'
import { useAgentStore } from '../../stores/agent-store'
import { useActivityStore } from '../../stores/activity-store'
import { useSettingsStore } from '../../stores/settings-store'
import type { DbInspectorTab, DbHistoryEntry, RelationshipMode } from '../../types/database'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { PageHeader } from '../../components/shared/page-header'
import { pageTransition } from '../../lib/motion'
import ConnectionManager from './ConnectionManager'
import SchemaExplorer from './SchemaExplorer'
import AskAI from './AskAI'
import QueryOptimizer from './QueryOptimizer'
import ERDiagram from './ERDiagram'
import DbHistory from './DbHistory'
import QueryConsole from './QueryConsole'

const TABS: { id: string; label: string; icon: typeof MessageSquare }[] = [
  { id: 'query-console', label: 'Console', icon: Terminal },
  { id: 'ask-ai', label: 'Ask AI', icon: MessageSquare },
  { id: 'query-optimizer', label: 'Optimizer', icon: Zap },
  { id: 'er-diagram', label: 'ER Diagram', icon: Network },
  { id: 'history', label: 'History', icon: Clock }
]

const ER_MODES: { id: RelationshipMode; label: string; icon: typeof Link2; needsAgent?: boolean }[] = [
  { id: 'fk-only', label: 'FK Only', icon: Link2 },
  { id: 'convention', label: 'Convention', icon: GitFork },
  { id: 'ai', label: 'AI Inferred', icon: Sparkles, needsAgent: true }
]

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

function ERSidebar({
  tables,
  selectedTables,
  onToggleTable,
  onSetTables,
  onGenerate,
  hasConnection,
  hasAgent,
  erRelationshipMode,
  onModeChange,
  erInferenceStatus,
  erInferredRelationships,
  erSession,
  tableSearch,
  onTableSearchChange
}: {
  tables: { name: string }[]
  selectedTables: string[]
  onToggleTable: (t: string) => void
  onSetTables: (t: string[]) => void
  onGenerate: () => Promise<void>
  hasConnection: boolean
  hasAgent: boolean
  erRelationshipMode: RelationshipMode
  onModeChange: (m: RelationshipMode) => void
  erInferenceStatus: string
  erInferredRelationships: { source: string }[]
  erSession: { inferredRelationships?: { source: string }[] } | null
  tableSearch: string
  onTableSearchChange: (v: string) => void
}): React.JSX.Element {
  const [isGenerating, setIsGenerating] = useState(false)

  const filteredTables = React.useMemo(() => {
    if (!tableSearch.trim()) return tables
    return tables.filter((t) => fuzzyMatch(tableSearch.trim(), t.name))
  }, [tables, tableSearch])

  const allSelected = tables.length > 0 && selectedTables.length === tables.length
  const noneSelected = selectedTables.length === 0
  const isInferring = erInferenceStatus === 'streaming' || erInferenceStatus === 'inferring'
  const aiPending = erRelationshipMode === 'ai' && isInferring
  const inferredCount = erInferredRelationships.length

  const inferredSummary = React.useMemo(() => {
    if (!erSession?.inferredRelationships?.length) return null
    const conv = erSession.inferredRelationships.filter((r) => r.source === 'convention').length
    const ai = erSession.inferredRelationships.filter((r) => r.source === 'ai').length
    const parts: string[] = []
    if (conv > 0) parts.push(`${conv} convention`)
    if (ai > 0) parts.push(`${ai} AI`)
    return parts.join(', ')
  }, [erSession?.inferredRelationships])

  const handleGenerate = async (): Promise<void> => {
    setIsGenerating(true)
    try {
      await onGenerate()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden px-3 py-2">
      <div className="flex items-center justify-between shrink-0 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Tables
        </p>
        <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
          {selectedTables.length}/{tables.length}
        </span>
      </div>

      {!hasConnection ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground/50 text-center">Connect to a database first…</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground/50 text-center">No tables in selected schema</p>
        </div>
      ) : (
        <>
          <div className="relative mb-3 shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => onTableSearchChange(e.target.value)}
              placeholder="Filter tables…"
              className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
            />
          </div>

          <div className="flex justify-between items-center mb-2 shrink-0">
            <button
              type="button"
              onClick={() => onSetTables(allSelected ? [] : tables.map((t) => t.name))}
              className="text-[10px] text-primary hover:text-primary/80 transition-colors"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="flex-1 overflow-auto -mx-1 px-1 custom-scrollbar">
            <div className="flex flex-wrap gap-1.5 pb-2">
              {filteredTables.map((t) => {
                const isSelected = selectedTables.includes(t.name)
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => onToggleTable(t.name)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                    }`}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Controls at bottom */}
      <div className="shrink-0 pt-4 mt-2 border-t border-border/40 space-y-3">
        {hasConnection && tables.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Relationships Mode
            </span>
            <div className="flex rounded-md border border-border overflow-hidden bg-background">
              {ER_MODES.map((mode) => {
                const Icon = mode.icon
                const isActive = erRelationshipMode === mode.id
                const isDisabled = mode.needsAgent && !hasAgent
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => !isDisabled && onModeChange(mode.id)}
                    disabled={isDisabled}
                    title={isDisabled ? 'Requires AI agent — configure in Settings' : undefined}
                    className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium transition-colors ${
                      mode.id !== 'fk-only' ? 'border-l border-border' : ''
                    } ${
                      isActive
                        ? 'bg-primary/10 text-primary shadow-inner'
                        : isDisabled
                          ? 'text-muted-foreground/30 cursor-not-allowed bg-muted/30'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <Icon size={12} />
                    {mode.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <Button
          variant="default"
          size="sm"
          className="w-full text-xs font-medium bg-primary/90 hover:bg-primary text-primary-foreground"
          onClick={handleGenerate}
          disabled={noneSelected || isGenerating || !hasConnection}
        >
          {isGenerating ? (
            <Loader2 size={13} className="animate-spin mr-1.5" />
          ) : (
            <GitFork size={13} className="mr-1.5" />
          )}
          {isGenerating ? 'Generating...' : 'Generate ER Diagram'}
        </Button>

        {inferredCount > 0 && inferredSummary && (
          <div className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/10 px-2 py-1.5 rounded-md border border-primary/20">
            <Sparkles size={11} className="shrink-0" />
            <span className="truncate">{inferredCount} inferred ({inferredSummary})</span>
          </div>
        )}

        {aiPending && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1.5 rounded-md">
            <Loader2 size={11} className="animate-spin shrink-0" />
            <span className="truncate">AI inference in progress…</span>
          </div>
        )}

        {erInferenceStatus === 'error' && (
          <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-400/10 px-2 py-1.5 rounded-md border border-red-400/20">
            <span className="truncate">AI inference failed. Showing convention results.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DbInspectorView(): React.JSX.Element {
  const navigate = useNavigate()

  // -- Left panel collapse state
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
  const leftPanelRef = useRef<any>(null)

  // -- ER table search (for left panel sidebar)
  const [erTableSearch, setErTableSearch] = useState('')

  // -- Editor view ref for schema double-click insert
  const activeEditorViewRef = useRef<EditorView | null>(null)

  const handleEditorReady = useCallback((view: EditorView) => {
    activeEditorViewRef.current = view
  }, [])

  const handleInsertAtCursor = useCallback((text: string) => {
    const view = activeEditorViewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length }
    })
    view.focus()
  }, [])

  // -- Stores
  const {
    connections,
    activeConnectionId,
    activeDatabase,
    activeSchema,
    connectionStatuses,
    databases,
    isLoadingDatabases,
    schemas,
    tables,
    columns,
    foreignKeys,
    indexes,
    tableStats,
    isLoadingTables,
    isLoadingDetails,
    selectedTable,
    qaSession,
    optimizerSession,
    optimizerTiles,
    erSession,
    selectedTablesForER,
    erRelationshipMode,
    erInferenceStatus,
    erInferredRelationships,
    history,
    isLoadingHistory,
    activeTab,
    loadConnections,
    connectToDb,
    disconnectDb,
    setActiveConnection,
    setActiveDatabase,
    setActiveSchema,
    loadTableDetails,
    setSelectedTable,
    startQA,
    cancelQA,
    qaQuestionHistory,
    loadQAHistory,
    startOptimization,
    cancelOptimization,
    setSelectedTablesForER,
    toggleTableForER,
    
    switchERMode,
    generateAllERModes,
    loadHistory,
    addHistoryEntry,
    restoreFromHistory,
    setActiveTab
  } = useDbStore()

  const { providers, loadProviders } = useAgentStore()
  const { addEntry: addActivity } = useActivityStore()
  const getSetting = useSettingsStore((s) => s.getSetting)

  // -- Agent selection
  const defaultAgentId = getSetting('plugins.db-inspector.defaultAgent') as string | undefined
  const agent = defaultAgentId
    ? providers.find((p) => p.id === defaultAgentId)
    : providers.find((p) => p.status === 'connected' || p.hasApiKey)
  const hasAgent = !!agent

  // -- Activity dedup
  const loggedSessionIds = useRef<Set<string>>(new Set())

  // -- Mount effects
  useEffect(() => {
    loadConnections()
    loadHistory()
    loadQAHistory()
    loadProviders()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // -- Q&A completion -> history + activity
  useEffect(() => {
    if (!qaSession || qaSession.status !== 'complete') return
    if (loggedSessionIds.current.has(qaSession.sessionId)) return
    loggedSessionIds.current.add(qaSession.sessionId)

    const conn = connections.find((c) => c.id === qaSession.connectionId)
    addHistoryEntry({
      type: 'qa',
      connectionId: qaSession.connectionId,
      connectionName: conn?.name ?? 'Unknown',
      schema: qaSession.schema,
      question: qaSession.question,
      answer: qaSession.answer
    })

    addActivity({
      pluginId: 'db-inspector',
      operation: `DB Q&A: ${qaSession.question.substring(0, 50)}`,
      status: 'success',
      durationMs: Date.now() - new Date(qaSession.startedAt).getTime(),
      detail: `${conn?.name ?? ''} / ${qaSession.schema}`
    })
  }, [qaSession?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // -- Optimizer completion -> history + activity
  useEffect(() => {
    if (!optimizerSession || optimizerSession.status !== 'complete') return
    if (loggedSessionIds.current.has(optimizerSession.sessionId)) return
    loggedSessionIds.current.add(optimizerSession.sessionId)

    const conn = connections.find((c) => c.id === optimizerSession.connectionId)
    addHistoryEntry({
      type: 'optimize',
      connectionId: optimizerSession.connectionId,
      connectionName: conn?.name ?? 'Unknown',
      schema: optimizerSession.schema,
      originalQuery: optimizerSession.originalQuery,
      explainOutput: optimizerSession.explainOutput,
      suggestions: optimizerSession.suggestions,
      summary: optimizerSession.summary,
      insights: optimizerSession.insights,
      tradeoffs: optimizerSession.tradeoffs,
      mermaidDiagram: optimizerSession.mermaidDiagram,
      optimizedQuery: optimizerSession.optimizedQuery
    })

    addActivity({
      pluginId: 'db-inspector',
      operation: `Query Optimization: ${optimizerSession.suggestions.length} suggestions`,
      status: 'success',
      durationMs: Date.now() - new Date(optimizerSession.startedAt).getTime(),
      detail: `${conn?.name ?? ''} / ${optimizerSession.schema}`
    })
  }, [optimizerSession?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // -- Handlers
  const handleStartQA = useCallback(
    (question: string) => {
      if (!agent) return
      startQA(question, agent.id, agent.model ?? agent.id, agent.command)
    },
    [agent, startQA]
  )

  const handleStartOptimization = useCallback(
    (sql: string) => {
      if (!agent) return
      startOptimization(sql, agent.id, agent.model ?? agent.id, agent.command)
    },
    [agent, startOptimization]
  )

  const handleGenerateER = useCallback(async () => {
    if (agent) {
      await generateAllERModes(agent.id, agent.model ?? agent.id, agent.command)
    } else {
      await generateAllERModes()
    }

    const sess = useDbStore.getState().erSession
    if (sess) {
      const conn = connections.find((c) => c.id === sess.connectionId)
      addHistoryEntry({
        type: 'er-diagram',
        connectionId: sess.connectionId,
        connectionName: conn?.name ?? 'Unknown',
        schema: sess.schema,
        selectedTables: sess.selectedTables,
        mermaidSyntax: sess.mermaidSyntax
      })

      addActivity({
        pluginId: 'db-inspector',
        operation: `ER Diagram: ${sess.selectedTables.length} tables`,
        status: 'success',
        durationMs: null,
        detail: `${conn?.name ?? ''} / ${sess.schema}`
      })
    }
  }, [generateAllERModes, agent, connections, addHistoryEntry, addActivity])

  const handleHistoryOpen = useCallback(
    (entry: DbHistoryEntry) => {
      restoreFromHistory(entry)
    },
    [restoreFromHistory]
  )

  const handleSelectTable = useCallback(
    (table: string) => {
      if (selectedTable === table) {
        setSelectedTable(null)
      } else {
        loadTableDetails(table)
      }
    },
    [selectedTable, setSelectedTable, loadTableDetails]
  )

  const handleOpenSettings = useCallback(() => {
    navigate('/settings?tab=db-inspector')
  }, [navigate])

  // -- Active connection status
  const activeConnection = connections.find((c) => c.id === activeConnectionId)
  const isConnected = activeConnectionId
    ? connectionStatuses[activeConnectionId]?.connected ?? false
    : false

  // -- Connection status badge for Card
  const connectionBadge = activeConnection ? (
    <Badge variant={isConnected ? 'success' : 'destructive'} className={
      connectionStatuses[activeConnectionId ?? ''] !== undefined &&
      !connectionStatuses[activeConnectionId ?? '']?.connected &&
      !connectionStatuses[activeConnectionId ?? '']?.error
        ? 'animate-pulse'
        : ''
    }>
      {activeConnection.name}
      {activeDatabase ? ` / ${activeDatabase}` : ''}
      {activeSchema ? ` / ${activeSchema}` : ''}
    </Badge>
  ) : undefined

  return (
    <div className="flex h-full flex-col">
      {/* Header with Card */}
      <PageHeader
        icon={Database}
        title="DB Inspector"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as DbInspectorTab)}
        statusIndicator={connectionBadge}
      />

      {/* Empty state when no connections configured */}
      {connections.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No database connections"
          description="Connect to a PostgreSQL database to explore schemas, run queries, and get AI-powered insights."
          actionLabel="Add Connection"
          onAction={handleOpenSettings}
          className="flex-1"
        />
      ) : (
      /* Main content */
      <div className="flex flex-1 overflow-hidden relative z-0 w-full h-full">
        <PanelGroup orientation="horizontal" className="w-full h-full">
          {/* Left panel -- Connections (sticky) + Schema Explorer (scrollable) + collapse toggle */}
          <Panel
            panelRef={leftPanelRef}
            collapsible={true}
            collapsedSize="0%"
            defaultSize="22%"
            minSize="15%"
            maxSize="40%"
            onResize={(size) => {
              setIsLeftPanelCollapsed(size.asPercentage === 0)
            }}
            className="flex flex-col bg-white/[0.02]"
          >
          <div className="flex h-full flex-col bg-white/[0.02] w-full overflow-hidden">
            <div className="shrink-0 border-b border-white/[0.06] px-3 py-2.5">
              <ConnectionManager
                connections={connections}
                connectionStatuses={connectionStatuses}
                activeConnectionId={activeConnectionId}
                onSelectConnection={setActiveConnection}
                onConnect={connectToDb}
                onDisconnect={disconnectDb}
                onOpenSettings={handleOpenSettings}
              />
            </div>

            {isConnected && activeTab === 'er-diagram' ? (
              /* ER Diagram sidebar: table selection + mode controls */
              <ERSidebar
                tables={tables}
                selectedTables={selectedTablesForER}
                onToggleTable={toggleTableForER}
                onSetTables={setSelectedTablesForER}
                onGenerate={handleGenerateER}
                hasConnection={isConnected}
                hasAgent={hasAgent}
                erRelationshipMode={erRelationshipMode}
                onModeChange={switchERMode}
                erInferenceStatus={erInferenceStatus}
                erInferredRelationships={erInferredRelationships}
                erSession={erSession}
                tableSearch={erTableSearch}
                onTableSearchChange={setErTableSearch}
              />
            ) : isConnected ? (
              <div className="flex-1 overflow-auto px-3 py-2">
                <SchemaExplorer
                  databases={databases}
                  activeDatabase={activeDatabase}
                  onDatabaseChange={setActiveDatabase}
                  isLoadingDatabases={isLoadingDatabases}
                  schemas={schemas}
                  activeSchema={activeSchema}
                  onSchemaChange={setActiveSchema}
                  tables={tables}
                  isLoadingTables={isLoadingTables}
                  selectedTable={selectedTable}
                  onSelectTable={handleSelectTable}
                  columns={columns}
                  indexes={indexes}
                  foreignKeys={foreignKeys}
                  tableStats={tableStats}
                  isLoadingDetails={isLoadingDetails}
                  onInsertAtCursor={activeTab === 'query-console' ? handleInsertAtCursor : undefined}
                />
              </div>
            ) : null}
          </div>
          </Panel>

          {/* Resize handle with toggle button */}
          <PanelResizeHandle className="relative flex w-2 shrink-0 items-center justify-center bg-transparent transition-colors hover:bg-white/10 active:bg-primary/20 cursor-col-resize z-50">
            <button
              type="button"
              onClick={() => {
                const panel = leftPanelRef.current
                if (panel) {
                  if (panel.isCollapsed()) panel.expand()
                  else panel.collapse()
                }
              }}
              title={isLeftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
              className="absolute -left-[1px] top-6 flex h-8 w-3.5 items-center justify-center rounded-r border border-l-0 border-[hsl(var(--border))] bg-card text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-white/[0.06] transition-colors"
            >
              {isLeftPanelCollapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
            </button>
          </PanelResizeHandle>

          {/* Right panel -- Tabbed content */}
          <Panel minSize="30%" className="flex flex-col overflow-hidden bg-background">
          {/* Agent status warning */}
          {isConnected && !hasAgent && (
            <div className="flex items-center gap-2 border-b border-yellow-500/20 bg-yellow-500/10 px-4 py-2">
              <AlertTriangle size={14} className="shrink-0 text-yellow-400" />
              <span className="text-xs text-yellow-300">
                No AI agent detected. Ask AI and Optimizer require a CLI agent (Claude, Codex, Gemini, or Ollama).{' '}
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="underline hover:text-yellow-200"
                >
                  Configure in Settings
                </button>
              </span>
            </div>
          )}

          {/* Tab content with AnimatePresence */}
          <AnimatePresence mode="wait">
              <motion.div
              key={activeTab}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 overflow-auto h-full w-full flex flex-col"
            >
              {activeTab === 'ask-ai' && (
                <AskAI
                  session={qaSession}
                  hasConnection={isConnected}
                  hasAgent={hasAgent}
                  activeConnectionId={isConnected ? activeConnectionId : null}
                  questionHistory={qaQuestionHistory}
                  onStart={handleStartQA}
                  onCancel={cancelQA}
                />
              )}
              {activeTab === 'query-optimizer' && (
                <QueryOptimizer
                  session={optimizerSession}
                  tiles={optimizerTiles}
                  hasConnection={isConnected}
                  hasAgent={hasAgent}
                  onStart={handleStartOptimization}
                  onCancel={cancelOptimization}
                />
              )}
              {activeTab === 'er-diagram' && (
                <ERDiagram
                  tables={tables}
                  selectedTables={selectedTablesForER}
                  onToggleTable={toggleTableForER}
                  onSetTables={setSelectedTablesForER}
                  onGenerate={handleGenerateER}
                  session={erSession}
                  hasConnection={isConnected}
                  hasAgent={hasAgent}
                  inferenceStatus={erInferenceStatus}
                  relationshipMode={erRelationshipMode}
                  onModeChange={switchERMode}
                  inferredCount={erInferredRelationships.length}
                  connectionName={activeConnection?.name}
                  schema={activeSchema ?? ''}
                />
              )}
              {activeTab === 'query-console' && (
                <QueryConsole
                  connectionId={activeConnectionId}
                  isConnected={isConnected}
                  schema={activeSchema}
                  tables={tables}
                  engine={activeConnection?.engine ?? 'postgresql'}
                  onEditorReady={handleEditorReady}
                />
              )}
              {activeTab === 'history' && (
                <DbHistory
                  history={history}
                  isLoading={isLoadingHistory}
                  onOpen={handleHistoryOpen}
                />
              )}
            </motion.div>
          </AnimatePresence>
          </Panel>
        </PanelGroup>
      </div>
      )}
    </div>
  )
}
