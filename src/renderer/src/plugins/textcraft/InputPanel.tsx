/**
 * InputPanel -- Left panel of the TextCraft three-panel layout.
 *
 * GlassCard-wrapped textarea for typing or pasting text, with a footer
 * displaying live word and character counts.
 */

import { GlassCard } from '@renderer/components/ui'
import { useTextCraftStore } from '../../stores/textcraft-store'

export default function InputPanel(): React.JSX.Element {
  const inputText = useTextCraftStore((s) => s.inputText)

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0
  const charCount = inputText.length

  return (
    <GlassCard className="flex flex-col h-full overflow-hidden rounded-none border-x-0 border-t-0">
      {/* Header */}
      <div className="text-xs font-medium text-text-secondary uppercase tracking-wider px-1 pb-2">
        Input
      </div>

      {/* Textarea */}
      <textarea
        value={inputText}
        onChange={(e) => useTextCraftStore.getState().setInputText(e.target.value)}
        placeholder="Type or paste your text here..."
        className="w-full flex-1 resize-none bg-transparent text-text-primary placeholder-text-secondary/50 text-sm leading-relaxed p-2 focus:outline-none"
      />

      {/* Footer: word/char count */}
      <div className="text-xs text-text-secondary px-1 pt-2 border-t border-white/[0.06]">
        {wordCount} words | {charCount} chars
      </div>
    </GlassCard>
  )
}
