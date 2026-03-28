/**
 * AskAI — AI-powered database Q&A with chained follow-up discussions.
 * Renders markdown answers and supports multi-turn conversations.
 * Supports running read-only SQL queries from AI-generated code blocks.
 *
 * Migrated to a modern, fluid conversational UI with chat bubbles.
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
  Clock,
  User,
  Bot
} from 'lucide-react'
import type { DbQASession } from '../../types/database'
import { Card } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import type { QueryExecState } from '../../components/MarkdownRenderer'

interface AskAIProps {
  session: DbQASession | null
  hasConnection: boolean
  hasAgent: boolean
  activeConnectionId: string | null
  questionHistory: string[]
  onStart: (question: string) => void
  onCancel: () => void
}

interface ConversationTurn {
  question: string
  answer: string
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function buildConversationContext(history: ConversationTurn[]): string {
  if (history.length === 0) return ''

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

  useEffect(() => {
    if (session?.status === 'streaming' && responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [session?.rawText, session?.status])

  useEffect(() => {
    if (
      session?.status === 'complete' &&
      session.sessionId !== prevSessionIdRef.current
    ) {
      prevSessionIdRef.current = session.sessionId
      setTimeout(() => {
        setConversationHistory((prev) => [
          ...prev,
          { question: session.question, answer: session.answer }
        ])
      }, 0)
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
  }, [session])

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

      setQueryResults((prev) => {
        const next = new Map(prev)
        next.set(sql, { isLoading: true })
        return next
      })

      try {
        const result = await (window as unknown as {
          api: { db: { query: (id: string, sql: string) => Promise<unknown> } }
        }).api.db.query(activeConnectionId, sql)
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

  if (!hasConnection) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={MessageSquare}
          title="Connect a database"
          description="Select and connect to a database to ask AI questions about your schema"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background/50">
      {/* Response area (Messages) */}
      <div ref={responseRef} className="flex-1 overflow-auto p-4 scroll-smooth">
        {!session && (
          <div className="flex h-full flex-col items-center justify-center text-[hsl(var(--muted-foreground))]/70">
            <div className="text-center max-w-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Bot size={24} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Ask AI about your schema</p>
              <p className="mt-1.5 text-xs">
                The AI analyzes your table structures, relationships, and data types to answer complex questions or write SQL for you.
              </p>
            </div>

            {/* Recent questions */}
            {questionHistory.length > 0 && (
              <div className="mt-8 w-full max-w-sm">
                <div className="mb-3 flex items-center gap-1.5">
                  <Clock size={12} className="text-muted-foreground/60" />
                  <span className="text-xs font-medium text-muted-foreground/70">Recent questions</span>
                </div>
                <div className="space-y-1.5">
                  {questionHistory.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!canAsk}
                      onClick={() => {
                        setQuestion(q)
                        inputRef.current?.focus()
                      }}
                      className="w-full truncate rounded-lg border border-border/50 bg-card/40 px-3 py-2 text-left text-[11px] text-muted-foreground transition-all hover:border-primary/30 hover:bg-card hover:text-foreground disabled:opacity-40"
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
          <div className="mx-auto max-w-3xl space-y-6 pb-4">
            {/* Previous turns */}
            {conversationHistory.length > 0 && (
              <div className="space-y-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
                {conversationHistory.map((turn, i) => (
                  <div key={i} className="space-y-6">
                    {/* User Bubble */}
                    <div className="flex justify-end pr-2">
                      <div className="flex max-w-[85%] items-start gap-3">
                        <div className="flex-1 rounded-2xl rounded-tr-sm bg-primary/20 px-4 py-2.5 text-[13px] text-foreground border border-primary/20 relative shadow-sm">
                          {turn.question}
                        </div>
                        <div className="shrink-0 translate-y-1 rounded-full bg-primary/20 p-1.5">
                          <User size={12} className="text-primary" />
                        </div>
                      </div>
                    </div>
                    {/* AI Bubble */}
                    <div className="flex justify-start pl-2">
                      <div className="flex max-w-[95%] items-start gap-3">
                        <div className="shrink-0 translate-y-1 rounded-full bg-card p-1.5 border border-border shadow-sm">
                          <Bot size={12} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 rounded-2xl rounded-tl-sm bg-card px-5 py-4 border border-border shadow-sm text-sm text-foreground overflow-x-auto">
                           <MarkdownRenderer text={turn.answer} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Divider for current session */}
                <div className="flex items-center gap-4 py-2">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50 font-medium">Current Session</span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
              </div>
            )}

            {/* Current Question */}
            <div className="flex justify-end pr-2">
              <div className="flex max-w-[85%] items-start gap-3">
                <div className="flex-1 rounded-2xl rounded-tr-sm bg-primary/20 px-4 py-2.5 text-[13px] text-foreground border border-primary/20 relative shadow-sm">
                  {isFollowUp && <span className="text-[10px] font-medium text-primary block mb-1 uppercase tracking-wide">Follow-up</span>}
                  {session.question}
                </div>
                <div className="shrink-0 translate-y-1 rounded-full bg-primary/20 p-1.5 shadow-sm">
                  <User size={12} className="text-primary" />
                </div>
              </div>
            </div>

            {/* Answer */}
            <div className="flex justify-start pl-2">
              <div className="flex max-w-[95%] items-start gap-3 w-full">
                <div className="shrink-0 translate-y-1 rounded-full bg-card p-1.5 border border-border shadow-sm relative">
                  <Bot size={12} className="text-primary" />
                  {isStreaming && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="rounded-2xl rounded-tl-sm bg-card px-5 py-4 border border-border shadow-sm w-full">
                    {session.status === 'error' ? (
                      <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded border border-red-400/20">
                        {session.error}
                      </div>
                    ) : session.status === 'cancelled' ? (
                      <div className="text-sm text-orange-400 bg-orange-400/10 p-3 rounded border border-orange-400/20">
                        Cancelled by user
                      </div>
                    ) : session.rawText ? (
                      <MarkdownRenderer
                        text={session.rawText}
                        onRunQuery={activeConnectionId ? handleRunQuery : undefined}
                        queryResults={queryResults}
                      />
                    ) : isStreaming ? (
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground/80 py-1">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" />
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 delay-75" />
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 delay-150" />
                        <span className="ml-1">Thinking...</span>
                      </div>
                    ) : null}

                    {/* Answer Toolbar */}
                    {session.status === 'complete' && session.answer && (
                      <div className="mt-4 pt-3 flex items-center justify-between border-t border-border/40">
                         <div className="flex items-center gap-2">
                            {showFollowUp && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleFollowUp}
                                className="h-6 gap-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10"
                              >
                                <CornerDownRight size={12} />
                                Follow Up
                              </Button>
                            )}
                         </div>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={handleCopy}
                           className="h-6 gap-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                         >
                           {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                           {copied ? 'Copied' : 'Copy context'}
                         </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area (fixed at bottom) */}
      <div className="shrink-0 border-t border-border bg-card/60 p-4 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          {isFollowUp && conversationHistory.length > 0 && (
            <div className="mb-2 flex items-center gap-2 px-1">
              <CornerDownRight size={11} className="shrink-0 text-primary" />
              <span className="flex-1 text-[11px] text-primary/80 truncate">
                Following up on: &ldquo;{truncate(conversationHistory.at(-1)?.question ?? '', 60)}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setIsFollowUp(false)}
                className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-xl border border-border bg-background shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all p-1">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !hasAgent
                  ? 'Configure an AI agent in Settings...'
                  : isFollowUp
                    ? 'Ask a follow-up question... (Cmd+Enter)'
                    : 'Ask a question about your database... (Cmd+Enter)'
              }
              disabled={!canAsk}
              rows={Math.max(1, Math.min(6, question.split('\n').length))}
              className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50 min-h-[40px] max-h-[150px]"
            />
            
            <div className="shrink-0 p-1 flex items-center gap-1">
              {conversationHistory.length > 0 && !isStreaming && (
                <button
                  type="button"
                  onClick={handleNewConversation}
                  className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 size={13} />
                </button>
              )}
              
              {isStreaming ? (
                <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={onCancel}>
                  <Square size={12} className="fill-current" />
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-lg shadow-sm"
                  onClick={handleSubmit}
                  disabled={!canAsk || !question.trim()}
                >
                  <Send size={13} className={question.trim() ? "translate-x-[1px] -translate-y-[1px]" : ""} />
                </Button>
              )}
            </div>
          </div>
          
          <div className="mt-2 text-center text-[10px] text-muted-foreground/40 font-medium">
            AI can make mistakes. Always review the generated SQL before executing on production sources.
          </div>
        </div>
      </div>
    </div>
  )
}
