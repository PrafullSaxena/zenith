/**
 * CodeBlockControls -- Toolbar for code block management in the Nebula editor.
 *
 * Appears when the cursor is inside a code block. Provides:
 *  - Auto-generated filename from code content
 *  - Language selector dropdown
 *  - Auto-format button (normalizes indentation, formats JSON)
 *  - Copy-to-clipboard button
 *
 * Follows the same pattern as TableControls.tsx — renders as a conditional
 * bar above the editor area when the cursor is inside a code block.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronDown, Wand2, FileCode2, Copy, Check } from 'lucide-react'
import { LANGUAGES } from '../../lib/lowlight-setup'

// ── File extension map ──────────────────────────────────────────────

const EXT_MAP: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.value, l.ext])
)

// ── Auto-generated filename from code content ───────────────────────

function inferFilename(code: string, language: string): string {
  const ext = EXT_MAP[language] ?? 'txt'
  const text = code.trim()

  if (!text || language === 'plaintext') return `snippet.${ext}`

  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/export\s+default\s+(?:function|class)\s+(\w+)/m, (m) => m[1]],
    [/export\s+(?:function|class)\s+(\w+)/m, (m) => m[1]],
    [/(?:public\s+)?class\s+(\w+)/m, (m) => m[1]],
    [/interface\s+(\w+)/m, (m) => m[1]],
    [/struct\s+(\w+)/m, (m) => m[1]],
    [/enum\s+(\w+)/m, (m) => m[1]],
    [/(?:func|fn|def|function)\s+(\w+)/m, (m) => m[1]],
    [/(?:package|module)\s+(\w+)/m, (m) => m[1]],
    [/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)/im, (m) => m[1]],
    [/FROM\s+["`]?(\w+)/im, (m) => `query_${m[1]}`]
  ]

  for (const [pattern, extract] of patterns) {
    const match = text.match(pattern)
    if (match) {
      const name = extract(match)
      const kebab = name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()
      return `${kebab}.${ext}`
    }
  }

  return `snippet.${ext}`
}

// ── Auto-format logic per language ──────────────────────────────────

function autoFormat(code: string, language: string): string {
  const trimmed = code.trim()
  if (!trimmed) return code

  switch (language) {
    case 'json': {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2)
      } catch {
        return code
      }
    }
    default: {
      const lines = code.split('\n')
      let minIndent = Infinity
      for (const line of lines) {
        if (line.trim().length === 0) continue
        const leading = line.match(/^(\s*)/)?.[1] ?? ''
        const normalized = leading.replace(/\t/g, '  ')
        if (normalized.length < minIndent) minIndent = normalized.length
      }
      if (minIndent === Infinity) minIndent = 0
      return lines
        .map((line) => {
          const normalized = line.replace(/\t/g, '  ')
          return normalized.slice(minIndent).trimEnd()
        })
        .join('\n')
        .trim()
    }
  }
}

// ── Component ───────────────────────────────────────────────────────

interface CodeBlockControlsProps {
  editor: Editor
}

export default function CodeBlockControls({ editor }: CodeBlockControlsProps): React.JSX.Element | null {
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [copied, setCopied] = useState(false)
  const langPickerRef = useRef<HTMLDivElement>(null)

  // Force re-render on every editor transaction so isActive/selection stay current.
  const [, setTick] = useState(0)
  useEffect(() => {
    const handler = (): void => setTick((t) => t + 1)
    editor.on('selectionUpdate', handler)
    editor.on('update', handler)
    return () => {
      editor.off('selectionUpdate', handler)
      editor.off('update', handler)
    }
  }, [editor])

  const isInCodeBlock = editor.isActive('codeBlock')

  // Close dropdown when leaving code block
  useEffect(() => {
    if (!isInCodeBlock) setShowLangPicker(false)
  }, [isInCodeBlock])

  // Click-outside handler for language dropdown
  useEffect(() => {
    if (!showLangPicker) return
    const handleClickOutside = (e: MouseEvent): void => {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) {
        setShowLangPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLangPicker])

  // Get current code block info
  const codeBlockInfo = useMemo(() => {
    if (!isInCodeBlock) return null
    const { $from } = editor.state.selection
    const node = $from.parent
    if (node.type.name !== 'codeBlock') return null
    const language = (node.attrs.language as string) || 'plaintext'
    const code = node.textContent
    const pos = $from.before($from.depth)
    return { node, language, code, pos }
  }, [isInCodeBlock, editor.state.selection])

  const filename = useMemo(
    () => (codeBlockInfo ? inferFilename(codeBlockInfo.code, codeBlockInfo.language) : ''),
    [codeBlockInfo]
  )

  const langLabel = useMemo(
    () =>
      codeBlockInfo
        ? (LANGUAGES.find((l) => l.value === codeBlockInfo.language)?.label ?? codeBlockInfo.language)
        : '',
    [codeBlockInfo]
  )

  const handleLanguageChange = useCallback(
    (newLang: string) => {
      editor.chain().focus().updateAttributes('codeBlock', { language: newLang }).run()
      setShowLangPicker(false)
    },
    [editor]
  )

  const handleFormat = useCallback(() => {
    if (!codeBlockInfo) return
    const { node, language, code, pos } = codeBlockInfo
    const formatted = autoFormat(code, language)
    if (formatted === code) return

    const { state } = editor
    const start = pos + 1
    const end = start + node.content.size
    editor.view.dispatch(state.tr.replaceWith(start, end, state.schema.text(formatted)))
  }, [editor, codeBlockInfo])

  const handleCopy = useCallback(() => {
    if (!codeBlockInfo) return
    navigator.clipboard.writeText(codeBlockInfo.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [codeBlockInfo])

  if (!isInCodeBlock || !codeBlockInfo) return null

  return (
    <div className="flex items-center gap-1 border-b border-border bg-secondary px-3 py-1">
      {/* Filename */}
      <FileCode2 size={10} className="text-primary/50" />
      <span className="font-mono text-[10px] text-muted-foreground/60">{filename}</span>

      <div className="mx-1.5 h-3.5 w-px bg-border" />

      {/* Language selector */}
      <div ref={langPickerRef} className="relative">
        <button
          type="button"
          onClick={() => setShowLangPicker(!showLangPicker)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          title="Change language"
        >
          {langLabel}
          <ChevronDown size={10} />
        </button>

        {showLangPicker && (
          <div className="absolute top-full right-0 z-50 mt-1 max-h-60 w-36 overflow-y-auto rounded-md border border-border bg-secondary p-1 shadow-lg">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => handleLanguageChange(lang.value)}
                className={`block w-full rounded px-2 py-1 text-left font-mono text-[10px] transition-colors hover:bg-primary/10 hover:text-foreground ${
                  lang.value === codeBlockInfo.language
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Format button */}
      <button
        type="button"
        onClick={handleFormat}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        title="Auto-format code"
      >
        <Wand2 size={11} />
      </button>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        title="Copy code"
      >
        {copied ? <Check size={11} className={copied ? 'text-emerald-400' : undefined} /> : <Copy size={11} className={copied ? 'text-emerald-400' : undefined} />}
      </button>
    </div>
  )
}
