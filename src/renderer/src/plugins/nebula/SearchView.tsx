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
 *
 * Migrated to Obsidian Glass design system with GlassInput, GlassCard,
 * GlassBadge, GlassSkeleton, EmptyState, and stagger animations.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, MessageCircleQuestion, FileText, Loader2, X, ChevronDown } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import { GlassCard, GlassInput, GlassBadge, GlassSkeleton, EmptyState, GlassButton } from '../../components/ui'
import { staggerContainer, staggerItem } from '../../lib/motion'
import MarkdownRenderer from '../../components/MarkdownRenderer'

// -- HTML sanitizer for FTS5 highlights ------------------------------------

/**
 * Sanitize FTS5 highlight output -- only allow <mark> and </mark> tags.
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

// -- Relative time helper --------------------------------------------------

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

// -- SearchView component --------------------------------------------------

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
      {/* -- Top section: Full-text search -------------------------------- */}
      <div className={`flex flex-col ${searchCollapsed ? '' : 'min-h-0 flex-1'}`}>
        <button
          type="button"
          onClick={() => setSearchCollapsed(!searchCollapsed)}
          className="mb-2 flex items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-surface-elevated/50"
        >
          <Search size={15} className="text-accent" />
          <h3 className="text-sm font-medium text-text-primary">Search notes</h3>
          {searchResults.length > 0 && searchQuery.trim() && (
            <GlassBadge variant="accent">{searchResults.length}</GlassBadge>
          )}
          <ChevronDown
            size={14}
            className={`ml-auto text-text-secondary/60 transition-transform duration-200 ${searchCollapsed ? '-rotate-90' : ''}`}
          />
        </button>

        {!searchCollapsed && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
              />
              <GlassInput
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-9"
              />
            </div>

            {/* Search results */}
            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="space-y-2">
                  <GlassSkeleton variant="card" />
                  <GlassSkeleton variant="card" />
                  <GlassSkeleton variant="card" />
                </div>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No results found"
                  description="Try a different search term"
                  className="py-12"
                />
              ) : !searchQuery.trim() ? (
                <EmptyState
                  icon={FileText}
                  title="Search your notes"
                  description="Find notes by keyword or phrase"
                  className="py-12"
                />
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  {searchResults.map((result) => (
                    <motion.div key={result.id} variants={staggerItem}>
                      <GlassCard
                        variant="interactive"
                        className="cursor-pointer p-4"
                        onClick={() => handleResultClick(result.id)}
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

                        {/* Timestamp + relevance badge */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] text-text-secondary/60">
                            {relativeTime(result.updatedAt)}
                          </span>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* -- Bottom section: AI Q&A --------------------------------------- */}
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
              <GlassInput
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder="Ask a question about your notes..."
                disabled={isStreaming}
                className="flex-1"
              />
              {isStreaming ? (
                <GlassButton
                  variant="ghost"
                  onClick={cancelQa}
                  className="border border-red-500/30 text-red-400 hover:bg-red-500/20"
                >
                  <X size={13} />
                  Cancel
                </GlassButton>
              ) : (
                <GlassButton
                  variant="primary"
                  onClick={handleAskQuestion}
                  disabled={!questionText.trim()}
                >
                  <MessageCircleQuestion size={13} />
                  Ask
                </GlassButton>
              )}
            </div>

            {/* Response area */}
            <GlassCard className="flex-1 overflow-y-auto p-4">
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
                <EmptyState
                  icon={MessageCircleQuestion}
                  title="Ask your notes anything"
                  description="AI will search your knowledge base and provide an answer"
                  className="py-8"
                />
              )}
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  )
}
