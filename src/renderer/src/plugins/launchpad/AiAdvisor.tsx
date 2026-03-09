/**
 * AiAdvisor — AI chat panel for cloud infrastructure recommendations.
 *
 * Streams AI responses and parses structured suggestion blocks.
 * When suggestions are detected, shows a banner with Apply/Dismiss buttons.
 * Apply auto-populates the estimator with the AI's recommended services.
 *
 * IMPORTANT: Suggestions are NEVER auto-applied. User must click "Apply".
 */
import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Square, Sparkles, X } from 'lucide-react'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import { useAgentStore } from '../../stores/agent-store'
import { useSettingsStore } from '../../stores/settings-store'
import MarkdownRenderer from '../../components/MarkdownRenderer'

const EXAMPLE_PROMPTS = [
  'I need a simple web app with 2 servers, a database, and file storage',
  'Help me design a data processing pipeline for 500GB/month of data',
  'What services do I need for a microservices architecture with 10 services?',
  'Estimate costs for a startup serving 100K daily users with global CDN'
]

export default function AiAdvisor(): React.JSX.Element {
  const [question, setQuestion] = useState('')
  const responseRef = useRef<HTMLDivElement>(null)

  // Store
  const aiSession = useLaunchpadStore((s) => s.aiSession)
  const pendingSuggestions = useLaunchpadStore((s) => s.pendingSuggestions)
  const startAiChat = useLaunchpadStore((s) => s.startAiChat)
  const cancelAiChat = useLaunchpadStore((s) => s.cancelAiChat)
  const applySuggestions = useLaunchpadStore((s) => s.applySuggestions)
  const dismissSuggestions = useLaunchpadStore((s) => s.dismissSuggestions)
  const setActiveTab = useLaunchpadStore((s) => s.setActiveTab)

  // Agent selection — default agent is configured in plugin settings page
  const providers = useAgentStore((s) => s.providers)
  const getSetting = useSettingsStore((s) => s.getSetting)

  const defaultAgentId = getSetting('plugins.launchpad.defaultAgent') as string | undefined
  const agent = defaultAgentId
    ? providers.find((p) => p.id === defaultAgentId)
    : providers.find((p) => p.status === 'connected' || p.hasApiKey)
  const hasAgent = !!agent

  const isStreaming = aiSession?.status === 'streaming'

  // Auto-scroll during streaming
  useEffect(() => {
    if (aiSession?.status === 'streaming' && responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [aiSession?.rawText, aiSession?.status])

  const handleSubmit = (): void => {
    if (!question.trim() || !hasAgent || isStreaming) return
    if (!agent) return

    const q = question.trim()
    setQuestion('')
    void startAiChat(q, agent.id, agent.model, agent.command)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExamplePrompt = (prompt: string): void => {
    if (!hasAgent || isStreaming) return
    setQuestion(prompt)
  }

  const handleApply = (): void => {
    applySuggestions()
    setActiveTab('estimator')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">AI Cloud Advisor</h2>
          {agent && (
            <span className="ml-auto text-[10px] text-text-secondary/60">{agent.name}</span>
          )}
        </div>
        <p className="text-xs text-text-secondary">
          Describe your infrastructure needs and get service recommendations with cost estimates
        </p>
      </div>

      {/* Response area */}
      <div ref={responseRef} className="flex-1 overflow-y-auto p-4">
        {!aiSession && (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="text-center mb-6">
              <Sparkles size={32} className="mx-auto mb-2 text-text-secondary/30" />
              <p className="text-sm text-text-secondary">Ask about cloud infrastructure</p>
              <p className="mt-1 text-xs text-text-secondary/60">
                AI will suggest services and configurations with estimated costs
              </p>
            </div>

            {/* Example prompts */}
            <div className="w-full max-w-lg space-y-2">
              <p className="text-xs font-medium text-text-secondary/60 text-center mb-3">
                Example prompts
              </p>
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!hasAgent || isStreaming}
                  onClick={() => handleExamplePrompt(prompt)}
                  className="w-full text-left rounded-lg border border-border/50 bg-surface/50 px-3 py-2 text-xs text-text-secondary transition-colors hover:border-accent/30 hover:text-text-primary hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {!hasAgent && (
              <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400 max-w-sm text-center">
                Configure an AI agent in Settings to use the advisor
              </div>
            )}
          </div>
        )}

        {aiSession && (
          <div className="space-y-3">
            {/* Question */}
            <div className="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2">
              <p className="text-xs font-medium text-accent mb-1">Question</p>
              <p className="text-sm text-text-primary">{aiSession.question}</p>
            </div>

            {/* Response */}
            <div className="rounded-lg bg-surface-elevated px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-medium text-text-secondary">Response</p>
                {isStreaming && <Loader2 size={10} className="animate-spin text-accent" />}
              </div>

              {aiSession.rawText ? (
                <div>
                  {/* Render formatted markdown — strip suggestions block from display */}
                  <MarkdownRenderer
                    text={aiSession.rawText.replace(/```suggestions[\s\S]*?```/g, '').trim()}
                    className="text-sm leading-relaxed"
                  />
                  {isStreaming && (
                    <span className="inline-block h-3 w-0.5 bg-accent/60 animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
              ) : (
                isStreaming && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary/50">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/60" />
                    Thinking...
                  </div>
                )
              )}

              {/* Error state */}
              {aiSession.status === 'error' && aiSession.error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 mt-2">
                  {aiSession.error}
                </div>
              )}
            </div>

            {/* Suggestion banner — shown when AI parsed a valid configuration */}
            {pendingSuggestions && aiSession.status === 'complete' && (
              <div className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={13} className="text-accent" />
                      <p className="text-xs font-semibold text-accent">
                        AI has suggested a configuration
                      </p>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {pendingSuggestions.provider.toUpperCase()} —{' '}
                      {pendingSuggestions.services.length} service
                      {pendingSuggestions.services.length !== 1 ? 's' : ''} recommended
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={dismissSuggestions}
                    className="shrink-0 rounded p-0.5 text-text-secondary hover:text-text-primary transition-colors"
                    title="Dismiss suggestions"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApply}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
                  >
                    Apply Suggestions
                  </button>
                  <button
                    type="button"
                    onClick={dismissSuggestions}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary hover:bg-surface"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="flex gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !hasAgent
                ? 'Configure an AI agent in Settings to use the advisor...'
                : isStreaming
                  ? 'Waiting for response...'
                  : 'e.g., I need a web app with 2 servers, a database, and file storage... (⌘+Enter to send)'
            }
            disabled={!hasAgent || isStreaming}
            rows={3}
            className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <div className="flex flex-col gap-1">
            {isStreaming ? (
              <button
                type="button"
                onClick={cancelAiChat}
                className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                <Square size={12} />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!hasAgent || !question.trim() || isStreaming}
                className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={12} />
                Ask
              </button>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-text-secondary/40">
          ⌘+Enter to send &bull; AI responses may include estimated costs
        </p>
      </div>
    </div>
  )
}
