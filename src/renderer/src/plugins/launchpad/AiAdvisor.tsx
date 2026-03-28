/**
 * AiAdvisor — AI chat panel for cloud infrastructure recommendations.
 *
 * Uses ChatInterface for the chat interface. Streams AI responses and parses
 * structured suggestion blocks. When suggestions are detected, shows a
 * banner with Apply/Dismiss buttons.
 *
 * IMPORTANT: Suggestions are NEVER auto-applied. User must click "Apply".
 */
import React, { useState, useMemo } from 'react'
import { Sparkles, MessageSquare, Square, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import { useAgentStore } from '../../stores/agent-store'
import { useSettingsStore } from '../../stores/settings-store'
import { ChatInterface, type ChatMessage } from '../../components/shared/chat-interface'

const EXAMPLE_PROMPTS = [
  'I need a simple web app with 2 servers, a database, and file storage',
  'Help me design a data processing pipeline for 500GB/month of data',
  'What services do I need for a microservices architecture with 10 services?',
  'Estimate costs for a startup serving 100K daily users with global CDN'
]

export default function AiAdvisor(): React.JSX.Element {
  const [, setQuestion] = useState('')

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

  // Map AI session data to ChatInterface messages
  const messages: ChatMessage[] = useMemo(() => {
    if (!aiSession) return []
    const msgs: ChatMessage[] = []

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
            <Sparkles size={32} className="mx-auto mb-2 text-[hsl(var(--muted-foreground))]/30" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Ask about cloud infrastructure</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]/60">
              AI will suggest services and configurations with estimated costs
            </p>
          </div>

          <div className="w-full max-w-lg space-y-3">
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]/60 text-center mb-3">
              Example prompts
            </p>
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-3 cursor-pointer rounded-xl border border-white/5 bg-black/20 hover:bg-white/5 transition-colors backdrop-blur-md shadow-sm"
                onClick={() => handleExamplePrompt(prompt)}
              >
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{prompt}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-white/[0.06] p-4">
          <ChatInterface
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

  // Active session — use ChatInterface
  return (
    <div className="flex flex-col h-full">
      {/* Chat area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ChatInterface
          messages={messages}
          onSend={handleSubmit}
          isStreaming={isStreaming}
          placeholder={
            isStreaming
              ? 'Waiting for response...'
              : 'Ask another question... (Enter to send)'
          }
          className="flex-1"
        />
      </div>

      {/* Streaming controls */}
      {isStreaming && (
        <div className="shrink-0 border-t border-white/[0.06] px-4 py-2 flex justify-center">
          <Button variant="destructive" size="sm" onClick={cancelAiChat}>
            <Square size={12} />
            Stop
          </Button>
        </div>
      )}

      {/* Error state */}
      {aiSession.status === 'error' && aiSession.error && (
        <div className="mx-4 mb-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 shadow-[0_0_15px_rgba(239,68,68,0.1)] backdrop-blur-md">
          <p className="text-xs font-medium text-destructive">{aiSession.error}</p>
        </div>
      )}

      {/* Suggestion banner */}
      {pendingSuggestions && aiSession.status === 'complete' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="mx-4 mb-4 rounded-xl border border-primary/40 bg-primary/10 p-4 shadow-[0_0_30px_rgba(var(--primary),0.15)] backdrop-blur-xl relative overflow-hidden"
        >
          {/* subtle moving highlight */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
          
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={13} className="text-[var(--primary)]" />
                <p className="text-xs font-semibold text-[var(--primary)]">
                  AI has suggested a configuration
                </p>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {pendingSuggestions.provider.toUpperCase()} &mdash;{' '}
                {pendingSuggestions.services.length} service
                {pendingSuggestions.services.length !== 1 ? 's' : ''} recommended
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {pendingSuggestions.services.map((svc, i) => (
                  <Badge key={i} variant="default">
                    {svc.serviceId}
                  </Badge>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={dismissSuggestions}
              className="shrink-0 rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              title="Dismiss suggestions"
            >
              <X size={13} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handleApply}>
              Apply Suggestions
            </Button>
            <Button variant="default" size="sm" onClick={dismissSuggestions}>
              Dismiss
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
