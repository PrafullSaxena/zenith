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
    <Card className="flex flex-col h-full overflow-hidden border-0 bg-transparent shadow-none p-3 rounded-xl">
      {/* Header */}
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 pb-1.5">
        Input
      </div>

      <textarea
        value={inputText}
        onChange={(e) => useTextCraftStore.getState().setInputText(e.target.value)}
        placeholder="Type or paste your text here..."
        className="w-full flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed p-2 focus:outline-none focus:ring-1 focus:ring-primary/50 rounded-md transition-shadow"
      />

      {/* Footer: word/char count */}
      <div className="text-[11px] font-medium tracking-wide text-muted-foreground/60 px-1 pt-2 border-t border-border/50 flex items-center gap-2 uppercase">
        <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        <span className="h-1 w-1 rounded-full bg-border" />
        <span>{charCount} {charCount === 1 ? 'char' : 'chars'}</span>
      </div>
    </Card>
  )
}
