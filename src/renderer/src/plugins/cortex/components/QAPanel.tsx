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
import { GlassCard, GlassSurface, ScrollContainer } from '@renderer/components/ui'

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

      // Add user message first (regardless of agent availability for better UX)
      const userMsg: QAMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question.trim(),
        sources: [],
        timestamp: new Date().toISOString()
      }
      addQAMessage(userMsg)
      setInput('')

      if (!agent) {
        addQAMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            'No AI agent is configured. Go to **Settings → AI Agents** to set one up.',
          sources: [],
          timestamp: new Date().toISOString()
        })
        return
      }

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
      accumulatorRef.current = ''

      // Build system prompt with codebase context
      let enrichmentContext = ''

      // Progressive context — include available enrichments
      const digest = useCortexStore.getState().digest
      const hldContent = useCortexStore.getState().hldContent

      if (digest) {
        const patterns = digest.patterns.map((p) => `${p.name}: ${p.entities.join(', ')}`).join('\n')
        const boundaries = digest.boundaries.map((b) => `${b.name}: ${b.entities.join(', ')}`).join('\n')
        if (patterns) enrichmentContext += `\nArchitectural Patterns:\n${patterns}`
        if (boundaries) enrichmentContext += `\nLayer Boundaries:\n${boundaries}`
      }

      // Include entity summaries (up to 100)
      const summarizedEntities = analysisResult.entities
        .filter((e) => e.summary)
        .slice(0, 100)
        .map((e) => `${e.name} (${e.kind}): ${e.summary}`)
        .join('\n')
      if (summarizedEntities) {
        enrichmentContext += `\nEntity Descriptions:\n${summarizedEntities}`
      }

      // Include HLD overview if available
      if (hldContent) {
        const overviewSection = hldContent.split('## 2.')[0] ?? ''
        if (overviewSection.length < 2000) {
          enrichmentContext += `\nArchitecture Overview:\n${overviewSection}`
        }
      }

      // Include conversation history (last 5 Q+A pairs)
      const recentHistory = qaMessages.slice(-10)
      let historyText = ''
      for (const msg of recentHistory) {
        const prefix = msg.role === 'user' ? 'Q' : 'A'
        const content = msg.content.slice(0, 400)
        historyText += `${prefix}: ${content}\n`
      }
      if (historyText) {
        enrichmentContext += `\nPrevious conversation:\n${historyText}`
      }

      const systemPrompt = `You are a codebase expert analyzing a ${analysisResult.repoType} repository.
Repository type: ${analysisResult.repoType}, Framework: ${analysisResult.framework}, Language: ${analysisResult.language}

## Code Structure Summary
- ${analysisResult.stats.totalFiles} files, ${analysisResult.stats.totalLines} lines
- Entities: ${JSON.stringify(analysisResult.stats.entityCount)}
- API Routes: ${analysisResult.routes.length}

## Key Entities (top 50)
${analysisResult.entities
  .slice(0, 50)
  .map((e) => `- ${e.kind}: ${e.name} (${e.filePath}:${e.line})${e.summary ? ' — ' + e.summary : ''}`)
  .join('\n')}

## API Endpoints
${analysisResult.routes.map((r) => `- ${r.method} ${r.fullPath} -> ${r.handlerName} (${r.filePath}:${r.line})`).join('\n')}
${enrichmentContext}

Answer questions accurately. Reference specific files, functions, and line numbers. Format responses in markdown.`

      // Retrieve relevant source code via FTS5
      const activeRepo = useCortexStore.getState().repos.find(
        (r) => r.id === useCortexStore.getState().activeRepoId
      )
      let codeContext = ''
      if (activeRepo) {
        try {
          const searchResults = await window.api.cortex.searchCode(activeRepo.url, question.trim()) as Array<{ filePath: string; snippet: string }>
          if (searchResults.length > 0) {
            const snippets = searchResults.slice(0, 5)
            codeContext = '\n\nRelevant code snippets:\n' +
              snippets.map((s) => `--- ${s.filePath} ---\n${s.snippet}`).join('\n\n')
          }
        } catch {
          // FTS search optional — continue without code context
        }
      }

      const userPrompt = question.trim() + codeContext

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
          userPrompt,
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
      qaMessages,
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

  const agent = getCortexAgent()
  const hasAgent = !!agent

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <GlassSurface className="flex items-center justify-between px-4 py-2 rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-accent" />
          <span className="text-xs font-medium text-text-primary">Codebase Q&A</span>
          {agent && (
            <span className="text-[10px] text-text-secondary">
              Using: {agent.providerId}
            </span>
          )}
        </div>
        {qaMessages.length > 0 && (
          <button
            type="button"
            onClick={clearQA}
            className="rounded p-1 text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors"
            title="Clear chat"
          >
            <Trash2 size={13} />
          </button>
        )}
      </GlassSurface>

      {/* Messages area */}
      <ScrollContainer className="flex-1 px-4 py-3 space-y-3" showProgress={false}>
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
                <GlassCard
                  key={q}
                  variant="interactive"
                  className="px-4 py-2.5 text-xs text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-all text-left disabled:opacity-40 cursor-pointer"
                  onClick={() => { if (!isQAStreaming && hasAgent) handleSend(q) }}
                >
                  {q}
                </GlassCard>
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
              {msg.role === 'user' ? (
                <div className="max-w-[85%] bg-accent/[0.08] border border-accent/[0.15] rounded-2xl px-4 py-3 border-l-[3px] border-l-accent/40">
                  <p className="text-sm">{msg.content}</p>
                </div>
              ) : (
                <GlassCard className="max-w-[85%] px-4 py-3">
                  {msg.content ? (
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
                              title={`Open ${src.path}:${src.line}`}
                              className="flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 text-[10px] text-accent/80 hover:bg-white/[0.08] hover:text-accent transition-all hover:-translate-y-0.5"
                            >
                              <FileCode size={10} />
                              <span>{src.path}:{src.line}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Typing indicator */
                    <div className="flex items-center gap-1.5 px-2 py-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-accent/60"
                          style={{ animation: `typing-dot 1.2s infinite ${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  )}
                </GlassCard>
              )}
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </ScrollContainer>

      {/* Input area */}
      <GlassSurface className="p-3 rounded-none border-x-0 border-b-0">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 focus-within:border-accent/30">
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
            title="Send message"
            className="rounded-lg bg-accent/15 p-1.5 text-accent hover:bg-accent/25 active:scale-95 disabled:opacity-40 transition-all"
          >
            {isQAStreaming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </GlassSurface>
    </div>
  )
}
