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
      className="fixed z-50 min-w-[160px] rounded-xl bg-secondary/80 backdrop-blur-xl border border-white/[0.08] shadow-lg py-1"
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 hover:bg-white/[0.06] transition-colors rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer"
        onClick={() => {
          onPin()
          onClose()
        }}
      >
        <Pin size={14} className={isPinned ? 'text-primary' : 'text-muted-foreground'} />
        {isPinned ? 'Unpin' : 'Pin'}
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 hover:bg-white/[0.06] transition-colors rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer"
        onClick={() => {
          onDuplicate()
          onClose()
        }}
      >
        <Copy size={14} className="text-muted-foreground" />
        Duplicate
      </button>
      <div className="my-1 border-t border-white/[0.06]" />
      <button
        type="button"
        className="flex w-full items-center gap-2 hover:bg-white/[0.06] transition-colors rounded-lg px-3 py-2 text-sm text-red-400 cursor-pointer"
        onClick={() => {
          onDelete()
          onClose()
        }}
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  )
}
