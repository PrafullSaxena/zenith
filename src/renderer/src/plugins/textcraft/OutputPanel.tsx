/**
 * OutputPanel -- Right panel of the TextCraft three-panel layout.
 *
 * Displays AI-streamed refinement output with markdown rendering,
 * copy modes (formatted markdown & clean plain text), PDF export,
 * and word/character count footer.
 *
 * Four states: empty (div), streaming (Skeleton shimmer + live markdown),
 * complete (final markdown + copy buttons), error (red message).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, FileText, AlignLeft, Copy, FileDown, ChevronDown, ChevronRight, ChevronsUpDown, Loader2, BookOpen } from 'lucide-react'
import { Card } from '@renderer/components/ui/card'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { EmptyState } from '@renderer/components/ui/EmptyState'
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
 */
function stripMarkdown(md: string): string {
  let text = md

  text = text.replace(/^```[\w-]*\n?/gm, '')
  text = text.replace(/^~~~[\w-]*\n?/gm, '')
  text = text.replace(/^#{1,6}\s+/gm, '')
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1')
  text = text.replace(/___(.+?)___/g, '$1')
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/__(.+?)__/g, '$1')
  text = text.replace(/\*(.+?)\*/g, '$1')
  text = text.replace(/_(.+?)_/g, '$1')
  text = text.replace(/~~(.+?)~~/g, '$1')
  text = text.replace(/`(.+?)`/g, '$1')
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  text = text.replace(/^>\s?/gm, '')
  text = text.replace(/^(\s*)[-*]\s+/gm, '$1• ')
  text = text.replace(/^[-*_]{3,}\s*$/gm, '')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

// -- Collapsible section parser -----------------------------------------------

interface MarkdownSection {
  heading: string
  level: number
  content: string
}

function splitIntoSections(md: string): MarkdownSection[] {
  const sections: MarkdownSection[] = []
  const lines = md.split('\n')
  let current: MarkdownSection = { heading: '', level: 0, content: '' }

  for (const line of lines) {
    const h1 = line.match(/^# (.+)$/)
    const h2 = line.match(/^## (.+)$/)
    const h3 = line.match(/^### (.+)$/)

    if (h1 || h2 || h3) {
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
  if (current.heading || current.content.trim()) {
    sections.push({ ...current, content: current.content.trimEnd() })
  }

  return sections
}

// -----------------------------------------------------------------------------

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

  const handleCopyFormatted = useCallback(async (): Promise<void> => {
    if (!rawText) return
    await writeClipboard(rawText)
    setCopiedMode('formatted')
    setTimeout(() => setCopiedMode(null), 2000)
  }, [rawText])

  const handleCopyRaw = useCallback(async (): Promise<void> => {
    if (!rawText) return
    await writeClipboard(stripMarkdown(rawText))
    setCopiedMode('raw')
    setTimeout(() => setCopiedMode(null), 2000)
  }, [rawText])

  const handleExportPDF = useCallback(async (): Promise<void> => {
    if (!rawText || isExporting) return
    setIsExporting(true)
    try {
      const settings = await window.api.settings.getAll()
      const pdfStyle = (settings?.['general.pdfStyle'] as string) ?? 'colored'
      const lightMode = pdfStyle !== 'pretty'
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

  const handleSaveAsNote = useCallback(async (): Promise<void> => {
    if (!rawText || !session) return
    const opts = session.options
    const formatLabel = opts.format.charAt(0).toUpperCase() + opts.format.slice(1)
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const noteTitle = `TextCraft: ${formatLabel} — ${date}`

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
    <Card className="flex flex-col h-full overflow-hidden border-white/5 bg-black/20 backdrop-blur-md p-4 rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          Output
        </div>

        {/* Action buttons -- visible when output is ready */}
        {showActions && (
          <div className="flex items-center gap-1">
            {hasSections && (
              <>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleAll}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-white/2 border border-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                  title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
                >
                  <ChevronsUpDown size={13} />
                  <span>{allCollapsed ? 'Expand' : 'Collapse'}</span>
                </motion.button>
                <div className="h-4 w-px bg-white/10 mx-1" />
              </>
            )}

            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => void handleCopyRaw()}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-white/2 border border-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
              title="Copy plain text"
            >
              {copiedMode === 'raw' ? <Check size={13} className={copiedMode === 'raw' ? 'text-success' : undefined} /> : <AlignLeft size={13} className={copiedMode === 'raw' ? 'text-success' : undefined} />}
              <span>{copiedMode === 'raw' ? 'Copied!' : 'Raw Text'}</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => void handleCopyFormatted()}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-white/2 border border-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
              title="Copy markdown source"
            >
              {copiedMode === 'formatted' ? <Check size={13} className={copiedMode === 'formatted' ? 'text-success' : undefined} /> : <FileText size={13} className={copiedMode === 'formatted' ? 'text-success' : undefined} />}
              <span>{copiedMode === 'formatted' ? 'Copied!' : 'Markdown'}</span>
            </motion.button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => void handleExportPDF()}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-white/2 border border-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 shadow-sm"
              title="Export as PDF"
            >
              {isExporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              <span>{isExporting ? 'Exporting...' : 'PDF'}</span>
            </motion.button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => void handleSaveAsNote()}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-white/2 border border-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shadow-sm"
              title="Save as Nebula note"
            >
              {savedAsNote ? <Check size={13} className={savedAsNote ? 'text-success' : undefined} /> : <BookOpen size={13} className={savedAsNote ? 'text-success' : undefined} />}
              <span>{savedAsNote ? 'Saved!' : 'Note'}</span>
            </motion.button>
          </div>
        )}

        {/* Streaming indicator in header */}
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--primary)]">
            <Copy size={12} className="animate-pulse" />
            Streaming...
          </span>
        )}
      </div>

      {/* Content area */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {/* Empty state */}
        {isEmpty && (
          <EmptyState
            icon={FileText}
            title="No output yet"
            description="Paste text and click Refine to see results"
            className="h-full"
          />
        )}

        {/* Streaming state -- Skeleton shimmer + live content */}
        {isStreaming && (
          <div className="px-2">
            {hasOutput ? (
              <>
                <MarkdownRenderer text={rawText} className="text-sm leading-relaxed" />
                <span className="animate-pulse text-[var(--primary)] text-sm">Refining...</span>
              </>
            ) : (
              <Skeleton className="h-4 w-full" />
            )}
          </div>
        )}

        {/* Complete state -- collapsible sections */}
        {isComplete && hasOutput && (
          <div className="px-2">
            {hasSections ? (
              sections.map((section, idx) => {
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
                      className={`flex w-full items-center gap-2 rounded-lg py-1.5 px-1 -ml-1 text-left transition-colors hover:bg-white/4 ${headingClass} text-foreground`}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                      )}
                      <span>{section.heading.replace(/\*\*/g, '')}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {!isCollapsed && section.content.trim() && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pl-5 overflow-hidden"
                        >
                          <MarkdownRenderer text={section.content} className="text-sm leading-relaxed" />
                        </motion.div>
                      )}
                    </AnimatePresence>
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
          <div className="px-2 pt-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Footer: word/char count */}
      <div className="text-[11px] font-medium tracking-wide text-muted-foreground/60 px-1 pt-2 border-t border-white/6 flex items-center gap-2 uppercase">
        <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        <span className="h-1 w-1 rounded-full bg-border" />
        <span>{charCount} {charCount === 1 ? 'char' : 'chars'}</span>
      </div>
    </Card>
  )
}
