/**
 * MarkdownRenderer — Renders common markdown elements:
 * code fences, headers, bold, italic, inline code, lists, paragraphs.
 * Lightweight — no external dependencies.
 */
import React from 'react'

interface MarkdownRendererProps {
  text: string
  className?: string
}

/**
 * Split text into top-level blocks: code fences vs everything else.
 * Then render each block appropriately.
 */
export default function MarkdownRenderer({
  text,
  className
}: MarkdownRendererProps): React.JSX.Element {
  // Split by code fences first (``` ... ```)
  const blocks = text.split(/(```[\s\S]*?```)/g)

  return (
    <div className={`markdown-content ${className ?? ''}`}>
      {blocks.map((block, i) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          return <CodeFenceBlock key={i} raw={block} />
        }
        if (!block.trim()) return null
        return <InlineMarkdownBlock key={i} text={block} />
      })}
    </div>
  )
}

/** Render a ``` code fence block */
function CodeFenceBlock({ raw }: { raw: string }): React.JSX.Element {
  const inner = raw.slice(3, -3)
  const newlineIdx = inner.indexOf('\n')
  const lang = newlineIdx >= 0 ? inner.slice(0, newlineIdx).trim() : ''
  const code = newlineIdx >= 0 ? inner.slice(newlineIdx + 1) : inner

  return (
    <div className="group relative my-3">
      {lang && (
        <div className="absolute right-2 top-1.5 rounded bg-surface-elevated/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-secondary/60">
          {lang}
        </div>
      )}
      <pre className="overflow-x-auto rounded-lg border border-border bg-surface px-4 py-3 font-mono text-[12px] leading-relaxed text-accent">
        {code}
      </pre>
    </div>
  )
}

/** Render non-code-fence text with markdown formatting. */
function InlineMarkdownBlock({ text }: { text: string }): React.JSX.Element {
  // Split into paragraphs by double newlines
  const paragraphs = text.split(/\n{2,}/)

  return (
    <>
      {paragraphs.map((para, pi) => {
        const trimmed = para.trim()
        if (!trimmed) return null

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={pi}
              className="mb-2 mt-4 text-sm font-semibold text-text-primary first:mt-0"
            >
              {renderInline(trimmed.slice(4))}
            </h3>
          )
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={pi}
              className="mb-2 mt-4 text-[15px] font-bold text-text-primary first:mt-0"
            >
              {renderInline(trimmed.slice(3))}
            </h2>
          )
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={pi}
              className="mb-3 mt-4 text-base font-bold text-text-primary first:mt-0"
            >
              {renderInline(trimmed.slice(2))}
            </h1>
          )
        }

        // Check if this paragraph is a list
        const lines = trimmed.split('\n')
        const isNumberedList = lines.every(
          (l) => /^\d+[.)]\s/.test(l.trim()) || !l.trim()
        )
        const isBulletList = lines.every(
          (l) => /^[-*•]\s/.test(l.trim()) || !l.trim()
        )

        if (isNumberedList && lines.some((l) => /^\d+[.)]\s/.test(l.trim()))) {
          return (
            <ol key={pi} className="my-2 ml-1 space-y-1.5 text-sm text-text-primary">
              {lines.map((line, li) => {
                const clean = line.trim().replace(/^\d+[.)]\s*/, '')
                if (!clean) return null
                return (
                  <li key={li} className="flex gap-2">
                    <span className="shrink-0 font-medium text-accent/70">{li + 1}.</span>
                    <span className="leading-relaxed">{renderInline(clean)}</span>
                  </li>
                )
              })}
            </ol>
          )
        }

        if (isBulletList && lines.some((l) => /^[-*•]\s/.test(l.trim()))) {
          return (
            <ul key={pi} className="my-2 ml-1 space-y-1.5 text-sm text-text-primary">
              {lines.map((line, li) => {
                const clean = line.trim().replace(/^[-*•]\s*/, '')
                if (!clean) return null
                return (
                  <li key={li} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" />
                    <span className="leading-relaxed">{renderInline(clean)}</span>
                  </li>
                )
              })}
            </ul>
          )
        }

        // Regular paragraph
        return (
          <p key={pi} className="my-1.5 text-sm leading-relaxed text-text-primary">
            {renderInline(trimmed)}
          </p>
        )
      })}
    </>
  )
}

/**
 * Render inline markdown: **bold**, *italic*, `code`, [links]
 * Returns an array of React nodes.
 */
function renderInline(text: string): React.ReactNode {
  // Pattern: **bold**, *italic*, `inline code`
  const parts: React.ReactNode[] = []
  // Regex for inline elements — order matters
  const inlineRe = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = inlineRe.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-text-primary">
          {match[2]}
        </strong>
      )
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={`i-${match.index}`} className="italic text-text-primary/80">
          {match[3]}
        </em>
      )
    } else if (match[4]) {
      // `inline code`
      parts.push(
        <code
          key={`c-${match.index}`}
          className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] text-accent"
        >
          {match[4]}
        </code>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}
