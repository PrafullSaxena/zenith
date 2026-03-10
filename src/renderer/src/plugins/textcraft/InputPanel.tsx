/**
 * InputPanel -- Left panel of the TextCraft three-panel layout.
 *
 * Full-height textarea for typing or pasting text, with a footer
 * displaying live word and character counts.
 */

import { useTextCraftStore } from '../../stores/textcraft-store'

export default function InputPanel(): React.JSX.Element {
  const inputText = useTextCraftStore((s) => s.inputText)

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0
  const charCount = inputText.length

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border/50">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Input
        </h2>
      </div>

      {/* Textarea */}
      <textarea
        value={inputText}
        onChange={(e) => useTextCraftStore.getState().setInputText(e.target.value)}
        placeholder="Type or paste your text here..."
        className="w-full flex-1 resize-none bg-transparent text-text-primary placeholder-text-secondary/50 text-sm leading-relaxed p-4 focus:outline-none"
      />

      {/* Footer: word/char count */}
      <div className="text-xs text-text-secondary px-4 py-2 border-t border-border/50">
        {wordCount} words | {charCount} chars
      </div>
    </div>
  )
}
