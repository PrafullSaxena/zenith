/**
 * HistoryPanel -- Shows all saved TextCraft refinements.
 *
 * Displayed as a separate tab in the TextCraft view.
 * Each entry shows truncated input, format, tones, and date inside Cards
 * with stagger entrance animation. Loading shows Skeleton, empty shows div.
 */

import { Eye, Clock, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import { Card } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { EmptyState } from '@renderer/components/ui/EmptyState'
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
    <div className="h-full overflow-y-auto p-3 w-full">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-1"
      >
        {history.map((entry) => (
          <motion.div key={entry.id} variants={staggerItem}>
            <div
              className="group cursor-pointer rounded-xl border border-border/50 bg-card/60 px-3 py-2.5 transition-colors hover:bg-card"
              onClick={() => useTextCraftStore.getState().loadFromHistory(entry)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Input preview */}
                  <p className="text-sm text-foreground line-clamp-1">
                    {entry.inputText.slice(0, 120)}{entry.inputText.length > 120 ? '...' : ''}
                  </p>

                  {/* Metadata row */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant="default">
                      {FORMAT_LABELS[entry.options.format] || entry.options.format}
                    </Badge>
                    {entry.options.tones.map((tone) => (
                      <Badge key={tone} variant="default">
                        {tone}
                      </Badge>
                    ))}
                  </div>

                  {/* Output preview */}
                  {entry.outputText && (
                    <p className="text-xs text-muted-foreground/50 mt-1 line-clamp-1">
                      {entry.outputText.slice(0, 100)}{entry.outputText.length > 100 ? '...' : ''}
                    </p>
                  )}
                </div>

                {/* Right: timestamp + actions */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/40">
                    {new Date(entry.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      useTextCraftStore.getState().deleteHistoryEntry(entry.id)
                    }}
                    className="p-1 rounded-lg text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete this entry"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
