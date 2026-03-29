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
 * Migrated to Obsidian Glass design system with Input, Card,
 * Badge, Skeleton, div, and stagger animations.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, MessageCircleQuestion, FileText, Loader2, X, ChevronDown } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import { Card } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { EmptyState } from '@renderer/components/ui/EmptyState'
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
          className="mb-2 flex items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-secondary/50"
        >
          <Search size={15} className="text-primary" />
          <h3 className="text-sm font-medium text-foreground">Search notes</h3>
          {searchResults.length > 0 && searchQuery.trim() && (
            <Badge variant="default">{searchResults.length}</Badge>
          )}
          <ChevronDown
            size={14}
            className={`ml-auto text-muted-foreground/60 transition-transform duration-200 ${searchCollapsed ? '-rotate-90' : ''}`}
          />
        </button>

        {!searchCollapsed && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="group relative mb-4">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <Search size={16} className="text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search your knowledge base..."
                className="h-10 w-full rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:bg-white/10 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Search results */}
            <div className="flex-1 overflow-y-auto pr-1">
              {isSearching ? (
                <div className="space-y-2">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
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
                    <motion.div 
                      key={result.id} 
                      variants={staggerItem}
                      whileHover={{ scale: 1.01, x: 2 }}
                    >
                      <Card
                        className="cursor-pointer border border-white/4 bg-white/2 p-4 transition-colors hover:border-primary/30 hover:bg-white/4 hover:shadow-md"
                        onClick={() => handleResultClick(result.id)}
                      >
                        {/* Title with highlight */}
                        <h4 className="text-sm font-medium text-foreground">
                          {result.titleHighlight ? (
                            <span
                              dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.titleHighlight) }}
                              className="[&>mark]:rounded [&>mark]:bg-primary/25 [&>mark]:px-0.5 [&>mark]:text-primary"
                            />
                          ) : (
                            result.title
                          )}
                        </h4>

                        {/* Summary with highlight */}
                        {(result.summaryHighlight || result.summary) && (
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {result.summaryHighlight ? (
                              <span
                                dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.summaryHighlight) }}
                                className="[&>mark]:rounded [&>mark]:bg-primary/25 [&>mark]:px-0.5 [&>mark]:text-primary"
                              />
                            ) : (
                              result.summary
                            )}
                          </div>
                        )}

                        {/* Timestamp + relevance badge */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground/60">
                            {relativeTime(result.updatedAt)}
                          </span>
                        </div>
                      </Card>
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
          className="mb-2 flex items-center gap-2 rounded-lg border-t border-border/50 px-1 pt-3 pb-1 text-left transition-colors hover:bg-secondary/50"
        >
          <MessageCircleQuestion size={15} className="text-primary" />
          <h3 className="text-sm font-medium text-foreground">Ask your notes</h3>
          {isStreaming && (
            <Loader2 size={12} className="animate-spin text-primary" />
          )}
          <ChevronDown
            size={14}
            className={`ml-auto text-muted-foreground/60 transition-transform duration-200 ${qaCollapsed ? '-rotate-90' : ''}`}
          />
        </button>

        {!qaCollapsed && (
          <div className="flex min-h-0 flex-1 flex-col">
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-white/10 bg-black/20">
              {/* Response area */}
              <div className="flex-1 overflow-y-auto p-5">
                {isStreaming && !qaAnswer ? (
                  <div className="flex items-center gap-3 py-4 text-muted-foreground">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span className="text-sm tracking-wide text-muted-foreground/80">Synthesizing knowledge...</span>
                  </div>
                ) : qaAnswer ? (
                  <div className="prose prose-invert max-w-none prose-sm leading-relaxed">
                    <MarkdownRenderer text={qaAnswer} />
                    {isStreaming && (
                      <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] text-primary animate-pulse">
                        <Loader2 size={10} className="animate-spin" /> Generating
                      </span>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={MessageCircleQuestion}
                    title="Talk to your notes"
                    description="AI will instantly synthesize answers from your knowledge base."
                    className="py-12"
                  />
                )}
              </div>

              {/* Chat Input attached to bottom */}
              <div className="relative border-t border-white/6 bg-black/40 p-3">
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  onKeyDown={handleQuestionKeyDown}
                  placeholder="Ask a question..."
                  disabled={isStreaming}
                  className="h-11 w-full rounded-full border border-white/10 bg-white/5 pl-4 pr-24 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/10 disabled:opacity-50"
                />
                <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-1.5">
                  {isStreaming ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelQa}
                      className="h-8 rounded-full border border-red-500/30 px-3 text-xs text-red-400 hover:bg-red-500/20 cursor-pointer"
                    >
                      <X size={12} className="mr-1" /> Stop
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAskQuestion}
                      disabled={!questionText.trim()}
                      className="h-8 rounded-full px-3 text-xs shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)] transition-all hover:scale-105 hover:shadow-[0_0_20px_-3px_rgba(var(--primary),0.5)] cursor-pointer"
                    >
                      Ask <MessageCircleQuestion size={12} className="ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
