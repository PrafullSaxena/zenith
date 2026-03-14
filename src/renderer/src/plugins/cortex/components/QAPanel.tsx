/**
 * QAPanel — Chat-style interface for querying the codebase.
 * Uses AI streaming via window.api.ai.startAnalysis + session-scoped IPC listeners.
 * Renders assistant responses as markdown with source citations.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, Search, FileCode, Loader2, Trash2 } from 'lucide-react'
import { useCortexStore, getCortexAgent } from '../../../stores/cortex-store'
import { useAgentStore } from '../../../stores/agent-store'
import MarkdownRenderer from '../../../components/MarkdownRenderer'
import type { QAMessage, RepoType } from '../../../types/cortex'

// ── Suggested questions by repo type ────────────────────────────────

function getSuggestedQuestions(repoType: RepoType): string[] {
  switch (repoType) {
    case 'backend':
      return [
        'What are the main API endpoints?',
        'How does authentication work?',
        'Explain the service layer architecture'
      ]
    case 'frontend':
      return [
        'What is the component hierarchy?',
        'How is routing structured?',
        'What state management is used?'
      ]
    case 'data-engineering':
      return [
        'What DAGs are defined?',
        'How is the data pipeline orchestrated?',
        'What are the trigger scripts?'
      ]
    default:
      return [
        'What is the overall project structure?',
        'What are the main entry points?',
        'How are dependencies organized?'
      ]
  }
}

// ── QAPanel component ───────────────────────────────────────────────

export default function QAPanel(): React.JSX.Element {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const accumulatorRef = useRef('')

  const qaMessages = useCortexStore((s) => s.qaMessages)
  const isQAStreaming = useCortexStore((s) => s.isQAStreaming)
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const addQAMessage = useCortexStore((s) => s.addQAMessage)
  const updateLastQAMessage = useCortexStore((s) => s.updateLastQAMessage)
  const setIsQAStreaming = useCortexStore((s) => s.setIsQAStreaming)
  const clearQA = useCortexStore((s) => s.clearQA)
  const openFile = useCortexStore((s) => s.openFile)
  const setActiveTab = useCortexStore((s) => s.setActiveTab)

  // Ensure agent providers are loaded (handles direct navigation to Cortex)
  useEffect(() => {
    const store = useAgentStore.getState()
    if (store.providers.length === 0) {
      store.loadProviders()
    }
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [qaMessages])

  const handleSend = useCallback(
    async (question: string) => {
      if (!question.trim() || isQAStreaming || !analysisResult) return

      const agent = getCortexAgent()
      if (!agent) return

      // Add user message
      const userMsg: QAMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question.trim(),
        sources: [],
        timestamp: new Date().toISOString()
      }
      addQAMessage(userMsg)

      // Add placeholder assistant message
      const assistantMsg: QAMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        sources: [],
        timestamp: new Date().toISOString()
      }
      addQAMessage(assistantMsg)

      setIsQAStreaming(true)
      setInput('')
      accumulatorRef.current = ''

      // Build system prompt with codebase context
      const systemPrompt = `You are a codebase expert analyzing a ${analysisResult.repoType} repository.
Repository type: ${analysisResult.repoType}, Framework: ${analysisResult.framework}, Language: ${analysisResult.language}

## Code Structure Summary
- ${analysisResult.stats.totalFiles} files, ${analysisResult.stats.totalLines} lines
- Entities: ${JSON.stringify(analysisResult.stats.entityCount)}
- API Routes: ${analysisResult.routes.length}

## Key Entities (top 50)
${analysisResult.entities
  .slice(0, 50)
  .map((e) => `- ${e.kind}: ${e.name} (${e.filePath}:${e.line})`)
  .join('\n')}

## API Endpoints
${analysisResult.routes.map((r) => `- ${r.method} ${r.fullPath} -> ${r.handlerName} (${r.filePath}:${r.line})`).join('\n')}

Answer questions accurately. Reference specific files, functions, and line numbers. Format responses in markdown.`

      const sessionId = crypto.randomUUID()

      try {
        // Set up stream listeners
        window.api.ai.onStreamChunk(({ sessionId: sid, chunk }) => {
          if (sid === sessionId) {
            accumulatorRef.current += chunk
            updateLastQAMessage(accumulatorRef.current)
          }
        })

        window.api.ai.onStreamDone(({ sessionId: sid }) => {
          if (sid === sessionId) {
            setIsQAStreaming(false)
            window.api.ai.removeStreamListeners()
          }
        })

        window.api.ai.onStreamError(({ sessionId: sid, error }) => {
          if (sid === sessionId) {
            accumulatorRef.current += `\n\nError: ${error}`
            updateLastQAMessage(accumulatorRef.current)
            setIsQAStreaming(false)
            window.api.ai.removeStreamListeners()
          }
        })

        // Start the analysis stream
        await window.api.ai.startAnalysis(
          agent.providerId,
          agent.model,
          systemPrompt,
          question.trim(),
          sessionId,
          agent.command
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start Q&A'
        updateLastQAMessage(`Error: ${message}`)
        setIsQAStreaming(false)
        window.api.ai.removeStreamListeners()
      }
    },
    [
      isQAStreaming,
      analysisResult,
      addQAMessage,
      updateLastQAMessage,
      setIsQAStreaming
    ]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleSourceClick = (path: string, _line: number): void => {
    // Navigate to Code tab and open the file
    openFile(path, 'plaintext')
    setActiveTab('code')
  }

  const suggestedQuestions = analysisResult
    ? getSuggestedQuestions(analysisResult.repoType)
    : []

  const hasAgent = !!getCortexAgent()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-accent" />
          <span className="text-xs font-medium text-text-primary">Codebase Q&A</span>
        </div>
        {qaMessages.length > 0 && (
          <button
            type="button"
            onClick={clearQA}
            className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
            title="Clear chat"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {qaMessages.length === 0 ? (
          /* Empty state with suggested questions */
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="text-center">
              <Search size={28} className="mx-auto mb-2 text-text-secondary/30" />
              <p className="text-sm text-text-secondary">Ask anything about the codebase</p>
            </div>
            {!hasAgent && (
              <p className="text-xs text-warning">
                No AI agent configured. Set up an AI provider in Settings.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={isQAStreaming || !hasAgent}
                  className="rounded-lg border border-border/60 bg-surface-elevated/50 px-4 py-2 text-xs text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors text-left disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages list */
          qaMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-accent/15 text-text-primary rounded-xl px-4 py-3'
                    : 'border border-border/60 bg-surface-elevated text-text-primary rounded-xl px-4 py-3'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : msg.content ? (
                  <div>
                    <MarkdownRenderer text={msg.content} className="text-sm" />
                    {/* Source citations */}
                    {msg.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.sources.map((src, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSourceClick(src.path, src.line)}
                            className="flex items-center gap-1 text-[10px] text-accent/70 hover:text-accent transition-colors"
                          >
                            <FileCode size={10} />
                            <span>
                              {src.path}:{src.line}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Streaming placeholder */
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 size={14} className="animate-spin text-accent" />
                    <span className="text-xs text-text-secondary">Thinking...</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-surface p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2">
          <Search size={14} className="shrink-0 text-text-secondary/50" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the codebase..."
            disabled={isQAStreaming || !hasAgent}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isQAStreaming || !hasAgent}
            className="rounded-md bg-accent/15 p-1.5 text-accent hover:bg-accent/25 disabled:opacity-40 transition-colors"
          >
            {isQAStreaming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
