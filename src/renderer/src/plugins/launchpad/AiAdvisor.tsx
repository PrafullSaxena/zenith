/**
 * AiAdvisor — AI chat panel for cloud infrastructure recommendations.
 *
 * Uses GlassChat for the chat interface. Streams AI responses and parses
 * structured suggestion blocks. When suggestions are detected, shows a
 * banner with Apply/Dismiss buttons.
 *
 * IMPORTANT: Suggestions are NEVER auto-applied. User must click "Apply".
 */
import React, { useState, useMemo } from 'react'
import { Sparkles, MessageSquare, Square, X } from 'lucide-react'
import { GlassChat, GlassCard, GlassButton, GlassBadge, EmptyState } from '@renderer/components/ui'
import type { GlassChatMessage } from '@renderer/components/ui'
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

  // Store
  const aiSession = useLaunchpadStore((s) => s.aiSession)
  const pendingSuggestions = useLaunchpadStore((s) => s.pendingSuggestions)
  const startAiChat = useLaunchpadStore((s) => s.startAiChat)
  const cancelAiChat = useLaunchpadStore((s) => s.cancelAiChat)
  const applySuggestions = useLaunchpadStore((s) => s.applySuggestions)
  const dismissSuggestions = useLaunchpadStore((s) => s.dismissSuggestions)
  const setActiveTab = useLaunchpadStore((s) => s.setActiveTab)

  // Agent selection
  const providers = useAgentStore((s) => s.providers)
  const getSetting = useSettingsStore((s) => s.getSetting)

  const defaultAgentId = getSetting('plugins.launchpad.defaultAgent') as string | undefined
  const agent = defaultAgentId
    ? providers.find((p) => p.id === defaultAgentId)
    : providers.find((p) => p.status === 'connected' || p.hasApiKey)
  const hasAgent = !!agent

  const isStreaming = aiSession?.status === 'streaming'

  const handleSubmit = (text: string): void => {
    if (!text.trim() || !hasAgent || isStreaming) return
    if (!agent) return

    const q = text.trim()
    setQuestion('')
    void startAiChat(q, agent.id, agent.model, agent.command)
  }

  const handleExamplePrompt = (prompt: string): void => {
    if (!hasAgent || isStreaming) return
    setQuestion(prompt)
  }

  const handleApply = (): void => {
    applySuggestions()
    setActiveTab('estimator')
  }

  // Map AI session data to GlassChat messages
  const messages: GlassChatMessage[] = useMemo(() => {
    if (!aiSession) return []
    const msgs: GlassChatMessage[] = []

    // Question message
    msgs.push({
      id: 'user-question',
      role: 'user',
      content: aiSession.question
    })

    // Response message (strip suggestions block from display)
    if (aiSession.rawText) {
      msgs.push({
        id: 'ai-response',
        role: 'assistant',
        content: aiSession.rawText.replace(/```suggestions[\s\S]*?```/g, '').trim()
      })
    }

    return msgs
  }, [aiSession])

  // Markdown renderer for assistant messages
  const renderContent = (content: string) => (
    <MarkdownRenderer text={content} className="text-sm leading-relaxed" />
  )

  // If no provider selected, show empty state
  if (!hasAgent && !aiSession) {
    return (
      <div className="flex flex-col h-full">
        <EmptyState
          icon={MessageSquare}
          title="Configure an AI agent"
          description="Set up an AI agent in Settings to get cloud cost advice and service recommendations"
          className="flex-1"
        />
      </div>
    )
  }

  // No session yet — show example prompts
  if (!aiSession) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center mb-6">
            <Sparkles size={32} className="mx-auto mb-2 text-[var(--text-secondary)]/30" />
            <p className="text-sm text-[var(--text-secondary)]">Ask about cloud infrastructure</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]/60">
              AI will suggest services and configurations with estimated costs
            </p>
          </div>

          <div className="w-full max-w-lg space-y-2">
            <p className="text-xs font-medium text-[var(--text-secondary)]/60 text-center mb-3">
              Example prompts
            </p>
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <GlassCard
                key={i}
                variant="interactive"
                className="p-3 cursor-pointer"
                onClick={() => handleExamplePrompt(prompt)}
              >
                <p className="text-xs text-[var(--text-secondary)]">{prompt}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-white/[0.06] p-4">
          <GlassChat
            messages={[]}
            onSend={handleSubmit}
            isStreaming={false}
            placeholder="e.g., I need a web app with 2 servers, a database, and file storage..."
            className="h-auto"
          />
        </div>
      </div>
    )
  }

  // Active session — use GlassChat
  return (
    <div className="flex flex-col h-full">
      {/* Chat area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <GlassChat
          messages={messages}
          onSend={handleSubmit}
          isStreaming={isStreaming}
          placeholder={
            isStreaming
              ? 'Waiting for response...'
              : 'Ask another question... (Enter to send)'
          }
          renderContent={renderContent}
          className="flex-1"
        />
      </div>

      {/* Streaming controls */}
      {isStreaming && (
        <div className="shrink-0 border-t border-white/[0.06] px-4 py-2 flex justify-center">
          <GlassButton variant="danger" size="sm" onClick={cancelAiChat}>
            <Square size={12} />
            Stop
          </GlassButton>
        </div>
      )}

      {/* Error state */}
      {aiSession.status === 'error' && aiSession.error && (
        <GlassCard className="mx-4 mb-2 border-[var(--color-error)]/30 bg-[var(--color-error)]/5">
          <p className="text-xs text-[var(--color-error)]">{aiSession.error}</p>
        </GlassCard>
      )}

      {/* Suggestion banner */}
      {pendingSuggestions && aiSession.status === 'complete' && (
        <GlassCard className="mx-4 mb-4 border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={13} className="text-[var(--color-accent)]" />
                <p className="text-xs font-semibold text-[var(--color-accent)]">
                  AI has suggested a configuration
                </p>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {pendingSuggestions.provider.toUpperCase()} &mdash;{' '}
                {pendingSuggestions.services.length} service
                {pendingSuggestions.services.length !== 1 ? 's' : ''} recommended
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {pendingSuggestions.services.map((svc, i) => (
                  <GlassBadge key={i} variant="accent">
                    {svc.serviceId}
                  </GlassBadge>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={dismissSuggestions}
              className="shrink-0 rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Dismiss suggestions"
            >
              <X size={13} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <GlassButton variant="primary" size="sm" onClick={handleApply}>
              Apply Suggestions
            </GlassButton>
            <GlassButton variant="default" size="sm" onClick={dismissSuggestions}>
              Dismiss
            </GlassButton>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
