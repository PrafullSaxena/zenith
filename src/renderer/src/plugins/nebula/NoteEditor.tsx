/**
 * NoteEditor -- Tiptap rich text editor with formatting toolbar for Nebula notes.
 *
 * Features:
 *  - Title input with placeholder
 *  - Toolbar: Bold, Italic, H1, H2, H3, Bullet List, Ordered List, Code Block
 *  - ProseMirror editor via Tiptap useEditor with StarterKit + Placeholder
 *  - JSON content persistence via onUpdate callback
 *  - Content sync when switching between notes
 */

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import VoiceRecorder from './VoiceRecorder'

interface NoteEditorProps {
  content: object | null
  onUpdate: (json: object) => void
  onTitleChange: (title: string) => void
  title: string
}

export default function NoteEditor({
  content,
  onUpdate,
  onTitleChange,
  title
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
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled"
        className="w-full border-none bg-transparent px-4 pt-4 pb-1 text-2xl font-bold text-text-primary outline-none placeholder:text-text-secondary/50"
      />

      {/* Toolbar */}
      <div className="flex gap-1 border-b border-border bg-surface px-3 py-1.5">
        <ToolbarButton
          label="B"
          isActive={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          bold
        />
        <ToolbarButton
          label="I"
          isActive={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          italic
        />
        <div className="mx-1 w-px bg-border" />
        <ToolbarButton
          label="H1"
          isActive={editor?.isActive('heading', { level: 1 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          label="H2"
          isActive={editor?.isActive('heading', { level: 2 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="H3"
          isActive={editor?.isActive('heading', { level: 3 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <div className="mx-1 w-px bg-border" />
        <ToolbarButton
          label="UL"
          isActive={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="OL"
          isActive={editor?.isActive('orderedList') ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="<>"
          isActive={editor?.isActive('codeBlock') ?? false}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
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
  label,
  isActive,
  onClick,
  bold,
  italic
}: {
  label: string
  isActive: boolean
  onClick: () => void
  bold?: boolean
  italic?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-0.5 text-xs transition-colors ${
        isActive
          ? 'bg-accent/15 text-accent'
          : 'text-text-secondary hover:text-text-primary'
      } ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''}`}
    >
      {label}
    </button>
  )
}
