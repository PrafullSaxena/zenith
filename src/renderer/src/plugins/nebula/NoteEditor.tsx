/**
 * NoteEditor -- Tiptap rich text editor with formatting toolbar for Nebula notes.
 *
 * Features:
 *  - Title input with placeholder
 *  - Toolbar with lucide icons: Bold, Italic, H1, H2, H3, Bullet List, Ordered List, Code Block
 *  - ProseMirror editor via Tiptap useEditor with StarterKit + Placeholder
 *  - JSON content persistence via onUpdate callback
 *  - Content sync when switching between notes
 */

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code2,
  Sparkles
} from 'lucide-react'
import VoiceRecorder from './VoiceRecorder'

interface NoteEditorProps {
  content: object | null
  onUpdate: (json: object) => void
  onTitleChange: (title: string) => void
  title: string
  isSummarizing?: boolean
}

export default function NoteEditor({
  content,
  onUpdate,
  onTitleChange,
  title,
  isSummarizing
}: NoteEditorProps): React.JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Placeholder.configure({
        placeholder: 'Start writing...'
      })
    ],
    content: content ?? undefined,
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getJSON())
    }
  })

  // Sync editor content when switching notes (content prop changes)
  useEffect(() => {
    if (!editor || !content) return

    // Compare to avoid unnecessary re-renders
    const currentJson = JSON.stringify(editor.getJSON())
    const newJson = JSON.stringify(content)
    if (currentJson !== newJson) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Title input */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-1">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="flex-1 border-none bg-transparent text-xl font-bold text-text-primary outline-none placeholder:text-text-secondary/40"
        />
        {isSummarizing && (
          <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] text-accent">
            <Sparkles size={10} className="animate-pulse" />
            Summarizing...
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border bg-surface px-3 py-1">
        <ToolbarButton
          icon={<Bold size={14} />}
          isActive={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold"
        />
        <ToolbarButton
          icon={<Italic size={14} />}
          isActive={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic"
        />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          icon={<Heading1 size={14} />}
          isActive={editor?.isActive('heading', { level: 1 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        />
        <ToolbarButton
          icon={<Heading2 size={14} />}
          isActive={editor?.isActive('heading', { level: 2 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        />
        <ToolbarButton
          icon={<Heading3 size={14} />}
          isActive={editor?.isActive('heading', { level: 3 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          icon={<List size={14} />}
          isActive={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        />
        <ToolbarButton
          icon={<ListOrdered size={14} />}
          isActive={editor?.isActive('orderedList') ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Ordered List"
        />
        <ToolbarButton
          icon={<Code2 size={14} />}
          isActive={editor?.isActive('codeBlock') ?? false}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        />
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="nebula-editor max-w-none px-4 py-3"
        />
      </div>

      {/* Voice recorder */}
      <VoiceRecorder />
    </div>
  )
}

// ── Toolbar button ──────────────────────────────────────────────────

function ToolbarButton({
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
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        isActive
          ? 'bg-accent/15 text-accent'
          : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
      }`}
    >
      {icon}
    </button>
  )
}
