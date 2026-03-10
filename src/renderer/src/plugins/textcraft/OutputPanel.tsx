/**
 * OutputPanel -- Right panel of the TextCraft three-panel layout.
 *
 * Displays AI-streamed refinement output with markdown rendering,
 * two copy modes (formatted markdown & clean plain text), and word/character count footer.
 *
 * Four states: empty (no session), streaming (live markdown + indicator),
 * complete (final markdown + copy buttons), error (red message).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, Sparkles, FileText, AlignLeft, Copy } from 'lucide-react'
import { useTextCraftStore } from '../../stores/textcraft-store'
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

export default function OutputPanel(): React.JSX.Element {
  const session = useTextCraftStore((s) => s.session)
  const error = useTextCraftStore((s) => s.error)
  const [copiedMode, setCopiedMode] = useState<CopiedMode>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const rawText = session?.rawText ?? ''
  const hasOutput = rawText.length > 0
  const isStreaming = session?.status === 'streaming'
  const isComplete = session?.status === 'complete'
  const isError = session?.status === 'error'
  const isEmpty = !session || (!hasOutput && session.status === 'idle')

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0
  const charCount = rawText.length

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [rawText, isStreaming])

  // Reset feedback when output changes
  useEffect(() => {
    setCopiedMode(null)
  }, [rawText])

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

  const showCopyButtons = (isComplete || hasOutput) && !isStreaming

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Output
        </h2>

        {/* Copy buttons -- visible when output is ready */}
        {showCopyButtons && (
          <div className="flex items-center gap-1">
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

        {/* Streaming state */}
        {isStreaming && (
          <div className="p-4">
            {hasOutput && <MarkdownRenderer text={rawText} className="text-sm leading-relaxed" />}
            <span className="animate-pulse text-accent text-sm">Refining...</span>
          </div>
        )}

        {/* Complete state */}
        {isComplete && hasOutput && (
          <div className="p-4">
            <MarkdownRenderer text={rawText} className="text-sm leading-relaxed" />
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
