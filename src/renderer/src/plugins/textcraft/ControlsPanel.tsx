/**
 * ControlsPanel -- Middle panel of the TextCraft three-panel layout.
 *
 * Provides tone selection (5 options), format selection (4 options),
 * custom instructions textarea, and Refine/Cancel action button.
 * Agent resolution follows the AiAdvisor.tsx pattern with fallback.
 */

import { useTextCraftStore } from '../../stores/textcraft-store'
import { useAgentStore } from '../../stores/agent-store'
import { useSettingsStore } from '../../stores/settings-store'
import type { ToneOption, FormatOption } from '../../types/textcraft'

const TONE_OPTIONS: { value: ToneOption; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' }
]

const FORMAT_OPTIONS: { value: FormatOption; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'one-pager', label: 'One-Pager' },
  { value: 'technical-doc', label: 'Technical Doc' },
  { value: 'general', label: 'General' }
]

export default function ControlsPanel(): React.JSX.Element {
  const inputText = useTextCraftStore((s) => s.inputText)
  const options = useTextCraftStore((s) => s.options)
  const session = useTextCraftStore((s) => s.session)

  // Agent resolution -- same pattern as AiAdvisor.tsx
  const providers = useAgentStore((s) => s.providers)
  const getSetting = useSettingsStore((s) => s.getSetting)
  const defaultAgentId = getSetting('plugins.textcraft.defaultAgent') as string | undefined
  const agent = defaultAgentId
    ? providers.find((p) => p.id === defaultAgentId)
    : providers.find((p) => p.status === 'connected' || p.hasApiKey)

  const isStreaming = session?.status === 'streaming'
  const canRefine = inputText.trim().length > 0 && !isStreaming && !!agent

  const handleRefine = (): void => {
    if (!agent) return
    void useTextCraftStore
      .getState()
      .startRefinement(agent.id, agent.model || agent.id, agent.command || 'sdk')
  }

  const handleCancel = (): void => {
    useTextCraftStore.getState().cancelRefinement()
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Section 1: Tone Selection */}
      <div>
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
          Tone
        </h3>
        <div className="space-y-1.5">
          {TONE_OPTIONS.map((opt) => {
            const isActive = options.tone === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => useTextCraftStore.getState().setOptions({ tone: opt.value })}
                className={`w-full rounded-lg py-2 px-3 text-sm text-left transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Section 2: Format Selection */}
      <div>
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
          Format
        </h3>
        <div className="space-y-1.5">
          {FORMAT_OPTIONS.map((opt) => {
            const isActive = options.format === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => useTextCraftStore.getState().setOptions({ format: opt.value })}
                className={`w-full rounded-lg py-2 px-3 text-sm text-left transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Section 3: Custom Instructions */}
      <div>
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
          Additional Instructions
        </h3>
        <textarea
          value={options.customInstructions}
          onChange={(e) =>
            useTextCraftStore.getState().setOptions({ customInstructions: e.target.value })
          }
          placeholder="e.g., Make it shorter, emphasize security..."
          rows={3}
          className="w-full resize-none rounded-lg bg-transparent text-text-primary placeholder-text-secondary/50 text-sm leading-relaxed p-3 border border-border/50 focus:outline-none focus:border-accent/50"
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Section 4: Action Button */}
      <div>
        {!agent && (
          <p className="text-xs text-warning mb-2">Configure an AI agent in Settings</p>
        )}

        {isStreaming ? (
          <button
            type="button"
            onClick={handleCancel}
            className="w-full rounded-lg py-2.5 text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 transition-colors hover:bg-red-500/30"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRefine}
            disabled={!canRefine}
            className="w-full rounded-lg py-2.5 text-sm font-medium bg-accent text-background transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refine
          </button>
        )}
      </div>
    </div>
  )
}
