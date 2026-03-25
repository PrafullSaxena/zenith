/**
 * HistoryPanel -- Shows all saved TextCraft refinements.
 *
 * Displayed as a separate tab in the TextCraft view.
 * Each entry shows truncated input, format, tones, and date inside GlassCards
 * with stagger entrance animation. Loading shows GlassSkeleton, empty shows EmptyState.
 */

import { Eye, Clock, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import { GlassCard, GlassBadge, EmptyState, ScrollContainer } from '@renderer/components/ui'
import { useTextCraftStore } from '../../stores/textcraft-store'
import type { FormatOption } from '../../types/textcraft'

const FORMAT_LABELS: Record<FormatOption, string> = {
  email: 'Email',
  'one-pager': 'One-Pager',
  'technical-doc': 'Technical Doc',
  rca: 'RCA',
  general: 'General',
  prompt: 'Prompt'
}

export default function HistoryPanel(): React.JSX.Element {
  const history = useTextCraftStore((s) => s.history)

  if (history.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No history yet"
        description="Paste text to refine"
        className="h-full w-full"
      />
    )
  }

  return (
    <ScrollContainer className="h-full p-4 w-full">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        {history.map((entry) => (
          <motion.div key={entry.id} variants={staggerItem}>
            <GlassCard variant="interactive" className="cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Input preview */}
                  <p className="text-sm text-text-primary line-clamp-2">
                    {entry.inputText.slice(0, 120)}{entry.inputText.length > 120 ? '...' : ''}
                  </p>

                  {/* Metadata row */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <GlassBadge variant="accent">
                      {FORMAT_LABELS[entry.options.format] || entry.options.format}
                    </GlassBadge>
                    {entry.options.tones.map((tone) => (
                      <GlassBadge key={tone} variant="neutral">
                        {tone}
                      </GlassBadge>
                    ))}
                    <span className="text-[10px] text-text-secondary/40 ml-auto">
                      {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Output preview */}
                  {entry.outputText && (
                    <p className="text-xs text-text-secondary/50 mt-1.5 line-clamp-1">
                      {entry.outputText.slice(0, 100)}{entry.outputText.length > 100 ? '...' : ''}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      useTextCraftStore.getState().loadFromHistory(entry)
                    }}
                    className="p-1.5 rounded text-text-secondary/60 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
                    title="Load this refinement"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      useTextCraftStore.getState().deleteHistoryEntry(entry.id)
                    }}
                    className="p-1.5 rounded text-text-secondary/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete this entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </ScrollContainer>
  )
}
