/**
 * AskAI — AI-powered database Q&A with chained follow-up discussions.
 * Renders markdown answers and supports multi-turn conversations.
 * Supports running read-only SQL queries from AI-generated code blocks.
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
  Trash2
} from 'lucide-react'
import type { DbQASession } from '../../types/database'
import MarkdownRenderer from './MarkdownRenderer'
import type { QueryExecState } from './MarkdownRenderer'

interface AskAIProps {
  session: DbQASession | null
  hasConnection: boolean
  hasAgent: boolean
  /** Active connection ID for running SQL queries from code blocks */
  activeConnectionId: string | null
  onStart: (question: string) => void
  onCancel: () => void
}

interface ConversationTurn {
  question: string
  answer: string
}

/** Truncate text to maxLen chars, adding "…" if truncated. */
function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
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

  return (
    <div className="flex h-full flex-col">
      {/* Question input */}
      <div className="shrink-0 border-b border-border p-4">
        {/* Follow-up indicator */}
        {isFollowUp && conversationHistory.length > 0 && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-accent/5 border border-accent/15 px-3 py-1.5">
            <CornerDownRight size={11} className="shrink-0 text-accent" />
            <span className="flex-1 text-[11px] text-accent">
              Following up on: &ldquo;{truncate(conversationHistory.at(-1)?.question ?? '', 60)}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => setIsFollowUp(false)}
              className="text-[10px] text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !hasConnection
                ? 'Connect to a database first…'
                : !hasAgent
                  ? 'Configure an AI agent in Settings…'
                  : isFollowUp
                    ? 'Ask a follow-up question… (⌘+Enter to send)'
                    : 'Ask a question about your database… (⌘+Enter to send)'
            }
            disabled={!canAsk}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <div className="flex flex-col gap-1">
            {isStreaming ? (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                <Square size={12} />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canAsk || !question.trim()}
                className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                <Send size={12} />
                {isFollowUp ? 'Follow Up' : 'Ask'}
              </button>
            )}
          </div>
        </div>

        {/* Conversation history indicator */}
        {conversationHistory.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-text-secondary">
              {conversationHistory.length} turn{conversationHistory.length !== 1 ? 's' : ''} in conversation
            </span>
            <button
              type="button"
              onClick={handleNewConversation}
              className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 size={9} />
              New conversation
            </button>
          </div>
        )}
      </div>

      {/* Response area */}
      <div ref={responseRef} className="flex-1 overflow-auto p-4">
        {!session && (
          <div className="flex h-full items-center justify-center text-text-secondary/50">
            <div className="text-center">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Ask a question about your database</p>
              <p className="mt-1 text-xs">
                AI will analyze your schema and answer using table structures, relationships, and data types
              </p>
            </div>
          </div>
        )}

        {session && (
          <div className="space-y-3">
            {/* Previous turns (collapsed summaries) */}
            {conversationHistory.length > 1 && (
              <div className="space-y-1.5">
                {conversationHistory.slice(0, -1).map((turn, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/50 bg-surface/50 px-3 py-2 opacity-60"
                  >
                    <p className="text-[11px] font-medium text-accent/70">
                      Q: {truncate(turn.question, 100)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      A: {truncate(turn.answer, 150)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Current Question */}
            <div className="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2">
              <p className="text-xs font-medium text-accent">
                {conversationHistory.length > 1 ? `Follow-up #${conversationHistory.length}` : 'Question'}
              </p>
              <p className="mt-1 text-sm text-text-primary">{session.question}</p>
            </div>

            {/* Answer */}
            <div className="rounded-lg bg-surface-elevated px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-text-secondary">Answer</p>
                {isStreaming && <Loader2 size={10} className="animate-spin text-accent" />}
                {session.status === 'complete' && session.answer && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                    >
                      {copied ? (
                        <Check size={10} className="text-green-400" />
                      ) : (
                        <Copy size={10} />
                      )}
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
                    <div className="flex items-center gap-2 text-sm text-text-secondary/50">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/60" />
                      Thinking…
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Follow-up CTA */}
            {showFollowUp && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleFollowUp}
                  className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent transition-all hover:bg-accent/10 hover:border-accent/50"
                >
                  <CornerDownRight size={12} />
                  Follow Up
                </button>
                <span className="text-[10px] text-text-secondary/50">
                  Continue the conversation with context
                </span>
              </div>
            )}

            {/* Error */}
            {session.status === 'error' && session.error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                {session.error}
              </div>
            )}

            {session.status === 'cancelled' && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2 text-xs text-orange-400">
                Cancelled by user
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
