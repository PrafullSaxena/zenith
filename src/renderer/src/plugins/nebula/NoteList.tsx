/**
 * NoteList -- Sidebar list of notes with pinning, content preview, context menu,
 * keyboard shortcuts, and hover actions.
 *
 * Features:
 *  - Two-line content preview: title + preview text + relative timestamp
 *  - Pinned section at top with "Pinned" / "Notes" labels
 *  - Pin icon on hover (filled when pinned, always visible for pinned notes)
 *  - Trash icon on hover to delete with confirmation dialog
 *  - Right-click context menu with Pin/Unpin, Duplicate, Delete
 *  - Cmd+N keyboard shortcut to create new note
 *  - Pen icon indicator for notes with drawings
 *  - New Note button at top of list
 */

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pin, Trash2, Pencil, Sparkles } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import NoteContextMenu from './NoteContextMenu'
import DeleteConfirmDialog from './DeleteConfirmDialog'

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

/** Context menu state */
interface ContextMenuState {
  isOpen: boolean
  position: { x: number; y: number }
  noteId: string
  isPinned: boolean
}

/** Delete dialog state */
interface DeleteDialogState {
  isOpen: boolean
  noteId: string
  noteTitle: string
}

export default function NoteList(): React.JSX.Element {
  const notes = useNebulaStore((s) => s.notes)
  const activeNoteId = useNebulaStore((s) => s.activeNoteId)
  const selectNote = useNebulaStore((s) => s.selectNote)
  const createNote = useNebulaStore((s) => s.createNote)
  const deleteNote = useNebulaStore((s) => s.deleteNote)
  const togglePin = useNebulaStore((s) => s.togglePin)
  const saveNote = useNebulaStore((s) => s.saveNote)
  const activeNote = useNebulaStore((s) => s.activeNote)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    noteId: '',
    isPinned: false
  })

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    noteId: '',
    noteTitle: ''
  })

  // Handle Cmd+N keyboard shortcut for new note
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        createNote().then(() => {
          // Dispatch custom event so NebulaView/NoteEditor can focus title
          window.dispatchEvent(new CustomEvent('nebula:focus-title'))
        })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [createNote])

  // Context menu handlers
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, noteId: string, isPinned: boolean) => {
      e.preventDefault()
      setContextMenu({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        noteId,
        isPinned
      })
    },
    []
  )

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // Pin handler
  const handlePin = useCallback(() => {
    if (contextMenu.noteId) {
      togglePin(contextMenu.noteId)
    }
  }, [contextMenu.noteId, togglePin])

  // Duplicate handler: create a new note with same content
  const handleDuplicate = useCallback(async () => {
    const note = notes.find((n) => n.id === contextMenu.noteId)
    if (!note) return

    // We need the full note for content. If it's the active note, use that.
    // Otherwise create a simple copy from list data.
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    if (activeNote && activeNote.id === contextMenu.noteId) {
      // Full content available
      const newNote = {
        ...activeNote,
        id,
        title: `Copy of ${activeNote.title}`,
        createdAt: now,
        updatedAt: now
      }
      await saveNote(newNote)
      // Reload notes to show the duplicate
      await useNebulaStore.getState().loadNotes()
      selectNote(id)
    } else {
      // Only list data available -- create with title copy
      await createNote()
      // Update the just-created note's title
      const createdNote = useNebulaStore.getState().activeNote
      if (createdNote) {
        await saveNote({
          ...createdNote,
          title: `Copy of ${note.title}`,
          updatedAt: now
        })
      }
    }
  }, [contextMenu.noteId, notes, activeNote, saveNote, selectNote, createNote])

  // Delete handlers
  const handleDeleteRequest = useCallback(
    (noteId: string, noteTitle: string) => {
      setDeleteDialog({ isOpen: true, noteId, noteTitle })
      // Close context menu if open
      setContextMenu((prev) => ({ ...prev, isOpen: false }))
    },
    []
  )

  const handleDeleteConfirm = useCallback(() => {
    if (deleteDialog.noteId) {
      deleteNote(deleteDialog.noteId)
    }
    setDeleteDialog({ isOpen: false, noteId: '', noteTitle: '' })
  }, [deleteDialog.noteId, deleteNote])

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({ isOpen: false, noteId: '', noteTitle: '' })
  }, [])

  // Split notes into pinned and unpinned
  const pinnedNotes = notes.filter((n) => n.pinned)
  const unpinnedNotes = notes.filter((n) => !n.pinned)
  const hasPinnedNotes = pinnedNotes.length > 0

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header with New Note button */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
          Notes
        </span>
        <button
          type="button"
          onClick={() => {
            createNote().then(() => {
              window.dispatchEvent(new CustomEvent('nebula:focus-title'))
            })
          }}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-text-secondary transition-colors hover:bg-accent/15 hover:text-accent"
          title="New Note (Cmd+N)"
        >
          <Plus size={14} />
          <span className="text-[11px]">New Note</span>
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
              Press Cmd+N to create one
            </p>
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {hasPinnedNotes && (
              <>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-medium text-text-secondary/40 uppercase tracking-wider">
                    Pinned
                  </span>
                </div>
                {pinnedNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    isActive={activeNoteId === note.id}
                    onSelect={selectNote}
                    onContextMenu={handleContextMenu}
                    onTogglePin={togglePin}
                    onDeleteRequest={handleDeleteRequest}
                  />
                ))}
              </>
            )}

            {/* Unpinned section */}
            {hasPinnedNotes && unpinnedNotes.length > 0 && (
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-medium text-text-secondary/40 uppercase tracking-wider">
                  Notes
                </span>
              </div>
            )}
            {unpinnedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isActive={activeNoteId === note.id}
                onSelect={selectNote}
                onContextMenu={handleContextMenu}
                onTogglePin={togglePin}
                onDeleteRequest={handleDeleteRequest}
              />
            ))}
          </>
        )}
      </div>

      {/* Context menu */}
      <NoteContextMenu
        position={contextMenu.position}
        noteId={contextMenu.noteId}
        isPinned={contextMenu.isPinned}
        isOpen={contextMenu.isOpen}
        onClose={handleCloseContextMenu}
        onPin={handlePin}
        onDuplicate={handleDuplicate}
        onDelete={() => {
          const note = notes.find((n) => n.id === contextMenu.noteId)
          if (note) {
            handleDeleteRequest(note.id, note.title)
          }
        }}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        noteTitle={deleteDialog.noteTitle}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}

// ── Note item component ────────────────────────────────────────────────

interface NoteItemProps {
  note: {
    id: string
    title: string
    summary: string | null
    pinned: boolean
    hasDrawing: boolean
    contentPreview: string | null
    updatedAt: string
  }
  isActive: boolean
  onSelect: (id: string) => void
  onContextMenu: (e: React.MouseEvent, noteId: string, isPinned: boolean) => void
  onTogglePin: (noteId: string) => void
  onDeleteRequest: (noteId: string, noteTitle: string) => void
}

function NoteItem({
  note,
  isActive,
  onSelect,
  onContextMenu,
  onTogglePin,
  onDeleteRequest
}: NoteItemProps): React.JSX.Element {
  // Content to show as preview: prefer contentPreview, fall back to summary
  const previewText = note.contentPreview || note.summary || ''

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(note.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(note.id)
      }}
      onContextMenu={(e) => onContextMenu(e, note.id, note.pinned)}
      className={`group relative flex w-full cursor-pointer items-start px-3 py-2.5 text-left transition-all ${
        isActive
          ? 'border-l-2 border-accent bg-accent/10'
          : 'border-l-2 border-transparent hover:bg-surface-elevated/50'
      }`}
    >
      <div className="min-w-0 flex-1">
        {/* Title line */}
        <div className="flex items-center gap-1.5">
          <span
            className={`truncate text-sm font-medium ${
              isActive ? 'text-text-primary' : 'text-text-primary/80'
            }`}
          >
            {note.title || 'Untitled'}
          </span>
          {note.summary && (
            <Sparkles size={10} className="shrink-0 text-accent/60" title="AI summarized" />
          )}
        </div>

        {/* Content preview (2 lines) */}
        {previewText && (
          <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary/60 leading-relaxed">
            {previewText}
          </p>
        )}

        {/* Timestamp + drawing indicator */}
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] text-text-secondary/40">
            {relativeTime(note.updatedAt)}
          </span>
          {note.hasDrawing && (
            <Pencil size={9} className="text-text-secondary/40" title="Has drawing" />
          )}
        </div>
      </div>

      {/* Hover actions: pin icon (top-right) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onTogglePin(note.id)
        }}
        className={`absolute right-2 top-2 shrink-0 rounded p-0.5 transition-all ${
          note.pinned
            ? 'text-accent opacity-100'
            : 'text-text-secondary opacity-0 hover:text-accent group-hover:opacity-100'
        }`}
        title={note.pinned ? 'Unpin' : 'Pin'}
      >
        <Pin size={12} className={note.pinned ? 'fill-current' : ''} />
      </button>

      {/* Hover actions: trash icon (bottom-right) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDeleteRequest(note.id, note.title)
        }}
        className="absolute right-2 bottom-2 shrink-0 rounded p-0.5 text-text-secondary opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
        title="Delete note"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
