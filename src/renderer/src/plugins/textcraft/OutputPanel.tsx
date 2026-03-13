/**
 * OutputPanel -- Right panel of the TextCraft three-panel layout.
 *
 * Displays AI-streamed refinement output with markdown rendering,
 * copy modes (formatted markdown & clean plain text), PDF export,
 * and word/character count footer.
 *
 * Four states: empty (no session), streaming (live markdown + indicator),
 * complete (final markdown + copy buttons), error (red message).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Check, Sparkles, FileText, AlignLeft, Copy, FileDown, ChevronDown, ChevronRight, ChevronsUpDown, Loader2, BookOpen } from 'lucide-react'
import { useTextCraftStore } from '../../stores/textcraft-store'
import { renderAllMermaidBlocks } from '../../lib/mermaid-to-png'
import { markdownToTiptapJson } from '../../lib/markdown-to-tiptap'
import MarkdownRenderer from '../../components/MarkdownRenderer'

type CopiedMode = null | 'raw' | 'formatted'

/**
 * Writes text to the clipboard with a textarea fallback for Electron.
 */
async function writeClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

/**
 * Strips markdown syntax from text, producing clean plain text that
 * preserves newlines, indentation, and bullet structure.
 *
 * Handles: headers, bold, italic, strikethrough, inline code, code blocks,
 * links, images, blockquotes, horizontal rules, and list markers.
 */
function stripMarkdown(md: string): string {
  let text = md

  // Remove fenced code block markers (``` or ~~~) but keep content
  text = text.replace(/^```[\w-]*\n?/gm, '')
  text = text.replace(/^~~~[\w-]*\n?/gm, '')

  // Remove heading markers: ## Title → Title
  text = text.replace(/^#{1,6}\s+/gm, '')

  // Remove bold/italic markers: **text** / __text__ / *text* / _text_
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1')
  text = text.replace(/___(.+?)___/g, '$1')
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/__(.+?)__/g, '$1')
  text = text.replace(/\*(.+?)\*/g, '$1')
  text = text.replace(/_(.+?)_/g, '$1')

  // Remove strikethrough: ~~text~~ → text
  text = text.replace(/~~(.+?)~~/g, '$1')

  // Remove inline code backticks: `code` → code
  text = text.replace(/`(.+?)`/g, '$1')

  // Convert links: [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove images: ![alt](url) → alt
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')

  // Remove blockquote markers: > text → text
  text = text.replace(/^>\s?/gm, '')

  // Convert markdown list markers to plain bullets:  - item → • item, * item → • item
  text = text.replace(/^(\s*)[-*]\s+/gm, '$1• ')

  // Keep numbered lists as-is (1. item)

  // Remove horizontal rules (---, ***, ___)
  text = text.replace(/^[-*_]{3,}\s*$/gm, '')

  // Collapse 3+ consecutive blank lines to 2
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

// ── Collapsible section parser ───────────────────────────────────────

interface MarkdownSection {
  /** Heading text (empty for preamble content before first heading) */
  heading: string
  /** Heading level: 1 for #, 2 for ##, 3 for ### (0 for preamble) */
  level: number
  /** Raw markdown content under this heading (excluding the heading line) */
  content: string
}

/**
 * Splits markdown into sections based on H1/H2/H3 headings.
 * The first section may have level=0 if content precedes the first heading.
 */
function splitIntoSections(md: string): MarkdownSection[] {
  const sections: MarkdownSection[] = []
  const lines = md.split('\n')
  let current: MarkdownSection = { heading: '', level: 0, content: '' }

  for (const line of lines) {
    const h1 = line.match(/^# (.+)$/)
    const h2 = line.match(/^## (.+)$/)
    const h3 = line.match(/^### (.+)$/)

    if (h1 || h2 || h3) {
      // Save previous section if it has content
      if (current.heading || current.content.trim()) {
        sections.push({ ...current, content: current.content.trimEnd() })
      }
      current = {
        heading: h1 ? h1[1] : h2 ? h2[1] : h3![1],
        level: h1 ? 1 : h2 ? 2 : 3,
        content: ''
      }
    } else {
      current.content += (current.content ? '\n' : '') + line
    }
  }
  // Push the last section
  if (current.heading || current.content.trim()) {
    sections.push({ ...current, content: current.content.trimEnd() })
  }

  return sections
}

// ────────────────────────────────────────────────────────────────────

export default function OutputPanel(): React.JSX.Element {
  const session = useTextCraftStore((s) => s.session)
  const error = useTextCraftStore((s) => s.error)
  const [copiedMode, setCopiedMode] = useState<CopiedMode>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set())
  const contentRef = useRef<HTMLDivElement>(null)

  const rawText = session?.rawText ?? ''
  const hasOutput = rawText.length > 0
  const isStreaming = session?.status === 'streaming'
  const isComplete = session?.status === 'complete'
  const isError = session?.status === 'error'
  const isEmpty = !session || (!hasOutput && session.status === 'idle')

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0
  const charCount = rawText.length

  // Parse sections for collapsible view (only when complete)
  const sections = useMemo(() => splitIntoSections(rawText), [rawText])
  const hasSections = isComplete && sections.filter((s) => s.level > 0).length > 1

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [rawText, isStreaming])

  // Reset feedback + expand all sections when output changes
  useEffect(() => {
    setCopiedMode(null)
    setCollapsedSections(new Set())
  }, [rawText])

  const toggleSection = useCallback((index: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const allCollapsed = hasSections && sections.filter((s) => s.level > 0).every((_, i) => {
    const sectionIndex = sections.findIndex((s) => s.level > 0) + i
    return collapsedSections.has(sectionIndex)
  })

  const toggleAll = useCallback(() => {
    if (allCollapsed) {
      setCollapsedSections(new Set())
    } else {
      const all = new Set<number>()
      sections.forEach((s, i) => { if (s.level > 0) all.add(i) })
      setCollapsedSections(all)
    }
  }, [allCollapsed, sections])

  /** Copy markdown source (formatted with markdown syntax) */
  const handleCopyFormatted = useCallback(async (): Promise<void> => {
    if (!rawText) return
    await writeClipboard(rawText)
    setCopiedMode('formatted')
    setTimeout(() => setCopiedMode(null), 2000)
  }, [rawText])

  /** Copy clean plain text — no markdown characters, just text with structure */
  const handleCopyRaw = useCallback(async (): Promise<void> => {
    if (!rawText) return
    await writeClipboard(stripMarkdown(rawText))
    setCopiedMode('raw')
    setTimeout(() => setCopiedMode(null), 2000)
  }, [rawText])

  /** Export as PDF via native pdfmake (main process → save dialog → file) */
  const handleExportPDF = useCallback(async (): Promise<void> => {
    if (!rawText || isExporting) return
    setIsExporting(true)
    try {
      // Read PDF style to determine mermaid theme (light for colored/traditional, dark for pretty)
      const settings = await window.api.settings.getAll()
      const pdfStyle = (settings?.['general.pdfStyle'] as string) ?? 'colored'
      const lightMode = pdfStyle !== 'pretty'
      // Pre-render mermaid diagrams to PNG for embedding in PDF
      const mermaidImages = await renderAllMermaidBlocks(rawText, lightMode)
      await window.api.app.exportPdf({
        markdown: rawText,
        mermaidImages: Object.keys(mermaidImages).length > 0 ? mermaidImages : undefined
      })
    } finally {
      setIsExporting(false)
    }
  }, [rawText, isExporting])

  const [savedAsNote, setSavedAsNote] = useState(false)

  /** Save input + config + output as a new Nebula note */
  const handleSaveAsNote = useCallback(async (): Promise<void> => {
    if (!rawText || !session) return
    const opts = session.options
    const formatLabel = opts.format.charAt(0).toUpperCase() + opts.format.slice(1)
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const noteTitle = `TextCraft: ${formatLabel} — ${date}`

    // Build markdown with Input, Config, and Output sections
    const configLines = [
      `**Tones:** ${opts.tones.join(', ')}`,
      `**Format:** ${formatLabel}`,
      opts.customInstructions ? `**Instructions:** ${opts.customInstructions}` : ''
    ].filter(Boolean).join('\n')

    const fullMarkdown = [
      `## Input\n\n${session.inputText}`,
      `## Configuration\n\n${configLines}`,
      `## Output\n\n${rawText}`
    ].join('\n\n---\n\n')

    const tiptapContent = markdownToTiptapJson(fullMarkdown)

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const note = {
      id,
      title: noteTitle,
      content: tiptapContent,
      drawing: null,
      summary: null,
      topics: ['textcraft'],
      tags: [{ id: `tag-${Date.now()}`, label: 'TextCraft', color: '#4ade80' }],
      createdAt: now,
      updatedAt: now
    }

    try {
      await window.api.nebula.saveNote(note)
      setSavedAsNote(true)
      setTimeout(() => setSavedAsNote(false), 2000)
    } catch {
      // Nebula IPC not available
    }
  }, [rawText, session])

  const showActions = (isComplete || hasOutput) && !isStreaming

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Output
        </h2>

        {/* Action buttons -- visible when output is ready */}
        {showActions && (
          <div className="flex items-center gap-1">
            {/* Collapse/Expand All — only when multiple sections exist */}
            {hasSections && (
              <>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
                  title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
                >
                  <ChevronsUpDown size={13} />
                  <span>{allCollapsed ? 'Expand' : 'Collapse'}</span>
                </button>
                <div className="h-4 w-px bg-border/40 mx-0.5" />
              </>
            )}

            {/* Copy Raw (plain text) */}
            <button
              type="button"
              onClick={() => void handleCopyRaw()}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
              title="Copy plain text (no markdown, just clean text with newlines and bullets)"
            >
              {copiedMode === 'raw' ? (
                <Check size={13} className="text-success" />
              ) : (
                <AlignLeft size={13} />
              )}
              <span>{copiedMode === 'raw' ? 'Copied!' : 'Raw Text'}</span>
            </button>

            {/* Copy Formatted (markdown source) */}
            <button
              type="button"
              onClick={() => void handleCopyFormatted()}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
              title="Copy markdown source (with formatting syntax)"
            >
              {copiedMode === 'formatted' ? (
                <Check size={13} className="text-success" />
              ) : (
                <FileText size={13} />
              )}
              <span>{copiedMode === 'formatted' ? 'Copied!' : 'Markdown'}</span>
            </button>

            {/* Separator */}
            <div className="h-4 w-px bg-border/40 mx-0.5" />

            {/* Export as PDF */}
            <button
              type="button"
              onClick={() => void handleExportPDF()}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              title="Export as PDF (save to file)"
            >
              {isExporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileDown size={13} />
              )}
              <span>{isExporting ? 'Exporting…' : 'PDF'}</span>
            </button>

            {/* Separator */}
            <div className="h-4 w-px bg-border/40 mx-0.5" />

            {/* Save as Nebula note */}
            <button
              type="button"
              onClick={() => void handleSaveAsNote()}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
              title="Save as Nebula note (input + config + output)"
            >
              {savedAsNote ? (
                <Check size={13} className="text-success" />
              ) : (
                <BookOpen size={13} />
              )}
              <span>{savedAsNote ? 'Saved!' : 'Note'}</span>
            </button>
          </div>
        )}

        {/* Streaming indicator in header */}
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[11px] text-accent">
            <Copy size={12} className="animate-pulse" />
            Streaming...
          </span>
        )}
      </div>

      {/* Content area */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {/* Empty state */}
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center">
            <Sparkles size={32} className="text-text-secondary/30 mb-3" />
            <p className="text-sm text-text-secondary/50">Refined text will appear here</p>
          </div>
        )}

        {/* Streaming state — flat render, no collapsing */}
        {isStreaming && (
          <div className="p-4">
            {hasOutput && <MarkdownRenderer text={rawText} className="text-sm leading-relaxed" />}
            <span className="animate-pulse text-accent text-sm">Refining...</span>
          </div>
        )}

        {/* Complete state — collapsible sections */}
        {isComplete && hasOutput && (
          <div className="p-4">
            {hasSections ? (
              sections.map((section, idx) => {
                // Preamble (no heading) — always visible
                if (section.level === 0) {
                  return section.content.trim() ? (
                    <MarkdownRenderer key={idx} text={section.content} className="text-sm leading-relaxed" />
                  ) : null
                }

                const isCollapsed = collapsedSections.has(idx)
                const headingClass =
                  section.level === 1
                    ? 'text-base font-bold'
                    : section.level === 2
                      ? 'text-[15px] font-bold'
                      : 'text-sm font-semibold'

                return (
                  <div key={idx} className="mb-1">
                    <button
                      type="button"
                      onClick={() => toggleSection(idx)}
                      className={`flex w-full items-center gap-2 rounded-md py-1.5 px-1 -ml-1 text-left transition-colors hover:bg-surface-elevated/50 ${headingClass} text-text-primary`}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={14} className="shrink-0 text-text-secondary" />
                      ) : (
                        <ChevronDown size={14} className="shrink-0 text-text-secondary" />
                      )}
                      <span>{section.heading.replace(/\*\*/g, '')}</span>
                    </button>
                    {!isCollapsed && section.content.trim() && (
                      <div className="pl-5">
                        <MarkdownRenderer text={section.content} className="text-sm leading-relaxed" />
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <MarkdownRenderer text={rawText} className="text-sm leading-relaxed" />
            )}
          </div>
        )}

        {/* Error state */}
        {isError && error && (
          <div className="p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Footer: word/char count */}
      <div className="text-xs text-text-secondary px-4 py-2 border-t border-border/50">
        {wordCount} words | {charCount} chars
      </div>
    </div>
  )
}
