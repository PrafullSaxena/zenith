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
  Save
} from 'lucide-react'
import { useDbStore, buildCmSchema } from '../../stores/db-store'
import type { QueryTab as QueryTabType } from '../../types/database'
import SqlEditor from './SqlEditor'
import ResultsGrid from './ResultsGrid'
import SavedQueriesPanel from './SavedQueriesPanel'
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
    saveQuery
  } = useDbStore()

  const editorViewRef = useRef<EditorView | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // ── Saved queries panel state ────────────────────────────────────
  const [showSavedQueries, setShowSavedQueries] = useState(false)

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
    const sql = tab.sql.trim()
    if (sql) {
      setActiveTab('query-optimizer')
      // startOptimization needs an agent - we just switch tab and pass the SQL
      // The optimizer will handle agent selection
      const agentStore = (window as Window & { __agentStore?: { getState?: () => { providers?: { id: string; model?: string; command?: string; status: string; hasApiKey?: boolean }[] } } }).__agentStore
      const providers = agentStore?.getState?.()?.providers ?? []
      const agent = providers.find((p) => p.status === 'connected' || p.hasApiKey)
      if (agent) {
        startOptimization(sql, agent.id, agent.model ?? agent.id, agent.command)
      }
    }
  }, [tab.sql, setActiveTab, startOptimization])

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

  // ── Result rendering helpers ─────────────────────────────────────

  const result = tab.lastResult
  const hasResult = result && result.status !== 'idle'

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
          <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/20 p-3">
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
        <div className="flex items-center gap-2 p-3 text-text-secondary text-xs">
          <XCircle size={14} className="text-yellow-400" />
          <span>Query cancelled</span>
        </div>
      )
    }

    if (result.status === 'success') {
      // DML result (no rows returned)
      return (
        <div className="flex items-center gap-2 p-3 text-text-secondary text-xs">
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
      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-3 py-1 text-xs text-text-secondary">
        {result.status === 'running' && (
          <svg className="h-3 w-3 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
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
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-2 py-1.5">
        {/* Run current statement */}
        <button
          type="button"
          onClick={handleRunCurrent}
          disabled={isRunning}
          title="Run statement (Ctrl+Enter)"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 transition-colors"
        >
          <Play size={11} />
          Run
        </button>

        {/* Run all */}
        <button
          type="button"
          onClick={handleExecuteAll}
          disabled={isRunning}
          title="Run all (Ctrl+Shift+Enter)"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover disabled:opacity-50 transition-colors"
        >
          <ChevronRight size={11} />
          All
        </button>

        {/* Cancel (visible only when running) */}
        {isRunning && (
          <button
            type="button"
            onClick={handleCancel}
            title="Cancel query"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Square size={11} />
            Cancel
          </button>
        )}

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Write mode toggle */}
        <button
          type="button"
          onClick={() => toggleWriteMode(tab.id)}
          title={tab.writeEnabled ? 'Write mode ON — DML allowed' : 'Write mode OFF — read only'}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
            tab.writeEnabled
              ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
          }`}
        >
          {tab.writeEnabled ? <Unlock size={11} /> : <Lock size={11} />}
          {tab.writeEnabled ? 'Write' : 'Read'}
        </button>

        {/* Output mode toggle */}
        <button
          type="button"
          onClick={() => toggleOutputMode(tab.id)}
          title={
            tab.outputMode === 'split'
              ? 'Switch to inline output (DataGrip-style)'
              : 'Switch to split output (bottom panel)'
          }
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          {tab.outputMode === 'split' ? <PanelBottom size={11} /> : <AlignLeft size={11} />}
          {tab.outputMode === 'split' ? 'Split' : 'Inline'}
        </button>

        {/* Format */}
        <button
          type="button"
          onClick={handleFormat}
          title="Format SQL"
          className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          <Code2 size={13} />
        </button>

        {/* Explain in Optimizer */}
        <button
          type="button"
          onClick={handleExplain}
          title="Analyze in Query Optimizer"
          className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          <Zap size={13} />
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Saved queries toggle */}
        <button
          type="button"
          onClick={() => setShowSavedQueries((v) => !v)}
          title="Saved queries"
          className={`rounded p-1 transition-colors ${
            showSavedQueries
              ? 'bg-accent/20 text-accent'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
          }`}
        >
          <BookMarked size={13} />
        </button>

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
              className="h-6 w-28 rounded border border-accent bg-transparent px-1.5 text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveQuery}
              disabled={!saveQueryName.trim()}
              className="rounded px-2 py-0.5 text-xs bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setShowSaveInput(false); setSaveQueryName('') }}
              className="rounded p-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              <XCircle size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSaveInput(true)}
            title="Save current query"
            className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            <Save size={13} />
          </button>
        )}

        <div className="flex-1" />

        {/* Connection status badge */}
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="max-w-[120px] truncate">{schema ?? 'public'}</span>
        </div>
      </div>

      {/* Saved queries panel (collapsible) */}
      {showSavedQueries && _connectionId && (
        <div className="shrink-0 border-b border-border" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <SavedQueriesPanel
            connectionId={_connectionId}
            onLoadQuery={handleLoadSavedQuery}
          />
        </div>
      )}

      {/* Editor + Results */}
      {tab.outputMode === 'split' ? (
        // ── Split mode: editor top (flex-1), results bottom (40%) ───
        <>
          <div className="min-h-0 flex-1 overflow-hidden">
            <SqlEditor
              value={tab.sql}
              onChange={(sql) => updateQueryTabSql(tab.id, sql)}
              onExecuteCurrent={handleExecuteCurrent}
              onExecuteAll={handleExecuteAll}
              schema={cmSchema}
              dialect={engine}
              errorLine={result?.errorLine}
              onEditorReady={handleEditorReady}
            />
          </div>

          {hasResult && (
            <div className="flex shrink-0 flex-col border-t border-border" style={{ height: '40%' }}>
              {renderResultsContent()}
            </div>
          )}
        </>
      ) : (
        // ── Inline mode: editor then results inline below ───────────
        <div className="flex-1 overflow-auto">
          <div style={{ minHeight: '200px', height: hasResult ? '45%' : '100%' }}>
            <SqlEditor
              value={tab.sql}
              onChange={(sql) => updateQueryTabSql(tab.id, sql)}
              onExecuteCurrent={handleExecuteCurrent}
              onExecuteAll={handleExecuteAll}
              schema={cmSchema}
              dialect={engine}
              errorLine={result?.errorLine}
              onEditorReady={handleEditorReady}
            />
          </div>

          {hasResult && (
            <div className="border-t border-border/50 bg-background/50" style={{ height: '55%', display: 'flex', flexDirection: 'column' }}>
              <div className="shrink-0 px-2 py-1 text-xs text-text-secondary bg-surface/50 border-b border-border/50">
                Result
              </div>
              <div className="flex-1 overflow-hidden">
                {renderResultsContent()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status bar */}
      {renderStatusBar()}
    </div>
  )
}
