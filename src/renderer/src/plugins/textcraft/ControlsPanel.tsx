/**
 * ControlsPanel -- Middle panel of the TextCraft three-panel layout.
 *
 * Provides tone selection (multi-select, 6 options), format selection via Select,
 * custom instructions textarea, and Button Refine/Cancel action.
 * Agent resolution follows the AiAdvisor.tsx pattern with fallback.
 */

import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useTextCraftStore } from '../../stores/textcraft-store'
import { useAgentStore } from '../../stores/agent-store'
import { useSettingsStore } from '../../stores/settings-store'
import type { ToneOption, FormatOption } from '../../types/textcraft'

const TONE_OPTIONS: { value: ToneOption; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Business-ready' },
  { value: 'casual', label: 'Casual', description: 'Relaxed & friendly' },
  { value: 'technical', label: 'Technical', description: 'Precise jargon' },
  { value: 'friendly', label: 'Friendly', description: 'Warm & personal' },
  { value: 'concise', label: 'Concise', description: 'Brief & direct' },
  { value: 'instructive', label: 'Instructive', description: 'Clear directives' }
]

const FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'one-pager', label: 'One-Pager' },
  { value: 'technical-doc', label: 'Technical Doc' },
  { value: 'rca', label: 'RCA' },
  { value: 'general', label: 'General' },
  { value: 'prompt', label: 'Prompt' }
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

  const handleToggleTone = (tone: ToneOption): void => {
    const current = options.tones
    const isSelected = current.includes(tone)

    if (isSelected) {
      if (current.length <= 1) return
      useTextCraftStore.getState().setOptions({
        tones: current.filter((t) => t !== tone)
      })
    } else {
      useTextCraftStore.getState().setOptions({
        tones: [...current, tone]
      })
    }
  }

  const handleFormatChange = (value: string): void => {
    useTextCraftStore.getState().setOptions({ format: value as FormatOption })
  }

  const handleRefine = (): void => {
    if (!agent) return
    void useTextCraftStore
      .getState()
      .startRefinement(agent.id, agent.model || agent.id, agent.command || undefined)
  }

  const handleCancel = (): void => {
    useTextCraftStore.getState().cancelRefinement()
  }

  return (
    <Card className="flex flex-col h-full gap-4 overflow-y-auto rounded-none border-x-0 border-t-0">
      {/* Header */}
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        Controls
      </div>

      {/* Section 1: Tone Selection (multi-select) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Tone
          </h3>
          <span className="text-[10px] text-muted-foreground/60">
            {options.tones.length} selected
          </span>
        </div>
        <div className="space-y-1.5">
          {TONE_OPTIONS.map((opt) => {
            const isActive = options.tones.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleToggleTone(opt.value)}
                className={`w-full rounded-lg py-2 px-3 text-left transition-colors ${
                  isActive
                    ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
                    : 'bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{opt.label}</span>
                  <span className={`text-[10px] ${isActive ? 'text-[var(--primary)]/70' : 'text-muted-foreground/40'}`}>
                    {opt.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06]" />

      {/* Section 2: Format Selection via Select */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Format
        </h3>
        <Select
          options={FORMAT_OPTIONS}
          value={options.format}
          onChange={handleFormatChange}
          placeholder="Select format..."
        />
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06]" />

      {/* Section 3: Custom Instructions */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Additional Instructions
        </h3>
        <textarea
          value={options.customInstructions}
          onChange={(e) =>
            useTextCraftStore.getState().setOptions({ customInstructions: e.target.value })
          }
          placeholder="e.g., Make it shorter, emphasize security..."
          rows={3}
          className="w-full resize-none rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-foreground placeholder-text-secondary/50 text-sm leading-relaxed p-3 focus:outline-none focus:shadow-[hsl(var(--primary))]"
        />
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06]" />

      {/* Section 4: Action Button */}
      <div>
        {!agent && (
          <p className="text-xs text-warning mb-2">Configure an AI agent in Settings</p>
        )}

        {isStreaming ? (
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        ) : (
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={handleRefine}
            disabled={!canRefine}
          >
            Refine
          </Button>
        )}
      </div>
    </Card>
  )
}
