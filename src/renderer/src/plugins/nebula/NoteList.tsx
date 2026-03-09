/**
 * NoteList -- Sidebar list of notes with create and delete actions.
 *
 * Displays all notes ordered by updated_at descending with active note
 * highlighting, relative timestamps, summary preview, and a trash icon
 * on hover for deletion.
 */

import { Plus, Trash2, Sparkles } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'

/** Format a relative time string from an ISO timestamp. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function NoteList(): React.JSX.Element {
  const notes = useNebulaStore((s) => s.notes)
  const activeNoteId = useNebulaStore((s) => s.activeNoteId)
  const selectNote = useNebulaStore((s) => s.selectNote)
  const createNote = useNebulaStore((s) => s.createNote)
  const deleteNote = useNebulaStore((s) => s.deleteNote)

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
          Notes
        </span>
        <button
          type="button"
          onClick={() => createNote()}
          className="flex h-6 w-6 items-center justify-center rounded text-text-secondary transition-colors hover:bg-accent/15 hover:text-accent"
          title="Create new note"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto mb-2 h-8 w-8 rounded-lg bg-surface-elevated flex items-center justify-center">
              <Plus size={16} className="text-text-secondary/50" />
            </div>
            <p className="text-xs text-text-secondary">No notes yet</p>
            <p className="mt-0.5 text-[10px] text-text-secondary/50">
              Click + to create one
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const isActive = activeNoteId === note.id
            return (
              <div
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={() => selectNote(note.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') selectNote(note.id)
                }}
                className={`group flex w-full cursor-pointer items-start justify-between px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'border-l-2 border-accent bg-accent/5'
                    : 'border-l-2 border-transparent hover:bg-surface-elevated/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`truncate text-sm ${
                        isActive ? 'font-medium text-text-primary' : 'text-text-primary/80'
                      }`}
                    >
                      {note.title || 'Untitled'}
                    </span>
                    {note.summary && (
                      <Sparkles
                        size={10}
                        className="shrink-0 text-accent/60"
                        title="AI summarized"
                      />
                    )}
                  </div>
                  {note.summary && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-text-secondary/60">
                      {note.summary}
                    </p>
                  )}
                  <div className="mt-1 text-[10px] text-text-secondary/50">
                    {relativeTime(note.updatedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNote(note.id)
                  }}
                  className="ml-1 mt-0.5 shrink-0 rounded p-0.5 text-text-secondary opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                  title="Delete note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
