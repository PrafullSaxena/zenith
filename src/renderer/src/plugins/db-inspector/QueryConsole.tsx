/**
 * QueryConsole — Multi-tab SQL query console.
 *
 * Renders a tab bar (add/close/rename) and delegates to the active QueryTab.
 * Tab state is managed by db-store and persisted across sessions via settings IPC.
 */

import React, { useState, useRef, useCallback } from 'react'
import { Plus, X, Terminal } from 'lucide-react'
import { useDbStore } from '../../stores/db-store'
import type { TableInfo } from '../../types/database'
import { Card } from '@renderer/components/ui/card'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import QueryTab from './QueryTab'
import type { EditorView } from '@codemirror/view'

// -- Props
interface QueryConsoleProps {
  connectionId: string | null
  isConnected: boolean
  schema: string | null
  tables: TableInfo[]
  engine: 'postgresql' | 'mysql'
  /** Invoked when the active SqlEditor mounts its EditorView. */
  onEditorReady?: (view: EditorView) => void
}

// -- Component
export default function QueryConsole({
  connectionId,
  isConnected,
  schema,
  tables: _tables,
  engine,
  onEditorReady
}: QueryConsoleProps): React.JSX.Element {
  const {
    queryTabs,
    activeQueryTabId,
    addQueryTab,
    closeQueryTab,
    setActiveQueryTab,
    renameQueryTab
  } = useDbStore()

  // -- Rename state
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const handleDoubleClick = useCallback(
    (tabId: string, currentLabel: string) => {
      setRenamingTabId(tabId)
      setRenameValue(currentLabel)
      setTimeout(() => renameInputRef.current?.select(), 10)
    },
    []
  )

  const commitRename = useCallback(() => {
    if (renamingTabId && renameValue.trim()) {
      renameQueryTab(renamingTabId, renameValue.trim())
    }
    setRenamingTabId(null)
  }, [renamingTabId, renameValue, renameQueryTab])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitRename()
      if (e.key === 'Escape') setRenamingTabId(null)
    },
    [commitRename]
  )

  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      closeQueryTab(tabId)
    },
    [closeQueryTab]
  )

  const activeTab = queryTabs.find((t) => t.id === activeQueryTabId) ?? queryTabs[0] ?? null

  if (!isConnected || !connectionId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Terminal}
          title="No connection"
          description="Connect to a database to open the query console."
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar with glass appearance */}
      <Card className="flex shrink-0 items-center overflow-x-auto rounded-none border-x-0 border-t-0">
        {queryTabs.map((tab) => {
          const isActive = tab.id === activeQueryTabId
          return (
            <div
              key={tab.id}
              onClick={() => setActiveQueryTab(tab.id)}
              className={`group relative flex shrink-0 cursor-pointer items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-[var(--primary)] text-[var(--primary)] bg-white/[0.04]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/[0.02]'
              }`}
            >
              {renamingTabId === tab.id ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="w-24 bg-transparent outline-none border-b border-[var(--primary)] text-[hsl(var(--foreground))]"
                  autoFocus
                />
              ) : (
                <span
                  onDoubleClick={() => handleDoubleClick(tab.id, tab.label)}
                  className="select-none"
                >
                  {tab.label}
                </span>
              )}
              {/* Running indicator */}
              {tab.lastResult?.status === 'running' && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              )}
              {/* Close button */}
              <button
                type="button"
                onClick={(e) => handleCloseTab(e, tab.id)}
                className="ml-0.5 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          )
        })}

        {/* Add new tab button */}
        <button
          type="button"
          onClick={addQueryTab}
          className="flex shrink-0 items-center gap-1 px-2 py-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          title="Add query tab"
        >
          <Plus size={14} />
        </button>
      </Card>

      {/* Active tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <QueryTab
            key={activeTab.id}
            tab={activeTab}
            connectionId={connectionId}
            schema={schema}
            engine={engine}
            onEditorReady={onEditorReady}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={Terminal}
              title="No query tabs"
              description="Add a tab to start writing queries."
            />
          </div>
        )}
      </div>
    </div>
  )
}
