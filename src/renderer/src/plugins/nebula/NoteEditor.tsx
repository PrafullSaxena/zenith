/**
 * NoteEditor -- Notion-style rich text editor for Nebula notes.
 *
 * Features:
 *  - Seamless inline title (large borderless text, "Untitled" placeholder)
 *  - Floating toolbar via BubbleMenu on text selection (no fixed toolbar)
 *  - Auto-save status dot (gray=synced, orange=unsaved, green=just-saved)
 *  - Metadata line: relative edited time + word count
 *  - Topic tag pills with add-tag support
 *  - Rich extensions: Link (Cmd+K), Image (paste/drag, 5MB limit), Table
 *  - Custom keyboard shortcuts: Cmd+Shift+1/2/3 for headings, Cmd+K for links
 *  - VoiceRecorder removed (relocated to NebulaView as FAB in Plan 04)
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { Extension } from '@tiptap/core'
import { Sparkles, Plus, X, Table as TableIcon } from 'lucide-react'
import type { NoteTag } from '../../types/nebula'
import { useNebulaStore } from '../../stores/nebula-store'
import FloatingToolbar from './FloatingToolbar'
import LinkDialog from './LinkDialog'
import TableControls from './TableControls'
import TranscriptionBlock from './TranscriptionBlock'

// ── Constants ────────────────────────────────────────────────────────

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

// ── Props ────────────────────────────────────────────────────────────

interface NoteEditorProps {
  noteId: string
  content: object | null
  onUpdate: (json: object) => void
  onBlur?: () => void
  onTitleChange: (title: string) => void
  title: string
  tags: NoteTag[]
  onTagsChange: (tags: NoteTag[]) => void
  updatedAt: string
  isSummarizing?: boolean
  isSaving?: boolean
  showSaved?: boolean
}

// ── Relative time helper ─────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Edited just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Edited ${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Edited ${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `Edited ${diffDay}d ago`
  return `Edited ${new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// ── Component ────────────────────────────────────────────────────────

export default function NoteEditor({
  noteId,
  content,
  onUpdate,
  onBlur,
  onTitleChange,
  title,
  tags,
  onTagsChange,
  updatedAt,
  isSummarizing,
  isSaving,
  showSaved
}: NoteEditorProps): React.JSX.Element {
  // Transcription segments for inline block display
  const transcriptionSegments = useNebulaStore((s) => s.transcriptionSegments[noteId] ?? [])
  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkPosition, setLinkPosition] = useState({ x: 0, y: 0 })

  // Tag input state
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagInputValue, setTagInputValue] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  // Save state tracking for auto-save dot
  type SaveState = 'synced' | 'unsaved' | 'saving' | 'just-saved'
  const [saveState, setSaveState] = useState<SaveState>('synced')
  const justSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derive save state from props
  useEffect(() => {
    if (isSaving) {
      setSaveState('saving')
    } else if (showSaved) {
      setSaveState('just-saved')
      if (justSavedTimer.current) clearTimeout(justSavedTimer.current)
      justSavedTimer.current = setTimeout(() => setSaveState('synced'), 1500)
    }
    return () => {
      if (justSavedTimer.current) clearTimeout(justSavedTimer.current)
    }
  }, [isSaving, showSaved])

  // Open link dialog callback for FloatingToolbar and keyboard shortcut
  const openLinkDialog = useCallback(() => {
    // Position near the cursor selection
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setLinkPosition({ x: rect.left, y: rect.bottom + 8 })
    } else {
      setLinkPosition({ x: 200, y: 200 })
    }
    setLinkDialogOpen(true)
  }, [])

  const closeLinkDialog = useCallback(() => {
    setLinkDialogOpen(false)
  }, [])

  // Custom keyboard shortcuts extension
  const CustomKeyboardShortcuts = useMemo(
    () =>
      Extension.create({
        name: 'customKeyboardShortcuts',
        addKeyboardShortcuts() {
          return {
            'Mod-Shift-1': () => this.editor.commands.toggleHeading({ level: 1 }),
            'Mod-Shift-2': () => this.editor.commands.toggleHeading({ level: 2 }),
            'Mod-Shift-3': () => this.editor.commands.toggleHeading({ level: 3 }),
            'Mod-k': () => {
              openLinkDialog()
              return true
            }
          }
        }
      }),
    [openLinkDialog]
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Placeholder.configure({
        placeholder: 'Start writing...'
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { class: 'text-accent underline cursor-pointer' }
      }),
      Image.configure({
        allowBase64: true,
        inline: false
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CustomKeyboardShortcuts
    ],
    content: content ?? undefined,
    onUpdate: ({ editor: ed }) => {
      setSaveState('unsaved')
      onUpdate(ed.getJSON())
    },
    onBlur: () => {
      onBlur?.()
    },
    editorProps: {
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            if (file.size > MAX_IMAGE_SIZE) {
              console.warn(`[NoteEditor] Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`)
              return true
            }
          }
        }
        return false
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files
        if (!files || files.length === 0) return false
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            if (file.size > MAX_IMAGE_SIZE) {
              console.warn(`[NoteEditor] Pasted image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`)
              return true
            }
          }
        }
        return false
      }
    }
  })

  // Sync editor content when switching notes (content prop changes)
  useEffect(() => {
    if (!editor || !content) return

    const currentJson = JSON.stringify(editor.getJSON())
    const newJson = JSON.stringify(content)
    if (currentJson !== newJson) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Word count from editor content
  const wordCount = useMemo(() => {
    if (!editor) return 0
    const text = editor.state.doc.textContent
    if (!text.trim()) return 0
    return text.trim().split(/\s+/).length
  }, [editor, editor?.state.doc.textContent])

  // Title Enter key -> focus editor
  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        editor?.commands.focus()
      }
    },
    [editor]
  )

  // Tag management
  const handleAddTag = useCallback(() => {
    const label = tagInputValue.trim()
    if (!label) return
    // Avoid duplicates
    if (tags.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      setTagInputValue('')
      setShowTagInput(false)
      return
    }
    const newTag: NoteTag = {
      id: `tag-${Date.now()}`,
      label,
      color: TAG_COLORS[tags.length % TAG_COLORS.length]
    }
    onTagsChange([...tags, newTag])
    setTagInputValue('')
    setShowTagInput(false)
  }, [tagInputValue, tags, onTagsChange])

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      onTagsChange(tags.filter((t) => t.id !== tagId))
    },
    [tags, onTagsChange]
  )

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      } else if (e.key === 'Escape') {
        setShowTagInput(false)
        setTagInputValue('')
      }
    },
    [handleAddTag]
  )

  useEffect(() => {
    if (showTagInput) {
      tagInputRef.current?.focus()
    }
  }, [showTagInput])

  // Insert table
  const handleInsertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  // Save dot color
  const dotClass = (() => {
    switch (saveState) {
      case 'unsaved':
        return 'bg-orange-400'
      case 'saving':
        return 'bg-orange-400 animate-pulse'
      case 'just-saved':
        return 'bg-green-400 animate-pulse'
      case 'synced':
      default:
        return 'bg-text-secondary/30'
    }
  })()

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Title area with auto-save dot */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            className="flex-1 border-none bg-transparent text-2xl font-bold text-text-primary outline-none placeholder:text-text-secondary/40"
          />
          <div className="flex items-center gap-2">
            {/* Auto-save dot */}
            <span
              className={`inline-block h-2 w-2 rounded-full transition-colors duration-300 ${dotClass}`}
              title={
                saveState === 'unsaved'
                  ? 'Unsaved changes'
                  : saveState === 'saving'
                    ? 'Saving...'
                    : saveState === 'just-saved'
                      ? 'Saved'
                      : 'All changes saved'
              }
            />
            {/* Summarizing indicator */}
            {isSummarizing && (
              <div className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                <Sparkles size={10} className="animate-pulse" />
                AI
              </div>
            )}
          </div>
        </div>

        {/* Metadata line */}
        <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary/60">
          <span>{relativeTime(updatedAt)}</span>
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        </div>

        {/* Topic tags */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pb-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"
            >
              {tag.label}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="text-accent/50 hover:text-accent"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {showTagInput ? (
            <input
              ref={tagInputRef}
              type="text"
              value={tagInputValue}
              onChange={(e) => setTagInputValue(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => {
                if (tagInputValue.trim()) handleAddTag()
                else {
                  setShowTagInput(false)
                  setTagInputValue('')
                }
              }}
              placeholder="Add tag..."
              className="w-20 rounded-full border border-border bg-transparent px-2 py-0.5 text-xs text-text-primary outline-none placeholder:text-text-secondary/40 focus:border-accent"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowTagInput(true)}
              className="flex items-center gap-0.5 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[10px] text-text-secondary/50 transition-colors hover:border-accent/40 hover:text-accent/60"
            >
              <Plus size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Table controls (shown when cursor is in a table) */}
      {editor && <TableControls editor={editor} />}

      {/* Insert table button (subtle, below title/tags area) */}
      {editor && !editor.isActive('table') && (
        <div className="flex items-center border-b border-border px-4 py-1">
          <button
            type="button"
            onClick={handleInsertTable}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-text-secondary/40 transition-colors hover:bg-surface-elevated hover:text-text-secondary"
            title="Insert table"
          >
            <TableIcon size={10} />
            Table
          </button>
        </div>
      )}

      {/* Editor content area */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="nebula-editor max-w-none px-4 py-3"
        />

        {/* Transcription block -- shown when note has transcription data */}
        {transcriptionSegments.length > 0 && (
          <TranscriptionBlock
            noteId={noteId}
            segments={transcriptionSegments}
          />
        )}
      </div>

      {/* Floating toolbar (BubbleMenu) */}
      {editor && (
        <FloatingToolbar editor={editor} onLinkClick={openLinkDialog} />
      )}

      {/* Link dialog */}
      {editor && (
        <LinkDialog
          editor={editor}
          isOpen={linkDialogOpen}
          onClose={closeLinkDialog}
          position={linkPosition}
        />
      )}
    </div>
  )
}

// ── Tag color palette ────────────────────────────────────────────────

const TAG_COLORS = [
  '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa',
  '#34d399', '#fb923c', '#e879f9', '#22d3ee', '#f87171'
]
