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
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Extension, mergeAttributes } from '@tiptap/core'
import { Sparkles, Plus, X, Table as TableIcon, Hash, ClipboardCopy, FileText, Check, FileDown, Loader2 } from 'lucide-react'
import { DOMSerializer } from '@tiptap/pm/model'
import { lowlight } from '../../lib/lowlight-setup'
import CodeBlockControls from './CodeBlockControls'
import type { NoteTag } from '../../types/nebula'
import { useNebulaStore } from '../../stores/nebula-store'
import { useSettingsStore } from '../../stores/settings-store'
import { tiptapToMarkdown, tiptapToPlainText } from './tiptap-to-markdown'
import { renderAllMermaidBlocks } from '../../lib/mermaid-to-png'
import FloatingToolbar from './FloatingToolbar'
import LinkDialog from './LinkDialog'
import TableControls from './TableControls'
import TranscriptionBlock from './TranscriptionBlock'

// ── Constants ────────────────────────────────────────────────────────

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

/** Stable empty array to avoid Zustand re-render loops from `?? []` in selectors. */
const EMPTY_SEGMENTS: { speaker: string; text: string; start?: number; end?: number }[] = []

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
  // IMPORTANT: Use a stable constant for the fallback to avoid Zustand re-render loop.
  // `?? []` creates a new array reference each call → Object.is fails → infinite re-renders.
  const transcriptionSegments = useNebulaStore((s) => s.transcriptionSegments[noteId]) ?? EMPTY_SEGMENTS

  // Line numbers toggle (persisted global setting)
  const showLineNumbers = useSettingsStore((s) => s.getSetting('plugins.nebula.showLineNumbers')) as boolean | undefined
  const lineNumbersEnabled = showLineNumbers === true

  // Copy feedback state
  const [copiedMode, setCopiedMode] = useState<null | 'raw' | 'markdown'>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

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
        heading: { levels: [1, 2, 3] },
        codeBlock: false // Replaced by CodeBlockLowlight for syntax highlighting
      }),
      CodeBlockLowlight.extend({
        renderHTML({ node, HTMLAttributes }) {
          return [
            'pre',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
              'data-language': node.attrs.language || 'plaintext'
            }),
            ['code', { class: `language-${node.attrs.language || 'plaintext'}` }, 0]
          ]
        },
        addKeyboardShortcuts() {
          return {
            ...this.parent?.(),
            Tab: () => {
              if (this.editor.isActive('codeBlock')) {
                const { state } = this.editor
                const { from, to } = state.selection
                this.editor.view.dispatch(state.tr.insertText('  ', from, to))
                return true
              }
              return false
            },
            'Shift-Tab': () => {
              if (this.editor.isActive('codeBlock')) {
                const { state } = this.editor
                const { $from } = state.selection
                const blockStart = $from.start()
                const posInBlock = $from.pos - blockStart
                const fullText = $from.parent.textContent
                const lastNL = fullText.lastIndexOf('\n', posInBlock - 1)
                const lineStart = lastNL === -1 ? 0 : lastNL + 1
                const lineText = fullText.substring(lineStart)
                let spaces = 0
                for (let i = 0; i < Math.min(2, lineText.length); i++) {
                  if (lineText[i] === ' ') spaces++
                  else break
                }
                if (spaces > 0) {
                  const delFrom = blockStart + lineStart
                  this.editor.view.dispatch(state.tr.delete(delFrom, delFrom + spaces))
                }
                return true
              }
              return false
            }
          }
        }
      }).configure({
        lowlight,
        defaultLanguage: 'plaintext',
        HTMLAttributes: { class: 'hljs' }
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
      handleDOMEvents: {
        copy: (view, event) => {
          // Intercept copy to provide well-formatted plain text alongside HTML
          const { state } = view
          if (state.selection.empty) return false
          const slice = state.selection.content()
          // Get HTML via DOMSerializer (Tiptap default behavior)
          const serializer = DOMSerializer.fromSchema(state.schema)
          const div = document.createElement('div')
          const fragment = serializer.serializeFragment(slice.content)
          div.appendChild(fragment)
          const html = div.innerHTML
          // Build a Tiptap-like JSON from slice then convert to plain text
          const tempDoc = { type: 'doc', content: slice.content.toJSON() }
          const plainText = tiptapToPlainText(tempDoc)
          event.clipboardData?.clearData()
          event.clipboardData?.setData('text/html', html)
          event.clipboardData?.setData('text/plain', plainText)
          event.preventDefault()
          return true
        },
        cut: (view, event) => {
          const { state } = view
          if (state.selection.empty) return false
          const slice = state.selection.content()
          const serializer = DOMSerializer.fromSchema(state.schema)
          const div = document.createElement('div')
          const fragment = serializer.serializeFragment(slice.content)
          div.appendChild(fragment)
          const html = div.innerHTML
          const tempDoc = { type: 'doc', content: slice.content.toJSON() }
          const plainText = tiptapToPlainText(tempDoc)
          event.clipboardData?.clearData()
          event.clipboardData?.setData('text/html', html)
          event.clipboardData?.setData('text/plain', plainText)
          // Delete the selection
          view.dispatch(state.tr.deleteSelection().scrollIntoView())
          event.preventDefault()
          return true
        }
      },
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

  // Content sync is handled by key={noteId} on <NoteEditor> in NebulaView.
  // The key forces a full remount when switching notes, so useEditor receives
  // the correct initial content and no manual setContent is needed.
  // (A manual setContent + JSON comparison loop caused "Maximum update depth
  // exceeded" because TipTap normalizes empty docs differently from the prop.)

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

  // Copy full note as formatted plain text (preserving code blocks with backticks)
  const handleCopyRaw = useCallback(async () => {
    if (!editor) return
    const doc = editor.getJSON()
    const text = tiptapToPlainText(doc)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedMode('raw')
    setTimeout(() => setCopiedMode(null), 2000)
  }, [editor])

  // Copy full note as markdown
  const handleCopyMarkdown = useCallback(async () => {
    if (!editor) return
    const doc = editor.getJSON()
    const md = tiptapToMarkdown(doc)
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = md
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedMode('markdown')
    setTimeout(() => setCopiedMode(null), 2000)
  }, [editor])

  // Export note as PDF
  const handleExportPdf = useCallback(async () => {
    if (!editor || isExportingPdf) return
    setIsExportingPdf(true)
    try {
      const doc = editor.getJSON()
      const md = tiptapToMarkdown(doc)
      // Pre-render mermaid diagrams to PNG for embedding in PDF
      const mermaidImages = await renderAllMermaidBlocks(md)
      await window.api.textcraft.exportPdf({
        markdown: md,
        title: title || 'Untitled',
        mermaidImages: Object.keys(mermaidImages).length > 0 ? mermaidImages : undefined
      })
    } finally {
      setIsExportingPdf(false)
    }
  }, [editor, title, isExportingPdf])

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
            {/* Raw Copy */}
            <button
              type="button"
              onClick={() => void handleCopyRaw()}
              className={`p-1 rounded transition-colors ${copiedMode === 'raw' ? 'text-green-400' : 'text-text-secondary/40 hover:text-text-secondary'}`}
              title="Copy as plain text"
            >
              {copiedMode === 'raw' ? <Check size={13} /> : <ClipboardCopy size={13} />}
            </button>
            {/* Copy Markdown */}
            <button
              type="button"
              onClick={() => void handleCopyMarkdown()}
              className={`p-1 rounded transition-colors ${copiedMode === 'markdown' ? 'text-green-400' : 'text-text-secondary/40 hover:text-text-secondary'}`}
              title="Copy as markdown"
            >
              {copiedMode === 'markdown' ? <Check size={13} /> : <FileText size={13} />}
            </button>
            {/* Export PDF */}
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={isExportingPdf}
              className="p-1 rounded transition-colors text-text-secondary/40 hover:text-text-secondary disabled:opacity-50"
              title="Export as PDF"
            >
              {isExportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            </button>
            {/* Separator */}
            <div className="h-3 w-px bg-border/30" />
            {/* Line numbers toggle */}
            <button
              type="button"
              onClick={() => useSettingsStore.getState().setSetting('plugins.nebula.showLineNumbers', !lineNumbersEnabled)}
              className={`p-1 rounded transition-colors ${lineNumbersEnabled ? 'text-accent bg-accent/10' : 'text-text-secondary/40 hover:text-text-secondary'}`}
              title={lineNumbersEnabled ? 'Hide line numbers' : 'Show line numbers'}
            >
              <Hash size={13} />
            </button>
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
              className="w-20 rounded-full border border-border/50 bg-transparent px-2 py-0.5 text-xs text-text-primary outline-none placeholder:text-text-secondary/40 focus:border-accent"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowTagInput(true)}
              className="flex items-center gap-0.5 rounded-full border border-dashed border-border/50 px-1.5 py-0.5 text-[10px] text-text-secondary/50 transition-colors hover:border-accent/40 hover:text-accent/60"
            >
              <Plus size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Table controls (shown when cursor is in a table) */}
      {editor && <TableControls editor={editor} />}

      {/* Code block controls (shown when cursor is in a code block) */}
      {editor && <CodeBlockControls editor={editor} />}

      {/* Insert table button (subtle, below title/tags area) */}
      {editor && !editor.isActive('table') && (
        <div className="flex items-center border-b border-border/50 px-4 py-1">
          <button
            type="button"
            onClick={handleInsertTable}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-text-secondary/40 transition-colors hover:bg-surface-elevated/50 hover:text-text-secondary"
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
          className={`nebula-editor max-w-none px-4 py-3${lineNumbersEnabled ? ' nebula-line-numbers' : ''}`}
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
