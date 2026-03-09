/**
 * NoteList -- Sidebar list of notes with create and delete actions.
 *
 * Displays all notes ordered by updated_at descending with active note
 * highlighting, relative timestamps, and a trash icon on hover for deletion.
 */

import { Plus, Trash2 } from 'lucide-react'
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
    <div className="flex h-full w-60 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-text-secondary">Notes</span>
        <button
          type="button"
          onClick={() => createNote()}
          className="rounded p-1 text-text-secondary transition-colors hover:bg-surface-elevated hover:text-accent"
          title="Create new note"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-text-secondary">
            No notes yet.
            <br />
            Click + to create one.
          </div>
        ) : (
          notes.map((note) => {
            const isActive = activeNoteId === note.id
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => selectNote(note.id)}
                className={`group flex w-full items-start justify-between px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'border-l-2 border-accent bg-surface-elevated'
                    : 'border-l-2 border-transparent hover:bg-surface-elevated'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-sm ${
                      isActive ? 'text-text-primary' : 'text-text-primary'
                    }`}
                  >
                    {note.title || 'Untitled'}
                  </div>
                  <div className="mt-0.5 text-[10px] text-text-secondary">
                    {relativeTime(note.updatedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNote(note.id)
                  }}
                  className="ml-1 shrink-0 rounded p-0.5 text-text-secondary opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                  title="Delete note"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
