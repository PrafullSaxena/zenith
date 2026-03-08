/**
 * DbHistory — Unified history for all DbInspector features.
 * Shows last 10 results (Q&A, Optimizer, ER Diagram) with "Open" to restore.
 */
import React from 'react'
import { Eye, MessageSquare, Zap, GitFork, Loader2 } from 'lucide-react'
import type { DbHistoryEntry } from '../../types/database'

interface DbHistoryProps {
  history: DbHistoryEntry[]
  isLoading: boolean
  onOpen: (entry: DbHistoryEntry) => void
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof MessageSquare; badge: string }
> = {
  qa: { label: 'Q&A', icon: MessageSquare, badge: 'bg-blue-500/20 text-blue-400' },
  optimize: { label: 'Optimizer', icon: Zap, badge: 'bg-orange-500/20 text-orange-400' },
  'er-diagram': { label: 'ER Diagram', icon: GitFork, badge: 'bg-green-500/20 text-green-400' }
}

export default function DbHistory({
  history,
  isLoading,
  onOpen
}: DbHistoryProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-text-secondary">
        <Loader2 size={16} className="animate-spin" />
        <span className="ml-2 text-sm">Loading history…</span>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary/50">
        <div className="text-center">
          <Eye size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No history yet</p>
          <p className="mt-1 text-xs">Results from Q&A, Query Optimizer, and ER Diagrams will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        Recent Results ({history.length})
      </p>
      {history.map((entry) => {
        const config = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.qa
        const Icon = config.icon

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
          >
            {/* Type badge */}
            <span
              className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${config.badge}`}
            >
              <Icon size={10} />
              {config.label}
            </span>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-primary">
                {entry.type === 'qa' && entry.question}
                {entry.type === 'optimize' &&
                  (entry.originalQuery
                    ? entry.originalQuery.substring(0, 80) +
                      (entry.originalQuery.length > 80 ? '…' : '')
                    : 'SQL query')}
                {entry.type === 'er-diagram' &&
                  (entry.selectedTables?.join(', ') ?? 'Tables')}
              </p>
              <p className="mt-0.5 text-[10px] text-text-secondary">
                {entry.connectionName} / {entry.schema} · {formatRelativeTime(entry.timestamp)}
              </p>
            </div>

            {/* Open button */}
            <button
              type="button"
              onClick={() => onOpen(entry)}
              className="shrink-0 rounded px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10"
              title="Restore result"
            >
              <Eye size={13} className="mr-1 inline" />
              Open
            </button>
          </div>
        )
      })}
    </div>
  )
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
