/**
 * QueryTab — Single SQL editor tab with execution toolbar and results area.
 *
 * Layout modes:
 *   split  — editor top, results panel bottom (default, like DBeaver)
 *   inline — results appear inline below the SQL block (DataGrip-style)
 *
 * Toolbar: Run / Run All / Cancel / Write Mode / Output Mode / Format / Explain
 * Status bar: execution time, row count, affected rows, command
 * Spinner with live elapsed timer during execution
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  ChevronRight,
  Square,
  Lock,
  Unlock,
  PanelBottom,
  AlignLeft,
  Code2,
  Zap,
  CheckCircle2,
  AlertCircle,
  XCircle,
  BookMarked,
  Save,
  Braces,
  Plus,
  X,
  Eye,
  EyeOff
} from 'lucide-react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { useDbStore, buildCmSchema } from '../../stores/db-store'
import type { QueryTab as QueryTabType, OutputMessage, InlineResult } from '../../types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import SqlEditor from './SqlEditor'
import ResultsGrid from './ResultsGrid'
import SavedQueriesPanel from './SavedQueriesPanel'
import Tooltip from './Tooltip'
import type { EditorView } from '@codemirror/view'

// ── Props ─────────────────────────────────────────────────────────────

interface QueryTabProps {
  tab: QueryTabType
  connectionId: string
  schema: string | null
  engine: 'postgresql' | 'mysql'
  /** Callback invoked when the editor mounts, providing the EditorView for external insert-at-cursor. */
  onEditorReady?: (view: EditorView) => void
}

// ── Elapsed timer hook ─────────────────────────────────────────────────

function useElapsedTimer(isRunning: boolean): string {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (isRunning) {
      startRef.current = Date.now()
      setElapsed(0)
      const interval = setInterval(() => {
        setElapsed(Date.now() - startRef.current)
      }, 100)
      return () => clearInterval(interval)
    } else {
      setElapsed(0)
    }
    return undefined
  }, [isRunning])

  if (!isRunning) return ''
  return `${(elapsed / 1000).toFixed(1)}s`
}

// ── Component ─────────────────────────────────────────────────────────

export default function QueryTab({
  tab,
  connectionId: _connectionId,
  schema,
  engine,
  onEditorReady: onEditorReadyProp
}: QueryTabProps): React.JSX.Element {
  const {
    updateQueryTabSql,
    toggleWriteMode,
    toggleOutputMode,
    executeQuery,
    cancelQuery,
    loadMoreRows,
    columnsCache,
    activeConnectionId,
    activeSchema,
    setActiveTab,
    startOptimization,
    setPendingOptimizerSql,
    saveQuery,
    setTabVariable,
    removeTabVariable,
    removeInlineResult,
    clearInlineResults
  } = useDbStore()

  const editorViewRef = useRef<EditorView | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // ── Saved queries panel state ────────────────────────────────────
  const [showSavedQueries, setShowSavedQueries] = useState(false)

  // ── Output console tab state ───────────────────────────────────
  const [outputTab, setOutputTab] = useState<'results' | 'output'>('results')

  // ── Variables panel state ──────────────────────────────────────
  const [showVariables, setShowVariables] = useState(false)

  // ── Output visibility state ──────────────────────────────────
  const [showOutput, setShowOutput] = useState(true)

  // ── Save query inline state ──────────────────────────────────────
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveQueryName, setSaveQueryName] = useState('')

  const isRunning = tab.lastResult?.status === 'running'
  const elapsedDisplay = useElapsedTimer(isRunning)

  // ── Schema for autocomplete ──────────────────────────────────────
  const cacheKey = `${activeConnectionId}:${activeSchema ?? schema}`
  const cmSchema = buildCmSchema(columnsCache[cacheKey])

  // ── Handlers ─────────────────────────────────────────────────────

  const handleExecuteCurrent = useCallback(
    (sql: string) => {
      if (sql.trim()) {
        executeQuery(tab.id, sql)
      }
    },
    [tab.id, executeQuery]
  )

  const handleExecuteAll = useCallback(() => {
    const sql = tab.sql.trim()
    if (sql) executeQuery(tab.id, sql)
  }, [tab.id, tab.sql, executeQuery])

  const handleCancel = useCallback(() => {
    cancelQuery(tab.id)
  }, [tab.id, cancelQuery])

  const handleRunCurrent = useCallback(() => {
    const view = editorViewRef.current
    if (!view) {
      handleExecuteAll()
      return
    }
    const state = view.state
    if (!state.selection.main.empty) {
      const selected = state.sliceDoc(state.selection.main.from, state.selection.main.to)
      if (selected.trim()) executeQuery(tab.id, selected.trim())
    } else {
      // Find statement at cursor (simple split on ;)
      const doc = state.doc.toString()
      const cursor = state.selection.main.head
      const stmts = doc.split(';')
      let pos = 0
      for (const stmt of stmts) {
        const end = pos + stmt.length
        if (cursor >= pos && cursor <= end + 1) {
          const sql = stmt.trim()
          if (sql) executeQuery(tab.id, sql)
          break
        }
        pos = end + 1
      }
    }
  }, [tab.id, tab.sql, executeQuery, handleExecuteAll])

  const handleFormat = useCallback(() => {
    const container = containerRef.current
    if (container) {
      const el = container.querySelector('[data-codemirror]') as
        | (HTMLDivElement & { formatSql?: () => void })
        | null
      el?.formatSql?.()
    }
  }, [])

  const handleExplain = useCallback(() => {
    let sql = tab.sql.trim()
    if (sql) {
      // Substitute variables
      if (tab.variables) {
        for (const [k, v] of Object.entries(tab.variables)) {
          sql = sql.replaceAll(`{{${k}}}`, v)
        }
      }
      setActiveTab('query-optimizer')
      // Always set pending SQL so the optimizer textarea gets populated
      setPendingOptimizerSql(sql)
      // startOptimization needs an agent - we just switch tab and pass the SQL
      // The optimizer will handle agent selection
      const agentStore = (window as Window & { __agentStore?: { getState?: () => { providers?: { id: string; model?: string; command?: string; status: string; hasApiKey?: boolean }[] } } }).__agentStore
      const providers = agentStore?.getState?.()?.providers ?? []
      const agent = providers.find((p) => p.status === 'connected' || p.hasApiKey)
      if (agent) {
        startOptimization(sql, agent.id, agent.model ?? agent.id, agent.command)
      }
    }
  }, [tab.sql, tab.variables, setActiveTab, setPendingOptimizerSql, startOptimization])

  const handleEditorReady = useCallback((view: EditorView) => {
    editorViewRef.current = view
    onEditorReadyProp?.(view)
  }, [onEditorReadyProp])

  // ── Save query handler ─────────────────────────────────────────

  const handleSaveQuery = useCallback(async () => {
    const name = saveQueryName.trim()
    const sql = tab.sql.trim()
    if (!name || !sql) return
    await saveQuery(name, sql)
    setSaveQueryName('')
    setShowSaveInput(false)
  }, [saveQueryName, tab.sql, saveQuery])

  const handleSaveKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSaveQuery()
      if (e.key === 'Escape') {
        setShowSaveInput(false)
        setSaveQueryName('')
      }
    },
    [handleSaveQuery]
  )

  // ── Load saved query ─────────────────────────────────────────

  const handleLoadSavedQuery = useCallback(
    (sql: string) => {
      updateQueryTabSql(tab.id, sql)
      // Update the editor content via EditorView dispatch
      const view = editorViewRef.current
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: sql }
        })
      }
      setShowSavedQueries(false)
    },
    [tab.id, updateQueryTabSql]
  )

  // ── Add variable handler ────────────────────────────────────────

  const handleAddVariable = useCallback(() => {
    const existing = Object.keys(tab.variables || {})
    const name = `var${existing.length + 1}`
    setTabVariable(tab.id, name, '')
  }, [tab.id, tab.variables, setTabVariable])

  // ── Result rendering helpers ─────────────────────────────────────

  const result = tab.lastResult
  const hasResult = result && result.status !== 'idle'
  const hasInlineResults = (tab.inlineResults || []).length > 0

  // ── Results content (ResultsGrid or status messages) ─────────────

  const renderResultsContent = () => {
    if (!result) return null

    const isRunning = result.status === 'running'
    const isError = result.status === 'error'
    const isCancelled = result.status === 'cancelled'

    // For SELECT results or running state, use ResultsGrid
    if (isRunning || (result.status === 'success' && (result.rows.length > 0 || result.command === 'SELECT'))) {
      return (
        <ResultsGrid
          rows={result.rows}
          fields={result.fields}
          hasMore={result.hasMore}
          isLoading={isRunning}
          error={undefined}
          errorLine={result.errorLine}
          onLoadMore={() => loadMoreRows(tab.id, result.rows.length)}
        />
      )
    }

    if (isError) {
      return (
        <div className="p-3">
          <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/20 p-3 animate-shake">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
            <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">
              {result.error ?? 'Unknown error'}
            </pre>
          </div>
        </div>
      )
    }

    if (isCancelled) {
      return (
        <div className="flex items-center gap-2 p-3 text-muted-foreground text-xs">
          <XCircle size={14} className="text-yellow-400" />
          <span>Query cancelled</span>
        </div>
      )
    }

    if (result.status === 'success') {
      // DML result (no rows returned)
      return (
        <div className="flex items-center gap-2 p-3 text-muted-foreground text-xs">
          <CheckCircle2 size={14} className="text-green-400" />
          <span>
            {result.affectedRows > 0
              ? `${result.affectedRows} row${result.affectedRows !== 1 ? 's' : ''} affected`
              : 'Query executed successfully'}
          </span>
        </div>
      )
    }

    return null
  }

  // ── Status bar ────────────────────────────────────────────────────

  const renderStatusBar = () => {
    if (!result) return null
    const parts: string[] = []

    if (result.status === 'running') {
      parts.push(`Running ${elapsedDisplay}`)
    } else if (result.status === 'success') {
      if (result.executionTimeMs > 0) {
        parts.push(`${(result.executionTimeMs / 1000).toFixed(3)}s`)
      }
      if (result.command === 'SELECT' || result.rows.length > 0) {
        parts.push(`${result.rowCount} row${result.rowCount !== 1 ? 's' : ''}`)
        if (result.hasMore) parts.push('(more available)')
      }
      if (result.affectedRows > 0) {
        parts.push(`${result.affectedRows} affected`)
      }
      if (result.command) {
        parts.push(result.command)
      }
    } else if (result.status === 'error') {
      parts.push('Error')
      if (result.errorLine) parts.push(`at line ${result.errorLine}`)
    } else if (result.status === 'cancelled') {
      parts.push('Cancelled')
    }

    return (
      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-3 py-1 text-xs text-muted-foreground">
        {result.status === 'running' && (
          <svg className="h-3 w-3 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {result.status === 'success' && (
          <CheckCircle2 size={11} className="text-green-400 shrink-0" />
        )}
        {result.status === 'error' && (
          <AlertCircle size={11} className="text-red-400 shrink-0" />
        )}
        {result.status === 'cancelled' && (
          <XCircle size={11} className="text-yellow-400 shrink-0" />
        )}
        <span>{parts.join(' · ')}</span>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <Card className="flex shrink-0 items-center gap-1 rounded-none border-x-0 border-t-0 px-2 py-1.5">
        {/* Run current statement */}
        <Tooltip content="Run statement" shortcut="⌘↵">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunCurrent}
            disabled={isRunning}
          >
            <Play size={11} />
            Run
          </Button>
        </Tooltip>

        {/* Run all */}
        <Tooltip content="Run all" shortcut="⌘⇧↵">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExecuteAll}
            disabled={isRunning}
          >
            <ChevronRight size={11} />
            All
          </Button>
        </Tooltip>

        {/* Cancel (visible only when running) */}
        {isRunning && (
          <Tooltip content="Cancel query">
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
            >
              <Square size={11} />
              Cancel
            </Button>
          </Tooltip>
        )}

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Write mode toggle */}
        <Tooltip content={tab.writeEnabled ? 'Write mode — DML allowed' : 'Read-only mode'}>
          <button
            type="button"
            onClick={() => toggleWriteMode(tab.id)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs active:scale-95 transition-all ${
              tab.writeEnabled
                ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                : 'text-muted-foreground hover:bg-card-hover hover:text-foreground'
            }`}
          >
            {tab.writeEnabled ? <Unlock size={11} /> : <Lock size={11} />}
            {tab.writeEnabled ? 'Write' : 'Read'}
          </button>
        </Tooltip>

        {/* Output mode toggle */}
        <Tooltip content={tab.outputMode === 'split' ? 'Switch to inline output' : 'Switch to split output'}>
          <button
            type="button"
            onClick={() => toggleOutputMode(tab.id)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-card-hover hover:text-foreground active:scale-95 transition-all"
          >
            {tab.outputMode === 'split' ? <PanelBottom size={11} /> : <AlignLeft size={11} />}
            {tab.outputMode === 'split' ? 'Split' : 'Inline'}
          </button>
        </Tooltip>

        {/* Show/hide output */}
        <Tooltip content={showOutput ? 'Hide output' : 'Show output'}>
          <button
            type="button"
            onClick={() => setShowOutput((v) => !v)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-card-hover hover:text-foreground transition-all active:scale-95"
          >
            {showOutput ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
        </Tooltip>

        {/* Format */}
        <Tooltip content="Format SQL" shortcut="⌘⇧F">
          <button
            type="button"
            onClick={handleFormat}
            className="rounded p-1 text-muted-foreground hover:bg-card-hover hover:text-foreground active:scale-95 transition-all"
          >
            <Code2 size={13} />
          </button>
        </Tooltip>

        {/* Explain in Optimizer */}
        <Tooltip content="Analyze in Optimizer">
          <button
            type="button"
            onClick={handleExplain}
            className="rounded p-1 text-muted-foreground hover:bg-card-hover hover:text-foreground active:scale-95 transition-all"
          >
            <Zap size={13} />
          </button>
        </Tooltip>

        {/* Variables toggle */}
        <Tooltip content="Query variables">
          <button
            type="button"
            onClick={() => setShowVariables((v) => !v)}
            className={`rounded p-1 active:scale-95 transition-all ${
              showVariables
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-card-hover hover:text-foreground'
            }`}
          >
            <Braces size={13} />
          </button>
        </Tooltip>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Saved queries toggle */}
        <Tooltip content="Saved queries">
          <button
            type="button"
            onClick={() => setShowSavedQueries((v) => !v)}
            className={`rounded p-1 active:scale-95 transition-all ${
              showSavedQueries
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-card-hover hover:text-foreground'
            }`}
          >
            <BookMarked size={13} />
          </button>
        </Tooltip>

        {/* Save query (inline name input or trigger button) */}
        {showSaveInput ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={saveQueryName}
              onChange={(e) => setSaveQueryName(e.target.value)}
              onKeyDown={handleSaveKeyDown}
              placeholder="Query name…"
              autoFocus
              className="h-6 w-28 rounded border border-primary bg-transparent px-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveQuery}
              disabled={!saveQueryName.trim()}
            >
              Save
            </Button>
            <button
              type="button"
              onClick={() => { setShowSaveInput(false); setSaveQueryName('') }}
              className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <XCircle size={12} />
            </button>
          </div>
        ) : (
          <Tooltip content="Save query">
            <button
              type="button"
              onClick={() => setShowSaveInput(true)}
              className="rounded p-1 text-muted-foreground hover:bg-card-hover hover:text-foreground active:scale-95 transition-all"
            >
              <Save size={13} />
            </button>
          </Tooltip>
        )}

        <div className="flex-1" />

        {/* Connection status badge */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="max-w-[120px] truncate">{schema ?? 'public'}</span>
        </div>
      </Card>

      {/* Saved queries panel (collapsible) */}
      {showSavedQueries && _connectionId && (
        <div className="shrink-0 border-b border-border animate-slide-down" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <SavedQueriesPanel
            connectionId={_connectionId}
            onLoadQuery={handleLoadSavedQuery}
          />
        </div>
      )}

      {/* Variables panel (collapsible) */}
      {showVariables && (
        <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 border-b border-border bg-card/30 flex-wrap animate-slide-down">
          {Object.entries(tab.variables || {}).map(([name, value]) => (
            <VariableChip
              key={name}
              name={name}
              value={value}
              onChangeName={(newName) => {
                if (newName !== name) {
                  removeTabVariable(tab.id, name)
                  setTabVariable(tab.id, newName, value)
                }
              }}
              onChange={(v) => setTabVariable(tab.id, name, v)}
              onRemove={() => removeTabVariable(tab.id, name)}
            />
          ))}
          <button
            type="button"
            onClick={handleAddVariable}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-primary rounded border border-dashed border-border hover:border-primary/50 transition-colors"
          >
            <Plus size={10} /> Add
          </button>
        </div>
      )}

      {/* Editor + Results */}
      {tab.outputMode === 'split' ? (
        // ── Split mode: resizable editor top, results bottom ────────
        <PanelGroup orientation="vertical" className="flex-1">
          <Panel defaultSize={showOutput && hasResult ? 60 : 100} minSize={20}>
            <Card className="h-full overflow-hidden rounded-none border-x-0 border-t-0 p-0">
              <SqlEditor
                value={tab.sql}
                onChange={(sql) => updateQueryTabSql(tab.id, sql)}
                onExecuteCurrent={handleExecuteCurrent}
                onExecuteAll={handleExecuteAll}
                schema={cmSchema}
                dialect={engine}
                errorLine={result?.errorLine}
                onEditorReady={handleEditorReady}
                variables={tab.variables}
              />
            </Card>
          </Panel>
          {showOutput && hasResult && (
            <>
              <PanelResizeHandle className="h-1.5 bg-transparent hover:bg-primary/30 transition-colors cursor-row-resize flex items-center justify-center group">
                <div className="w-8 h-0.5 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
              </PanelResizeHandle>
              <Panel defaultSize={40} minSize={15}>
                <div className="h-full flex flex-col overflow-hidden border-t border-border animate-results-enter">
                  <div className="flex items-center gap-0 border-b border-border bg-card/50 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOutputTab('results')}
                      className={`px-3 py-1 text-xs font-medium transition-all duration-150 ${
                        outputTab === 'results'
                          ? 'text-primary border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Results
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutputTab('output')}
                      className={`px-3 py-1 text-xs font-medium transition-all duration-150 relative ${
                        outputTab === 'output'
                          ? 'text-primary border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Output
                      {(tab.outputMessages || []).length > 0 && (
                        <span className="ml-1 text-[9px] text-muted-foreground">({(tab.outputMessages || []).length})</span>
                      )}
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {outputTab === 'results' ? renderResultsContent() : <OutputConsole messages={tab.outputMessages || []} />}
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      ) : (
        // ── Inline mode: editor then results inline below ───────────
        <div className="flex-1 overflow-auto">
          <div style={{ minHeight: 200 }}>
            <SqlEditor
              value={tab.sql}
              onChange={(sql) => updateQueryTabSql(tab.id, sql)}
              onExecuteCurrent={handleExecuteCurrent}
              onExecuteAll={handleExecuteAll}
              schema={cmSchema}
              dialect={engine}
              errorLine={result?.errorLine}
              onEditorReady={handleEditorReady}
              variables={tab.variables}
            />
          </div>
          {showOutput && hasInlineResults && (
            <div className="border-t border-border">
              {/* Results/Output tab headers */}
              <div className="flex items-center gap-0 border-b border-border bg-card/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setOutputTab('results')}
                  className={`px-3 py-1 text-xs font-medium transition-all duration-150 ${
                    outputTab === 'results'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Results ({(tab.inlineResults || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutputTab('output')}
                  className={`px-3 py-1 text-xs font-medium transition-all duration-150 relative ${
                    outputTab === 'output'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Output
                  {(tab.outputMessages || []).length > 0 && (
                    <span className="ml-1 text-[9px] text-muted-foreground">({(tab.outputMessages || []).length})</span>
                  )}
                </button>
                {outputTab === 'results' && (tab.inlineResults || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearInlineResults(tab.id)}
                    className="ml-auto mr-2 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {outputTab === 'results' ? (
                <div className="divide-y divide-border">
                  {(tab.inlineResults || []).map((ir, idx) => (
                    <div key={ir.id} className="animate-results-enter">
                      <div className="flex items-center gap-2 px-3 py-1 bg-card/30 text-xs text-muted-foreground">
                        <span className="font-mono text-primary">#{idx + 1}</span>
                        <span className="truncate flex-1 font-mono">{ir.sql.slice(0, 80)}{ir.sql.length > 80 ? '...' : ''}</span>
                        <button
                          type="button"
                          onClick={() => removeInlineResult(tab.id, ir.id)}
                          className="text-muted-foreground hover:text-red-400 p-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                      {ir.result.status === 'success' && ir.result.rows.length > 0 ? (
                        <div style={{ maxHeight: 300 }} className="overflow-auto">
                          <ResultsGrid
                            rows={ir.result.rows}
                            fields={ir.result.fields}
                            hasMore={ir.result.hasMore}
                            isLoading={false}
                            error={undefined}
                            onLoadMore={() => {}}
                          />
                        </div>
                      ) : ir.result.status === 'error' ? (
                        <div className="p-2 text-xs text-red-400">{ir.result.error}</div>
                      ) : (
                        <div className="p-2 text-xs text-green-400">
                          {ir.result.affectedRows > 0 ? `${ir.result.affectedRows} rows affected` : 'Query executed successfully'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <OutputConsole messages={tab.outputMessages || []} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Status bar */}
      {renderStatusBar()}
    </div>
  )
}

// ── OutputConsoleMessage ───────────────────────────────────────────────

function OutputConsoleMessage({ message }: { message: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const isMultiLine = message.includes('\n')
  const isLong = message.length > 200

  if (!isMultiLine && !isLong) {
    return <span>{message}</span>
  }

  const firstLine = message.split('\n')[0]
  const preview = isMultiLine ? firstLine : message.slice(0, 200)

  return (
    <span className="min-w-0">
      {expanded ? (
        <span
          className="whitespace-pre-wrap break-words cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          {message}
        </span>
      ) : (
        <span
          className="truncate cursor-pointer hover:underline"
          title={message}
          onClick={() => setExpanded(true)}
        >
          {preview}
          <span className="text-muted-foreground/50 ml-1">...</span>
        </span>
      )}
    </span>
  )
}

// ── OutputConsole ──────────────────────────────────────────────────────

function OutputConsole({ messages }: { messages: OutputMessage[] }): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No output yet
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-2 font-mono text-xs space-y-0.5">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 py-0.5 ${
            msg.type === 'error'
              ? 'text-red-400'
              : msg.type === 'success'
                ? 'text-green-400'
                : msg.type === 'warning'
                  ? 'text-yellow-400'
                  : 'text-muted-foreground'
          }`}
        >
          <span className="shrink-0 text-muted-foreground/50">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
          <OutputConsoleMessage message={msg.message} />
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

// ── VariableChip ──────────────────────────────────────────────────────

function VariableChip({
  name,
  value,
  onChangeName,
  onChange,
  onRemove
}: {
  name: string
  value: string
  onChangeName: (newName: string) => void
  onChange: (v: string) => void
  onRemove: () => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    const newName = editName.trim().replace(/[^a-zA-Z0-9_]/g, '')
    if (newName && newName !== name) {
      onChangeName(newName)
    }
    onChange(editValue)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-xs">
        <span className="text-primary/50">{'{{'}</span>
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-16 bg-transparent outline-none text-primary font-medium border-b border-primary/30"
          placeholder="name"
        />
        <span className="text-primary/50">{'}}'}</span>
        <span className="text-muted-foreground">=</span>
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-24 bg-transparent outline-none text-foreground border-b border-primary/30"
          placeholder="value"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-400 ml-1"
        >
          <X size={10} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setEditName(name); setEditValue(value); setEditing(true) }}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs hover:border-primary/40 transition-colors"
    >
      <span className="text-primary font-medium">{`{{${name}}}`}</span>
      <span className="text-muted-foreground">=</span>
      <span className="text-foreground">{value || '...'}</span>
    </button>
  )
}
