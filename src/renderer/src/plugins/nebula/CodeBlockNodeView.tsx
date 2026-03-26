/**
 * CodeBlockNodeView -- Custom React NodeView for code blocks with:
 *  - Language selector dropdown (visible on hover)
 *  - Auto-format button
 *  - Auto-generated filename from code content
 *  - Visual styling: left accent border, entrance animation, header bar
 *
 * Syntax highlighting is handled by lowlight's ProseMirror plugin
 * (decorations applied to the contentDOM element by CodeBlockLowlight).
 */

import { useCallback, useMemo, useState, lazy, Suspense } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { ChevronDown, Wand2, FileCode2, Copy, Check, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { LANGUAGES } from '../../lib/lowlight-setup'
import { useSettingsStore } from '../../stores/settings-store'

const MermaidRenderer = lazy(() => import('../db-inspector/MermaidRenderer'))

// ── File extension map ──────────────────────────────────────────────

const EXT_MAP: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.value, l.ext])
)

// ── Auto-generated filename from code content ───────────────────────

function inferFilename(code: string, language: string): string {
  const ext = EXT_MAP[language] ?? 'txt'
  const text = code.trim()

  if (!text || language === 'plaintext') return `snippet.${ext}`

  // Try to extract a meaningful name from the code
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    // export default function/class App
    [/export\s+default\s+(?:function|class)\s+(\w+)/m, (m) => m[1]],
    // export function/class Foo
    [/export\s+(?:function|class)\s+(\w+)/m, (m) => m[1]],
    // public class Foo / class Foo
    [/(?:public\s+)?class\s+(\w+)/m, (m) => m[1]],
    // interface Foo
    [/interface\s+(\w+)/m, (m) => m[1]],
    // struct Foo
    [/struct\s+(\w+)/m, (m) => m[1]],
    // enum Foo
    [/enum\s+(\w+)/m, (m) => m[1]],
    // func main / fn main / def main / function main
    [/(?:func|fn|def|function)\s+(\w+)/m, (m) => m[1]],
    // package main / module foo
    [/(?:package|module)\s+(\w+)/m, (m) => m[1]],
    // CREATE TABLE foo
    [/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)/im, (m) => m[1]],
    // SELECT ... FROM foo
    [/FROM\s+["`]?(\w+)/im, (m) => `query_${m[1]}`],
  ]

  for (const [pattern, extract] of patterns) {
    const match = text.match(pattern)
    if (match) {
      const name = extract(match)
      // Convert PascalCase/camelCase to kebab-case for filenames
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
    case 'java':
    case 'javascript':
    case 'typescript':
    case 'c':
    case 'cpp':
    case 'csharp':
    case 'go':
    case 'rust':
    case 'kotlin':
    case 'swift':
    case 'scala':
    case 'dart': {
      // Brace-based re-indentation for C-style languages
      const raw = trimmed.split('\n').map((l) => l.trim())
      const result: string[] = []
      let depth = 0
      for (const line of raw) {
        if (!line) { result.push(''); continue }
        // Decrease depth for closing braces/parens at start of line
        if (/^[}\])>]/.test(line)) depth = Math.max(0, depth - 1)
        result.push('  '.repeat(depth) + line)
        // Increase depth for opening braces at end of line
        const stripped = line.replace(/\/\/.*$/, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '')
        const opens = (stripped.match(/[{(\[]/g) ?? []).length
        const closes = (stripped.match(/[})\]]/g) ?? []).length
        depth = Math.max(0, depth + opens - closes)
      }
      return result.join('\n')
    }
    default: {
      // General cleanup: normalize indentation to 2 spaces, trim trailing whitespace
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

// ── NodeView Component ──────────────────────────────────────────────

export default function CodeBlockNodeView({
  node,
  updateAttributes,
  editor,
  getPos
}: NodeViewProps): React.JSX.Element {
  const language: string = (node.attrs.language as string) || 'plaintext'
  const code = node.textContent
  const [copied, setCopied] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)

  // Mermaid live preview state (global setting from top ribbon)
  const isMermaid = language === 'mermaid'
  const showMermaidPreview = useSettingsStore((s) => s.getSetting('plugins.nebula.showMermaidPreview')) as boolean | undefined
  const showDiagram = isMermaid && showMermaidPreview !== false

  const filename = useMemo(() => inferFilename(code, language), [code, language])

  const langLabel = useMemo(
    () => LANGUAGES.find((l) => l.value === language)?.label ?? language,
    [language]
  )

  const handleLanguageChange = useCallback(
    (newLang: string) => {
      updateAttributes({ language: newLang })
      setShowLangPicker(false)
    },
    [updateAttributes]
  )

  const handleFormat = useCallback(() => {
    const formatted = autoFormat(code, language)
    if (formatted === code) return

    // Use getPos() to find this node's position in the document
    const pos = typeof getPos === 'function' ? getPos() : undefined
    if (typeof pos !== 'number') return

    const start = pos + 1
    const end = start + node.content.size
    const { tr } = editor.state
    tr.replaceWith(start, end, editor.state.schema.text(formatted))
    editor.view.dispatch(tr)
  }, [code, language, node, editor, getPos])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [code])

  return (
    <NodeViewWrapper className="nebula-code-block group">
      {/* Header bar */}
      <div className="code-block-header" contentEditable={false}>
        <div className="flex items-center gap-2">
          <FileCode2 size={12} className="text-primary/60" />
          <span className="code-block-filename">{filename}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Language selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="code-block-action-btn"
              title="Change language"
            >
              <span>{langLabel}</span>
              <ChevronDown size={10} />
            </button>

            {showLangPicker && (
              <div className="code-block-lang-dropdown">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => handleLanguageChange(lang.value)}
                    className={`code-block-lang-option ${
                      lang.value === language ? 'text-primary' : ''
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
            className="code-block-action-btn code-block-hover-action"
            title="Auto-format code"
          >
            <Wand2 size={11} />
          </button>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className="code-block-action-btn code-block-hover-action"
            title="Copy code"
          >
            <span icon={copied ? Check : Copy} iconKey={copied ? 'check' : 'copy'} size={11} className={copied ? 'text-emerald-400' : undefined} />
          </button>
        </div>
      </div>

      {/* Mermaid diagram or code content */}
      {showDiagram && code.trim() ? (
        <div className="relative p-2" contentEditable={false}>
          <Suspense fallback={
            <div className="flex items-center justify-center py-6 text-muted-foreground/50">
              <Loader2 size={16} className="animate-spin mr-2" />
              Rendering diagram...
            </div>
          }>
            <MermaidRenderer syntax={code} interactive />
          </Suspense>
        </div>
      ) : (
        <pre className="code-block-pre">
          <NodeViewContent as="code" className={`hljs language-${language}`} />
        </pre>
      )}
    </NodeViewWrapper>
  )
}
