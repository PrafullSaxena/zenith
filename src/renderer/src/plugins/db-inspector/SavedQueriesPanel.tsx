import { useState, useEffect } from 'react'
import { Trash2, Play, BookMarked } from 'lucide-react'
import { useDbStore } from '../../stores/db-store'

// ── Types ────────────────────────────────────────────────────────────

interface SavedQueriesPanelProps {
  onLoadQuery: (sql: string) => void
  connectionId: string
}

// ── Relative time helper ─────────────────────────────────────────────

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// ── Component ────────────────────────────────────────────────────────

export default function SavedQueriesPanel({ onLoadQuery, connectionId }: SavedQueriesPanelProps) {
  const { savedQueries, loadSavedQueries, deleteSavedQuery } = useDbStore()

  // Track which query IDs are in "confirm delete" mode
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadSavedQueries()
  }, [loadSavedQueries])

  // Filter: show queries for current connection (or all if connectionId mismatch)
  const filtered = savedQueries.filter((q) => q.connectionId === connectionId)
  const otherQueries = savedQueries.filter((q) => q.connectionId !== connectionId)

  const handleDelete = async (id: string) => {
    if (confirmDeleteId === id) {
      await deleteSavedQuery(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDeleteId((prev) => (prev === id ? null : prev)), 3000)
    }
  }

  const handleLoad = (sql: string) => {
    onLoadQuery(sql)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
        <BookMarked className="w-3.5 h-3.5 text-text-secondary" />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          Saved Queries
        </span>
        <span className="ml-auto text-xs text-text-secondary/60">{filtered.length}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 && otherQueries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-text-secondary/60 px-4 text-center">
            <p className="text-xs">No saved queries yet</p>
            <p className="text-xs mt-1 text-text-secondary/40">
              Use the &quot;Save Query&quot; button to save frequently used queries
            </p>
          </div>
        ) : (
          <>
            {/* Current connection queries */}
            {filtered.map((q) => (
              <div
                key={q.id}
                className="group flex flex-col px-3 py-2 border-b border-border/50 hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-primary truncate max-w-[120px]" title={q.name}>
                    {q.name.slice(0, 30)}{q.name.length > 30 ? '...' : ''}
                  </span>
                  <span className="text-xs text-text-secondary/50 flex-shrink-0">
                    {relativeTime(q.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary/60 truncate mt-0.5" title={q.sql}>
                  {q.sql.split('\n')[0].slice(0, 60)}
                  {q.sql.length > 60 ? '...' : ''}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button
                    onClick={() => handleLoad(q.sql)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ml-auto ${
                      confirmDeleteId === q.id
                        ? 'bg-error/20 text-error'
                        : 'text-text-secondary/40 hover:text-error hover:bg-error/10'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                    {confirmDeleteId === q.id ? 'Confirm?' : ''}
                  </button>
                </div>
              </div>
            ))}

            {/* Other connections' queries (dimmed, with connection label) */}
            {otherQueries.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs text-text-secondary/40 uppercase tracking-wide border-b border-border/30">
                  Other connections
                </div>
                {otherQueries.map((q) => (
                  <div
                    key={q.id}
                    className="group flex flex-col px-3 py-2 border-b border-border/50 hover:bg-surface/50 transition-colors opacity-60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-text-primary truncate max-w-[100px]" title={q.name}>
                        {q.name.slice(0, 25)}{q.name.length > 25 ? '...' : ''}
                      </span>
                      <span className="text-xs text-text-secondary/50 flex-shrink-0">
                        {relativeTime(q.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary/60 truncate mt-0.5 italic" title={q.sql}>
                      conn: {q.connectionId.slice(-8)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        onClick={() => handleLoad(q.sql)}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Load
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ml-auto ${
                          confirmDeleteId === q.id
                            ? 'bg-error/20 text-error'
                            : 'text-text-secondary/40 hover:text-error hover:bg-error/10'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                        {confirmDeleteId === q.id ? 'Confirm?' : ''}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
