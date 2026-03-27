/**
 * InputPanel -- Left panel of the TextCraft three-panel layout.
 *
 * Card-wrapped textarea for typing or pasting text, with a footer
 * displaying live word and character counts.
 */

import { Card } from '@renderer/components/ui/card'
import { useTextCraftStore } from '../../stores/textcraft-store'

export default function InputPanel(): React.JSX.Element {
  const inputText = useTextCraftStore((s) => s.inputText)

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0
  const charCount = inputText.length

  return (
    <Card className="flex flex-col h-full overflow-hidden border-x-0 border-t-0 p-3">
      {/* Header */}
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 pb-1.5">
        Input
      </div>

      {/* Textarea */}
      <textarea
        value={inputText}
        onChange={(e) => useTextCraftStore.getState().setInputText(e.target.value)}
        placeholder="Type or paste your text here..."
        className="w-full flex-1 resize-none bg-transparent text-foreground placeholder-text-secondary/50 text-sm leading-relaxed p-2 focus:outline-none"
      />

      {/* Footer: word/char count */}
      <div className="text-xs text-muted-foreground px-1 pt-2 border-t border-white/[0.06]">
        {wordCount} words | {charCount} chars
      </div>
    </Card>
  )
}
