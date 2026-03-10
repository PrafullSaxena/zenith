/**
 * SearchView -- Full-text search + AI Q&A interface for the Nebula plugin.
 *
 * Two sections:
 *  - Top: FTS5 keyword search with highlighted results (BM25 ranked)
 *  - Bottom: AI Q&A chat that answers questions using note summaries as context
 *
 * FTS5 highlight() returns <mark> tags -- safe to render via dangerouslySetInnerHTML
 * since the data comes from our own SQLite database, not user input.
 *
 * AI Q&A follows the same streaming pattern as summarization:
 * startAnalysis + session-scoped IPC listeners.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, MessageCircleQuestion, FileText, Loader2, X, ChevronDown } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import MarkdownRenderer from '../../components/MarkdownRenderer'

// ── HTML sanitizer for FTS5 highlights ──────────────────────────────

/**
 * Sanitize FTS5 highlight output — only allow <mark> and </mark> tags.
 * Escapes all other HTML to prevent XSS from user-generated content.
 */
function sanitizeHighlight(html: string): string {
  // Temporarily replace valid <mark> tags with placeholders
  const withPlaceholders = html
    .replace(/<mark>/g, '\x00MARK_OPEN\x00')
    .replace(/<\/mark>/g, '\x00MARK_CLOSE\x00')
  // Escape remaining HTML entities
  const escaped = withPlaceholders
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  // Restore <mark> tags
  return escaped
    .replace(/\x00MARK_OPEN\x00/g, '<mark>')
    .replace(/\x00MARK_CLOSE\x00/g, '</mark>')
}

// ── Relative time helper ────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

// ── SearchView component ────────────────────────────────────────────

export default function SearchView(): React.JSX.Element {
  const searchQuery = useNebulaStore((s) => s.searchQuery)
  const setSearchQuery = useNebulaStore((s) => s.setSearchQuery)
  const searchResults = useNebulaStore((s) => s.searchResults)
  const searchNotes = useNebulaStore((s) => s.searchNotes)
  const isSearching = useNebulaStore((s) => s.isSearching)
  const selectNote = useNebulaStore((s) => s.selectNote)
  const setActiveTab = useNebulaStore((s) => s.setActiveTab)
  const qaAnswer = useNebulaStore((s) => s.qaAnswer)
  const qaSessionId = useNebulaStore((s) => s.qaSessionId)
  const askQuestion = useNebulaStore((s) => s.askQuestion)
  const cancelQa = useNebulaStore((s) => s.cancelQa)
  const searchCollapsed = useNebulaStore((s) => s.searchCollapsed)
  const setSearchCollapsed = useNebulaStore((s) => s.setSearchCollapsed)
  const qaCollapsed = useNebulaStore((s) => s.qaCollapsed)
  const setQaCollapsed = useNebulaStore((s) => s.setQaCollapsed)

  const [questionText, setQuestionText] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search on input change (300ms)
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (value.trim()) {
        debounceRef.current = setTimeout(() => {
          searchNotes(value)
        }, 300)
      }
    },
    [setSearchQuery, searchNotes]
  )

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Handle clicking a search result
  const handleResultClick = useCallback(
    (noteId: string) => {
      selectNote(noteId)
      setActiveTab('notes')
    },
    [selectNote, setActiveTab]
  )

  // Handle Q&A submit
  const handleAskQuestion = useCallback(() => {
    const q = questionText.trim()
    if (!q) return
    askQuestion(q)
  }, [questionText, askQuestion])

  // Handle Enter key in Q&A input
  const handleQuestionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleAskQuestion()
      }
    },
    [handleAskQuestion]
  )

  const isStreaming = qaSessionId !== null

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* ── Top section: Full-text search ─────────────────────────── */}
      <div className={`flex flex-col ${searchCollapsed ? '' : 'min-h-0 flex-1'}`}>
        <button
          type="button"
          onClick={() => setSearchCollapsed(!searchCollapsed)}
          className="mb-2 flex items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-surface-elevated/50"
        >
          <Search size={15} className="text-accent" />
          <h3 className="text-sm font-medium text-text-primary">Search notes</h3>
          {searchResults.length > 0 && searchQuery.trim() && (
            <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              {searchResults.length}
            </span>
          )}
          <ChevronDown
            size={14}
            className={`ml-auto text-text-secondary/60 transition-transform duration-200 ${searchCollapsed ? '-rotate-90' : ''}`}
          />
        </button>

        {!searchCollapsed && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full rounded-lg border border-border/50 bg-surface px-3 py-1.5 pl-9 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition"
                />
                {isSearching && (
                  <Loader2
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-accent"
                  />
                )}
              </div>
            </div>

            {/* Search results */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              {searchQuery.trim() && searchResults.length === 0 && !isSearching ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/[0.06]">
                    <Search size={20} className="text-text-secondary/40" />
                  </div>
                  <p className="text-sm font-medium">No results found</p>
                  <p className="mt-1 text-xs text-text-secondary/60">Try a different keyword or phrase</p>
                </div>
              ) : !searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/[0.06]">
                    <FileText size={20} className="text-text-secondary/40" />
                  </div>
                  <p className="text-sm font-medium">Search your notes</p>
                  <p className="mt-1 text-xs text-text-secondary/60">Find notes by keyword or phrase</p>
                </div>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleResultClick(result.id)}
                    className="w-full cursor-pointer rounded-xl border border-border/50 bg-surface-elevated p-4 text-left transition-all hover:bg-accent/5 hover:border-accent/20"
                  >
                    {/* Title with highlight */}
                    <h4 className="text-sm font-medium text-text-primary">
                      {result.titleHighlight ? (
                        <span
                          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.titleHighlight) }}
                          className="[&>mark]:rounded [&>mark]:bg-accent/25 [&>mark]:px-0.5 [&>mark]:text-accent"
                        />
                      ) : (
                        result.title
                      )}
                    </h4>

                    {/* Summary with highlight */}
                    {(result.summaryHighlight || result.summary) && (
                      <div className="mt-1 line-clamp-2 text-xs text-text-secondary">
                        {result.summaryHighlight ? (
                          <span
                            dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.summaryHighlight) }}
                            className="[&>mark]:rounded [&>mark]:bg-accent/25 [&>mark]:px-0.5 [&>mark]:text-accent"
                          />
                        ) : (
                          result.summary
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="mt-1.5 text-[10px] text-text-secondary/60">
                      {relativeTime(result.updatedAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom section: AI Q&A ────────────────────────────────── */}
      <div className={`flex flex-col ${qaCollapsed ? '' : 'min-h-0 flex-1'}`}>
        <button
          type="button"
          onClick={() => setQaCollapsed(!qaCollapsed)}
          className="mb-2 flex items-center gap-2 rounded-lg border-t border-border/50 px-1 pt-3 pb-1 text-left transition-colors hover:bg-surface-elevated/50"
        >
          <MessageCircleQuestion size={15} className="text-accent" />
          <h3 className="text-sm font-medium text-text-primary">Ask your notes</h3>
          {isStreaming && (
            <Loader2 size={12} className="animate-spin text-accent" />
          )}
          <ChevronDown
            size={14}
            className={`ml-auto text-text-secondary/60 transition-transform duration-200 ${qaCollapsed ? '-rotate-90' : ''}`}
          />
        </button>

        {!qaCollapsed && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Question input */}
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder="Ask a question about your notes..."
                disabled={isStreaming}
                className="flex-1 rounded-lg border border-border/50 bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={cancelQa}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 hover:border-red-500/50"
                >
                  <X size={13} />
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAskQuestion}
                  disabled={!questionText.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition-all hover:bg-accent/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent/15"
                >
                  <MessageCircleQuestion size={13} />
                  Ask
                </button>
              )}
            </div>

            {/* Response area */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-border/50 bg-surface-elevated/30 p-4">
              {isStreaming && !qaAnswer ? (
                <div className="flex items-center gap-2 py-2 text-text-secondary">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  <span className="text-sm text-text-secondary/80">Searching notes and generating answer...</span>
                </div>
              ) : qaAnswer ? (
                <div>
                  {isStreaming && (
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] text-accent">
                      <Loader2 size={10} className="animate-spin" />
                      Generating...
                    </div>
                  )}
                  <MarkdownRenderer text={qaAnswer} className="text-sm" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/[0.06]">
                    <MessageCircleQuestion size={20} className="text-text-secondary/40" />
                  </div>
                  <p className="text-sm font-medium">Ask your notes anything</p>
                  <p className="mt-1 text-center text-xs text-text-secondary/60">
                    AI will search your knowledge base and provide an answer
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
