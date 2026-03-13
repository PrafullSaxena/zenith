/**
 * HistoryPanel -- Shows all saved TextCraft refinements.
 *
 * Displayed as a separate tab in the TextCraft view.
 * Each entry shows truncated input, format, tones, and date.
 * Clicking "Load" restores input + config + output to the main view.
 */

import { Eye, Clock, Trash2 } from 'lucide-react'
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
      <div className="flex h-full flex-col items-center justify-center">
        <Clock size={32} className="text-text-secondary/30 mb-3" />
        <p className="text-sm text-text-secondary/50">No refinements yet</p>
        <p className="text-xs text-text-secondary/30 mt-1">Your saved refinements will appear here</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-2">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="group rounded-lg border border-border/50 bg-surface/50 p-3 transition-colors hover:border-border hover:bg-surface-elevated/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Input preview */}
                <p className="text-sm text-text-primary line-clamp-2">
                  {entry.inputText.slice(0, 120)}{entry.inputText.length > 120 ? '...' : ''}
                </p>

                {/* Metadata row */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-block rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                    {FORMAT_LABELS[entry.options.format] || entry.options.format}
                  </span>
                  {entry.options.tones.map((tone) => (
                    <span
                      key={tone}
                      className="inline-block rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-text-secondary"
                    >
                      {tone}
                    </span>
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
                  onClick={() => useTextCraftStore.getState().loadFromHistory(entry)}
                  className="p-1.5 rounded text-text-secondary/60 hover:text-accent hover:bg-accent/10 transition-colors"
                  title="Load this refinement"
                >
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => useTextCraftStore.getState().deleteHistoryEntry(entry.id)}
                  className="p-1.5 rounded text-text-secondary/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete this entry"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
