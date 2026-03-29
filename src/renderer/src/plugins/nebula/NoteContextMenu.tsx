/**
 * NoteContextMenu -- Right-click context menu for note items.
 *
 * Appears at mouse coordinates with viewport edge detection.
 * Three items: Pin/Unpin, Duplicate, Delete.
 * Closes on outside click or Escape key.
 *
 * Migrated to Obsidian Glass design system with glass backdrop styling.
 */

import { useEffect, useRef } from 'react'
import { Pin, Copy, Trash2 } from 'lucide-react'

interface NoteContextMenuProps {
  position: { x: number; y: number }
  noteId: string
  isPinned: boolean
  isOpen: boolean
  onClose: () => void
  onPin: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const MENU_WIDTH = 160
const MENU_HEIGHT_APPROX = 120

export default function NoteContextMenu({
  position,
  isPinned,
  isOpen,
  onClose,
  onPin,
  onDuplicate,
  onDelete
}: NoteContextMenuProps): React.JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Viewport edge detection: flip if menu would go off-screen
  let x = position.x
  let y = position.y

  if (x + MENU_WIDTH > window.innerWidth) {
    x = position.x - MENU_WIDTH
  }
  if (y + MENU_HEIGHT_APPROX > window.innerHeight) {
    y = position.y - MENU_HEIGHT_APPROX
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-32 overflow-hidden rounded-xl border border-white/10 bg-popover/80 backdrop-blur-2xl p-1 text-popover-foreground shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        className="relative flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground"
        onClick={() => {
          onPin()
          onClose()
        }}
      >
        <Pin size={14} className="shrink-0 text-muted-foreground" />
        {isPinned ? 'Unpin Note' : 'Pin Note'}
      </button>

      <button
        type="button"
        className="relative flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground"
        onClick={() => {
          onDuplicate()
          onClose()
        }}
      >
        <Copy size={14} className="shrink-0 text-muted-foreground" />
        Duplicate
      </button>
      
      <div className="-mx-1 my-1 h-px bg-border" />
      
      <button
        type="button"
        className="relative flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors hover:bg-red-500/10 hover:text-red-400 focus:bg-red-500/10 focus:text-red-400 text-red-400/80"
        onClick={() => {
          onDelete()
          onClose()
        }}
      >
        <Trash2 size={14} className="shrink-0" />
        Delete Note
      </button>
    </div>
  )
}
