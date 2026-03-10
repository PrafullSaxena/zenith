/**
 * TableControls -- Floating toolbar for table management in the Nebula editor.
 *
 * Appears when the cursor is inside a table. Provides buttons for:
 * Insert Table, Add Row Above/Below, Add Column Left/Right,
 * Delete Row, Delete Column, Delete Table.
 *
 * Rendered as a conditional bar above the editor area (not a separate BubbleMenu)
 * to avoid conflicts with the FloatingToolbar BubbleMenu.
 */

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Plus,
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Table
} from 'lucide-react'

interface TableControlsProps {
  editor: Editor
}

export default function TableControls({ editor }: TableControlsProps): React.JSX.Element | null {
  // Force re-render on every editor transaction so isActive stays current.
  const [, setTick] = useState(0)
  useEffect(() => {
    const handler = (): void => setTick((t) => t + 1)
    editor.on('selectionUpdate', handler)
    editor.on('update', handler)
    return () => {
      editor.off('selectionUpdate', handler)
      editor.off('update', handler)
    }
  }, [editor])

  if (!editor.isActive('table')) return null

  return (
    <div className="flex items-center gap-0.5 border-t border-border bg-surface-elevated px-3 py-1">
      <span className="mr-2 flex items-center gap-1 text-[10px] font-medium text-text-secondary">
        <Table size={10} />
        Table
      </span>

      <CtrlBtn
        icon={<ArrowUp size={12} />}
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="Add Row Above"
      />
      <CtrlBtn
        icon={<ArrowDown size={12} />}
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Add Row Below"
      />
      <CtrlBtn
        icon={<ArrowLeft size={12} />}
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="Add Column Left"
      />
      <CtrlBtn
        icon={<ArrowRight size={12} />}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Add Column Right"
      />

      <div className="mx-1 h-3.5 w-px bg-border" />

      <CtrlBtn
        icon={<Minus size={12} />}
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Delete Row"
        variant="danger"
      />
      <CtrlBtn
        icon={
          <span className="flex items-center gap-0.5">
            <Minus size={10} className="rotate-90" />
          </span>
        }
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Delete Column"
        variant="danger"
      />
      <CtrlBtn
        icon={<Trash2 size={12} />}
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete Table"
        variant="danger"
      />
    </div>
  )
}

// ── Control button ──────────────────────────────────────────────────

function CtrlBtn({
  icon,
  onClick,
  title,
  variant = 'default'
}: {
  icon: React.ReactNode
  onClick: () => void
  title: string
  variant?: 'default' | 'danger'
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
        variant === 'danger'
          ? 'text-text-secondary hover:bg-red-400/10 hover:text-red-400'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
      }`}
    >
      {icon}
    </button>
  )
}
