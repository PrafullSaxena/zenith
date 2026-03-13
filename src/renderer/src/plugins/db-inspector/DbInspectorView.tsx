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
  GitFork,
  History,
  Terminal,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import type { EditorView } from '@codemirror/view'
import { useDbStore } from '../../stores/db-store'
import { useAgentStore } from '../../stores/agent-store'
import { useActivityStore } from '../../stores/activity-store'
import { useSettingsStore } from '../../stores/settings-store'
import type { DbInspectorTab, DbHistoryEntry } from '../../types/database'
import ConnectionManager from './ConnectionManager'
import SchemaExplorer from './SchemaExplorer'
import AskAI from './AskAI'
import QueryOptimizer from './QueryOptimizer'
import ERDiagram from './ERDiagram'
import DbHistory from './DbHistory'
import QueryConsole from './QueryConsole'

const TABS: { id: DbInspectorTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'query-console', label: 'Console', icon: Terminal },
  { id: 'ask-ai', label: 'Ask AI', icon: MessageSquare },
  { id: 'query-optimizer', label: 'Optimizer', icon: Zap },
  { id: 'er-diagram', label: 'ER Diagram', icon: GitFork },
  { id: 'history', label: 'History', icon: History }
]

export default function DbInspectorView(): React.JSX.Element {
  const navigate = useNavigate()

  // ── Left panel collapse state ────────────────────────────────────
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)

  // ── Editor view ref for schema double-click insert ───────────────
  // The active QueryTab's SqlEditor provides its EditorView via onEditorReady.
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

  // ── Stores ──────────────────────────────────────────────────────

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
    generateERDiagram,
    switchERMode,
    generateAllERModes,
    loadHistory,
    addHistoryEntry,
    restoreFromHistory,
    setActiveTab
  } = useDbStore()

  const { providers, loadProviders } = useAgentStore()
  const { addEntry: addActivity } = useActivityStore()
  const _settingsObj = useSettingsStore((s) => s.settings) // trigger re-render on settings change
  const getSetting = useSettingsStore((s) => s.getSetting)

  // ── Agent selection ─────────────────────────────────────────────

  const defaultAgentId = getSetting('plugins.db-inspector.defaultAgent') as string | undefined
  const agent = defaultAgentId
    ? providers.find((p) => p.id === defaultAgentId)
    : providers.find((p) => p.status === 'connected' || p.hasApiKey)
  const hasAgent = !!agent

  // ── Activity dedup ──────────────────────────────────────────────

  const loggedSessionIds = useRef<Set<string>>(new Set())

  // ── Mount effects ───────────────────────────────────────────────
  //
  // Only load initial data on mount. All cascading loads (schemas → tables)
  // are handled internally by the store actions:
  //   connectToDb → loadDatabases + loadSchemas (auto-selects schema → loadTables)
  //   setActiveDatabase → switchDatabase + loadSchemas (auto-selects schema → loadTables)
  //   setActiveSchema → loadTables

  useEffect(() => {
    loadConnections()
    loadHistory()
    loadQAHistory()
    loadProviders()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Q&A completion → history + activity ─────────────────────────

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

  // ── Optimizer completion → history + activity ───────────────────

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
      summary: optimizerSession.summary
    })

    addActivity({
      pluginId: 'db-inspector',
      operation: `Query Optimization: ${optimizerSession.suggestions.length} suggestions`,
      status: 'success',
      durationMs: Date.now() - new Date(optimizerSession.startedAt).getTime(),
      detail: `${conn?.name ?? ''} / ${optimizerSession.schema}`
    })
  }, [optimizerSession?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────

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
    // Generate all 3 modes at once; pass agent info for AI inference
    if (agent) {
      await generateAllERModes(agent.id, agent.model ?? agent.id, agent.command)
    } else {
      await generateAllERModes()
    }

    // Log to history + activity
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

  // ── Active connection status ────────────────────────────────────

  const activeConnection = connections.find((c) => c.id === activeConnectionId)
  const isConnected = activeConnectionId
    ? connectionStatuses[activeConnectionId]?.connected ?? false
    : false

  // ── Tab label with streaming indicator ──────────────────────────

  const getTabLabel = (tab: DbInspectorTab): string => {
    switch (tab) {
      case 'ask-ai':
        return qaSession?.status === 'streaming' ? 'Ask AI ●' : 'Ask AI'
      case 'query-optimizer':
        return optimizerSession?.status === 'streaming' || optimizerSession?.status === 'analyzing'
          ? 'Optimizer ●'
          : 'Optimizer'
      case 'history':
        return history.length > 0 ? `History (${history.length})` : 'History'
      case 'query-console': {
        // Show running indicator if any query tab is currently running
        const { queryTabs } = useDbStore.getState()
        const hasRunning = queryTabs.some((t) => t.lastResult?.status === 'running')
        return hasRunning ? 'Console ●' : 'Console'
      }
      default:
        return TABS.find((t) => t.id === tab)?.label ?? tab
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-text-primary">DbInspector</h1>
        {activeConnection && (
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-text-secondary/30'}`}
            />
            <span className="text-xs text-text-secondary">
              {activeConnection.name}
              {activeDatabase ? ` / ${activeDatabase}` : ''}
              {activeSchema ? ` / ${activeSchema}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Connections (sticky) + Schema Explorer (scrollable) + collapse toggle */}
        <div className="relative flex shrink-0 flex-col border-r border-border transition-all duration-200"
          style={{ width: isLeftPanelCollapsed ? 0 : 256, overflow: isLeftPanelCollapsed ? 'hidden' : 'visible' }}
        >
          <div className="stagger-children flex h-full flex-col" style={{ width: 256 }}>
            <div className="shrink-0 border-b border-border p-3">
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

            {isConnected && (
              <div className="flex-1 overflow-auto p-3">
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
            )}
          </div>
        </div>

        {/* Collapse/expand toggle button */}
        <button
          type="button"
          onClick={() => setIsLeftPanelCollapsed((v) => !v)}
          title={isLeftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
          className="relative z-10 flex h-10 w-4 shrink-0 items-center justify-center self-start mt-2 rounded-r border border-l-0 border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
        >
          {isLeftPanelCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Right panel — Tabbed content */}
        <div className="flex flex-1 flex-col overflow-hidden">
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

          {/* Tab bar */}
          <div className="flex border-b border-border">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-b-2 border-accent text-accent'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon size={13} />
                  {getTabLabel(tab.id)}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div key={activeTab} className="animate-tab-enter flex-1 overflow-hidden">
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
          </div>
        </div>
      </div>
    </div>
  )
}
