/**
 * OutputPanel -- Right panel of the TextCraft three-panel layout.
 *
 * Displays AI-streamed refinement output with markdown rendering,
 * copy-to-clipboard with visual feedback, and word/character count footer.
 *
 * Four states: empty (no session), streaming (live markdown + indicator),
 * complete (final markdown + copy button), error (red message).
 */

import { useState, useEffect, useRef } from 'react'
import { Copy, Check, Sparkles } from 'lucide-react'
import { useTextCraftStore } from '../../stores/textcraft-store'
import MarkdownRenderer from '../../components/MarkdownRenderer'

export default function OutputPanel(): React.JSX.Element {
  const session = useTextCraftStore((s) => s.session)
  const error = useTextCraftStore((s) => s.error)
  const [copied, setCopied] = useState(false)
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

  const handleCopy = async (): Promise<void> => {
    if (!rawText) return
    await navigator.clipboard.writeText(rawText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Output
        </h2>

        {/* Copy button -- visible when there is output */}
        {(isComplete || hasOutput) && (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="p-1.5 rounded-md hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check size={14} className="text-success" />
            ) : (
              <Copy size={14} />
            )}
          </button>
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
