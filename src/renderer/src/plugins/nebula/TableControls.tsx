/**
 * TableControls -- Inline toolbar buttons for table management in the Nebula editor.
 *
 * Renders beside the "Table" icon button. Shows action buttons (add/delete row/col/table)
 * only when the cursor is inside a table. Uses CSS transition for smooth appear/disappear
 * without any layout shift — the parent container height stays constant.
 */

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

interface TableControlsProps {
  editor: Editor
}

export default function TableControls({ editor }: TableControlsProps): React.JSX.Element {
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

  const isActive = editor.isActive('table')

  return (
    <div
      className={`flex items-center gap-0.5 overflow-hidden transition-all duration-200 ${
        isActive ? 'ml-1 max-w-[300px] opacity-100' : 'max-w-0 opacity-0'
      }`}
    >
      <div className="mx-1 h-3 w-px bg-border/50" />

      <CtrlBtn
        icon={<ArrowUp size={10} />}
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="Add Row Above"
      />
      <CtrlBtn
        icon={<ArrowDown size={10} />}
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Add Row Below"
      />
      <CtrlBtn
        icon={<ArrowLeft size={10} />}
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="Add Column Left"
      />
      <CtrlBtn
        icon={<ArrowRight size={10} />}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Add Column Right"
      />

      <div className="mx-0.5 h-3 w-px bg-border/50" />

      <CtrlBtn
        icon={<Minus size={10} />}
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Delete Row"
        variant="destructive"
      />
      <CtrlBtn
        icon={<Minus size={10} className="rotate-90" />}
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Delete Column"
        variant="destructive"
      />
      <CtrlBtn
        icon={<Trash2 size={10} />}
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete Table"
        variant="destructive"
      />
    </div>
  )
}

function CtrlBtn({
  icon,
  onClick,
  title,
  variant = 'default'
}: {
  icon: React.ReactNode
  onClick: () => void
  title: string
  variant?: 'default' | 'destructive'
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
        variant === 'destructive'
          ? 'text-muted-foreground/50 hover:bg-red-400/10 hover:text-red-400'
          : 'text-muted-foreground/50 hover:bg-primary/10 hover:text-primary'
      }`}
    >
      {icon}
    </button>
  )
}
