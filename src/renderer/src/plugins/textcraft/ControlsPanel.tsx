/**
 * ControlsPanel -- Middle panel of the TextCraft three-panel layout.
 *
 * Provides tone selection (multi-select, 6 options), format selection via Select,
 * custom instructions textarea, and Button Refine/Cancel action.
 * Agent resolution follows the AiAdvisor.tsx pattern with fallback.
 */

import { Card } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { SimpleSelect } from '@renderer/components/ui/select'
import { motion } from 'framer-motion'
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
    <Card className="flex flex-col h-full gap-2.5 overflow-y-auto border-white/5 bg-black/20 backdrop-blur-md p-3 rounded-xl shadow-lg">
      {/* Header */}
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 pb-1">
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
        <div className="space-y-1">
          {TONE_OPTIONS.map((opt) => {
            const isActive = options.tones.includes(opt.value)
            return (
              <motion.button
                key={opt.value}
                type="button"
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleToggleTone(opt.value)}
                className={`w-full rounded-lg py-1.5 px-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-primary/20 text-primary border border-primary/50 shadow-sm'
                    : 'bg-white/4 text-muted-foreground hover:text-foreground hover:bg-white/6 border border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">{opt.label}</span>
                  <span className={`text-[10px] ${isActive ? 'text-(--primary)/70' : 'text-muted-foreground/40'}`}>
                    {opt.description}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/4" />

      {/* Section 2: Format Selection via Select */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Format
        </h3>
        <SimpleSelect
          options={FORMAT_OPTIONS}
          value={options.format}
          onChange={handleFormatChange}
          placeholder="Select format..."
        />
      </div>

      {/* Divider */}
      <div className="border-t border-white/4" />

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
          className="w-full resize-none rounded-xl h-24 bg-black/40 border border-white/10 text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed p-3 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
        />
      </div>

      {/* Divider */}
      <div className="border-t border-white/4" />

      {/* Section 4: Action Button */}
      <div>
        {!agent && (
          <p className="text-xs text-warning mb-2">Configure an AI agent in Settings</p>
        )}

        {isStreaming ? (
          <Button
            variant="destructive"
            size="lg"
            className="w-full rounded-xl"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        ) : (
          <Button
            variant="default"
            size="lg"
            className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:shadow-[0_0_20px_rgba(var(--primary),0.5)] transition-all"
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
