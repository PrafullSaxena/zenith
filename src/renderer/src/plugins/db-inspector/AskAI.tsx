/**
 * AskAI — AI-powered database Q&A with chained follow-up discussions.
 * Renders markdown answers and supports multi-turn conversations.
 * Supports running read-only SQL queries from AI-generated code blocks.
 *
 * Migrated to Obsidian Glass design system using Card, Button,
 * Card, and div shared components.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  Square,
  Loader2,
  MessageSquare,
  Copy,
  Check,
  CornerDownRight,
  Trash2,
  Clock
} from 'lucide-react'
import type { DbQASession } from '../../types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import type { QueryExecState } from '../../components/MarkdownRenderer'

interface AskAIProps {
  session: DbQASession | null
  hasConnection: boolean
  hasAgent: boolean
  /** Active connection ID for running SQL queries from code blocks */
  activeConnectionId: string | null
  /** Persisted list of recent questions (max 10) */
  questionHistory: string[]
  onStart: (question: string) => void
  onCancel: () => void
}

interface ConversationTurn {
  question: string
  answer: string
}

/** Truncate text to maxLen chars, adding "..." if truncated. */
function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

/** Build a conversation context string for follow-up questions (token-efficient). */
function buildConversationContext(history: ConversationTurn[]): string {
  if (history.length === 0) return ''

  // Include last 3 turns max, truncate answers to save tokens
  const recent = history.slice(-3)
  const lines = recent.map(
    (turn, i) =>
      `[Turn ${i + 1}]\nQ: ${turn.question}\nA: ${truncate(turn.answer, 400)}`
  )

  return `Previous conversation for context:\n${lines.join('\n\n')}\n\n---\nNew follow-up question:`
}

export default function AskAI({
  session,
  hasConnection,
  hasAgent,
  activeConnectionId,
  questionHistory,
  onStart,
  onCancel
}: AskAIProps): React.JSX.Element {
  const [question, setQuestion] = useState('')
  const [copied, setCopied] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [isFollowUp, setIsFollowUp] = useState(false)
  const [queryResults, setQueryResults] = useState<Map<string, QueryExecState>>(new Map())
  const responseRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevSessionIdRef = useRef<string | null>(null)

  // Auto-scroll during streaming
  useEffect(() => {
    if (session?.status === 'streaming' && responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [session?.rawText, session?.status])

  // When a session completes, add to conversation history
  useEffect(() => {
    if (
      session?.status === 'complete' &&
      session.sessionId !== prevSessionIdRef.current
    ) {
      prevSessionIdRef.current = session.sessionId
      setConversationHistory((prev) => [
        ...prev,
        { question: session.question, answer: session.answer }
      ])
    }
  }, [session?.status, session?.sessionId, session?.question, session?.answer])

  const handleSubmit = (): void => {
    if (!question.trim() || !hasConnection || !hasAgent) return
    const q = question.trim()

    if (isFollowUp && conversationHistory.length > 0) {
      const ctx = buildConversationContext(conversationHistory)
      onStart(`${ctx}\n${q}`)
    } else {
      onStart(q)
    }
    setQuestion('')
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleCopy = useCallback(() => {
    if (session?.answer) {
      navigator.clipboard.writeText(session.answer)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [session?.answer])

  const handleFollowUp = useCallback(() => {
    setIsFollowUp(true)
    setQuestion('')
    inputRef.current?.focus()
  }, [])

  const handleNewConversation = useCallback(() => {
    setConversationHistory([])
    setIsFollowUp(false)
    setQuestion('')
    setQueryResults(new Map())
    prevSessionIdRef.current = null
  }, [])

  const handleRunQuery = useCallback(
    async (sql: string) => {
      if (!activeConnectionId) return

      // Set loading state
      setQueryResults((prev) => {
        const next = new Map(prev)
        next.set(sql, { isLoading: true })
        return next
      })

      try {
        const result = await (window as unknown as { api: { db: { query: (id: string, sql: string) => Promise<unknown> } } }).api.db.query(activeConnectionId, sql)
        setQueryResults((prev) => {
          const next = new Map(prev)
          next.set(sql, { isLoading: false, result: result as QueryExecState['result'] })
          return next
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setQueryResults((prev) => {
          const next = new Map(prev)
          next.set(sql, { isLoading: false, error: message })
          return next
        })
      }
    },
    [activeConnectionId]
  )

  const isStreaming = session?.status === 'streaming'
  const canAsk = hasConnection && hasAgent && !isStreaming
  const showFollowUp = session?.status === 'complete' && hasAgent

  // -- No connection: show empty state
  if (!hasConnection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div
          icon={MessageSquare}
          title="Connect a database"
          description="Select and connect to a database to ask AI questions about your schema"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Question input */}
      <Card className="shrink-0 rounded-none border-x-0 border-t-0 p-4">
        {/* Follow-up indicator */}
        {isFollowUp && conversationHistory.length > 0 && (
          <Card className="mb-2 flex items-center gap-2 border-[var(--primary)]/15 bg-[var(--primary)]/5 px-3 py-1.5">
            <CornerDownRight size={11} className="shrink-0 text-[var(--primary)]" />
            <span className="flex-1 text-[11px] text-[var(--primary)]">
              Following up on: &ldquo;{truncate(conversationHistory.at(-1)?.question ?? '', 60)}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => setIsFollowUp(false)}
              className="text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              Cancel
            </button>
          </Card>
        )}

        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !hasAgent
                ? 'Configure an AI agent in Settings...'
                : isFollowUp
                  ? 'Ask a follow-up question... (Cmd+Enter to send)'
                  : 'Ask a question about your database... (Cmd+Enter to send)'
            }
            disabled={!canAsk}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-[hsl(var(--border))] bg-white/[0.03] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:border-[var(--primary)] focus:outline-none disabled:opacity-50"
          />
          <div className="flex flex-col gap-1">
            {isStreaming ? (
              <Button variant="destructive" size="sm" onClick={onCancel}>
                <Square size={12} />
                Stop
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleSubmit}
                disabled={!canAsk || !question.trim()}
              >
                <Send size={12} />
                {isFollowUp ? 'Follow Up' : 'Ask'}
              </Button>
            )}
          </div>
        </div>

        {/* Conversation history indicator */}
        {conversationHistory.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {conversationHistory.length} turn{conversationHistory.length !== 1 ? 's' : ''} in conversation
            </span>
            <button
              type="button"
              onClick={handleNewConversation}
              className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors"
            >
              <Trash2 size={9} />
              New conversation
            </button>
          </div>
        )}
      </Card>

      {/* Response area */}
      <div ref={responseRef} className="flex-1 overflow-auto p-4">
        {!session && (
          <div className="flex h-full flex-col items-center justify-center text-[hsl(var(--muted-foreground))]/70">
            <div className="text-center">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Ask a question about your database</p>
              <p className="mt-1 text-xs">
                AI will analyze your schema and answer using table structures, relationships, and data types
              </p>
            </div>

            {/* Recent questions */}
            {questionHistory.length > 0 && (
              <div className="mt-6 w-full max-w-md">
                <div className="mb-2 flex items-center gap-1.5">
                  <Clock size={11} className="text-[hsl(var(--muted-foreground))]/60" />
                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]/70">Recent questions</span>
                </div>
                <div className="space-y-1">
                  {questionHistory.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!canAsk}
                      onClick={() => {
                        setQuestion(q)
                        inputRef.current?.focus()
                      }}
                      className="w-full truncate rounded-lg border border-[hsl(var(--border))] bg-white/[0.02] px-3 py-1.5 text-left text-xs text-[hsl(var(--muted-foreground))] transition-colors hover:border-[var(--primary)]/30 hover:text-[hsl(var(--foreground))] disabled:opacity-40"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {session && (
          <div className="space-y-3">
            {/* Previous turns (collapsed summaries) */}
            {conversationHistory.length > 1 && (
              <div className="space-y-1.5">
                {conversationHistory.slice(0, -1).map((turn, i) => (
                  <Card
                    key={i}
                    className="px-3 py-2 opacity-60"
                  >
                    <p className="text-[11px] font-medium text-[var(--primary)]/70">
                      Q: {truncate(turn.question, 100)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                      A: {truncate(turn.answer, 150)}
                    </p>
                  </Card>
                ))}
              </div>
            )}

            {/* Current Question */}
            <Card className="border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-2">
              <p className="text-xs font-medium text-[var(--primary)]">
                {conversationHistory.length > 1 ? `Follow-up #${conversationHistory.length}` : 'Question'}
              </p>
              <p className="mt-1 text-sm text-[hsl(var(--foreground))]">{session.question}</p>
            </Card>

            {/* Answer */}
            <Card className="px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Answer</p>
                {isStreaming && <Loader2 size={10} className="animate-spin text-[var(--primary)]" />}
                {session.status === 'complete' && session.answer && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-white/[0.04] hover:text-[hsl(var(--foreground))]"
                    >
                      <span icon={copied ? Check : Copy} iconKey={copied ? 'check' : 'copy'} size={10} className={copied ? 'text-emerald-400' : undefined} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3">
                {session.rawText ? (
                  <MarkdownRenderer
                    text={session.rawText}
                    onRunQuery={activeConnectionId ? handleRunQuery : undefined}
                    queryResults={queryResults}
                  />
                ) : (
                  isStreaming && (
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]/70">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]/60" />
                      Thinking...
                    </div>
                  )
                )}
              </div>
            </Card>

            {/* Follow-up CTA */}
            {showFollowUp && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFollowUp}
                  className="border border-[var(--primary)]/30 text-[var(--primary)]"
                >
                  <CornerDownRight size={12} />
                  Follow Up
                </Button>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]/60">
                  Continue the conversation with context
                </span>
              </div>
            )}

            {/* Error */}
            {session.status === 'error' && session.error && (
              <Card className="border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {session.error}
              </Card>
            )}

            {session.status === 'cancelled' && (
              <Card className="border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-400">
                Cancelled by user
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
