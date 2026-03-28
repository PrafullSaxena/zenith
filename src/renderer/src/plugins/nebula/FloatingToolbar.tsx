/**
 * FloatingToolbar -- BubbleMenu wrapper with formatting buttons for Nebula editor.
 *
 * Appears near selected text with Bold, Italic, Strikethrough, Code,
 * H1, H2, H3, BulletList, OrderedList, Blockquote, and Link buttons.
 *
 * IMPORTANT: BubbleMenu MUST be imported from '@tiptap/react/menus' (Tiptap v3).
 * Importing from '@tiptap/react' causes "tippy is not a function" error.
 */

import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link
} from 'lucide-react'
import { Card } from '@renderer/components/ui/card'
import { motion } from 'framer-motion'

interface FloatingToolbarProps {
  editor: Editor
  onLinkClick: () => void
}

export default function FloatingToolbar({
  editor,
  onLinkClick
}: FloatingToolbarProps): React.JSX.Element {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state }) => !state.selection.empty && !editor.isActive('image')}
    >
      <Card className="flex items-center gap-0.5 rounded-xl px-1.5 py-1 shadow-lg !bg-secondary/95 backdrop-blur-xl !border-border">
        <ToolbarBtn
          icon={<Bold size={14} />}
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Cmd+B)"
        />
        <ToolbarBtn
          icon={<Italic size={14} />}
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Cmd+I)"
        />
        <ToolbarBtn
          icon={<Strikethrough size={14} />}
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        />
        <ToolbarBtn
          icon={<Code size={14} />}
          isActive={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Code (Cmd+E)"
        />

        <div className="mx-0.5 h-4 w-px bg-border" />

        <ToolbarBtn
          icon={<Heading1 size={14} />}
          isActive={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1 (Cmd+Shift+1)"
        />
        <ToolbarBtn
          icon={<Heading2 size={14} />}
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2 (Cmd+Shift+2)"
        />
        <ToolbarBtn
          icon={<Heading3 size={14} />}
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3 (Cmd+Shift+3)"
        />

        <div className="mx-0.5 h-4 w-px bg-border" />

        <ToolbarBtn
          icon={<List size={14} />}
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List (Cmd+Shift+8)"
        />
        <ToolbarBtn
          icon={<ListOrdered size={14} />}
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered List (Cmd+Shift+7)"
        />
        <ToolbarBtn
          icon={<Quote size={14} />}
          isActive={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        />

        <div className="mx-0.5 h-4 w-px bg-border" />

        <ToolbarBtn
          icon={<Link size={14} />}
          isActive={editor.isActive('link')}
          onClick={onLinkClick}
          title="Link (Cmd+K)"
        />
      </Card>
    </BubbleMenu>
  )
}

// ── Toolbar button ──────────────────────────────────────────────────

function ToolbarBtn({
  icon,
  isActive,
  onClick,
  title
}: {
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
  title: string
}): React.JSX.Element {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer outline-none ${
        isActive
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:bg-white/[0.08] hover:text-foreground'
      }`}
    >
      {icon}
    </motion.button>
  )
}
