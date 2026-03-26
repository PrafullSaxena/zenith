import React, { useState, useEffect, useRef } from 'react'
import {
  Copy,
  Check,
  FileText,
  FileDown,
  BookOpen,
  Play,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { highlightCode } from '@renderer/lib/highlight'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@renderer/components/ui/accordion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentRendererProps {
  content: string
  format?: 'markdown' | 'raw'
  isStreaming?: boolean
  actions?: ('copy-raw' | 'copy-md' | 'export-pdf' | 'save-as-note' | 'run-sql')[]
  onAction?: (action: string, context: { content: string; selection?: string }) => void
  citationLinks?: { label: string; onClick: () => void }[]
  collapsible?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Mermaid lazy loader
// ---------------------------------------------------------------------------

function MermaidBlock({ code, id }: { code: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: { primaryColor: '#7c3aed' }
        })
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, code)
        if (!cancelled) setSvg(renderedSvg)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render diagram')
      }
    })()
    return () => { cancelled = true }
  }, [code, id])

  if (error) {
    return (
      <div className="my-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
        <p className="font-medium mb-1">Mermaid Error</p>
        <pre className="text-xs whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-3 flex items-center justify-center py-8 bg-secondary/30 rounded-xl border border-border">
        <Loader2 size={16} className="animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Loading diagram...</span>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="my-3 flex justify-center p-4 bg-secondary/30 rounded-xl border border-border overflow-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ---------------------------------------------------------------------------
// Code Block
// ---------------------------------------------------------------------------

function CodeBlock({
  code,
  language,
  showRunSql,
  onRunSql
}: {
  code: string
  language: string
  showRunSql?: boolean
  onRunSql?: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const highlightedHtml = highlightCode(code, language || undefined)

  return (
    <div className="relative rounded-xl bg-secondary/50 border border-border overflow-hidden my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-border text-xs text-muted-foreground">
        <span>{language || 'code'}</span>
        <div className="flex items-center gap-1">
          {showRunSql && (
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onRunSql}>
              <Play size={12} className="mr-1" /> Run
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </Button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono">
        <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline markdown rendering
// ---------------------------------------------------------------------------

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const inlineRe = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = inlineRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(<strong key={`b-${match.index}`} className="font-semibold text-foreground">{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(<em key={`i-${match.index}`} className="italic text-foreground/80">{match[3]}</em>)
    } else if (match[4]) {
      parts.push(
        <code key={`c-${match.index}`} className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono text-primary">
          {match[4]}
        </code>
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

// ---------------------------------------------------------------------------
// Block-level parsing
// ---------------------------------------------------------------------------

interface ParsedBlock {
  type: 'code' | 'heading' | 'paragraph' | 'list' | 'blockquote' | 'table' | 'hr'
  content: string
  language?: string
  level?: number
  ordered?: boolean
}

function parseMarkdown(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  const rawBlocks = text.split(/(```[\s\S]*?```)/g)

  for (const block of rawBlocks) {
    if (block.startsWith('```') && block.endsWith('```')) {
      const inner = block.slice(3, -3)
      const nl = inner.indexOf('\n')
      const lang = nl >= 0 ? inner.slice(0, nl).trim().toLowerCase() : ''
      const code = nl >= 0 ? inner.slice(nl + 1).trim() : inner.trim()
      blocks.push({ type: 'code', content: code, language: lang })
      continue
    }

    const paragraphs = block.split(/\n{2,}/)
    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (!trimmed) continue

      if (/^[-*_]{3,}\s*$/.test(trimmed)) {
        blocks.push({ type: 'hr', content: '' })
        continue
      }

      if (trimmed.startsWith('### ')) {
        blocks.push({ type: 'heading', content: trimmed.slice(4), level: 3 })
      } else if (trimmed.startsWith('## ')) {
        blocks.push({ type: 'heading', content: trimmed.slice(3), level: 2 })
      } else if (trimmed.startsWith('# ')) {
        blocks.push({ type: 'heading', content: trimmed.slice(2), level: 1 })
      } else {
        const lines = trimmed.split('\n')
        const isNumbered = lines.every((l) => /^\d+[.)]\s/.test(l.trim()) || !l.trim())
        const isBullet = lines.every((l) => /^[-*•]\s/.test(l.trim()) || !l.trim())
        const isBq = lines.every((l) => /^>\s?/.test(l.trim()) || !l.trim()) && lines.some((l) => /^>\s?/.test(l.trim()))
        const isTable = lines.length >= 2 && lines[0].includes('|') && /^\|?\s*[-:\s|]+\s*\|?$/.test(lines[1].trim())

        if (isBq) {
          blocks.push({ type: 'blockquote', content: lines.map((l) => l.trim().replace(/^>\s?/, '')).join('\n') })
        } else if (isTable) {
          blocks.push({ type: 'table', content: trimmed })
        } else if (isNumbered && lines.some((l) => /^\d+[.)]\s/.test(l.trim()))) {
          blocks.push({ type: 'list', content: trimmed, ordered: true })
        } else if (isBullet && lines.some((l) => /^[-*•]\s/.test(l.trim()))) {
          blocks.push({ type: 'list', content: trimmed, ordered: false })
        } else {
          blocks.push({ type: 'paragraph', content: trimmed })
        }
      }
    }
  }

  return blocks
}

// ---------------------------------------------------------------------------
// Table rendering
// ---------------------------------------------------------------------------

function MarkdownTable({ content }: { content: string }) {
  const lines = content.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return null

  const parseRow = (line: string) =>
    line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

  const headers = parseRow(lines[0])
  const bodyRows = lines.slice(2).filter((l) => l.includes('|')).map(parseRow)

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-secondary">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left font-medium text-muted-foreground border-b border-border">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 last:border-b-0">
              {headers.map((_, ci) => (
                <td key={ci} className="px-4 py-2">
                  {renderInline(row[ci] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ContentRenderer
// ---------------------------------------------------------------------------

let mermaidCounter = 0

export function ContentRenderer({
  content,
  format = 'markdown',
  isStreaming = false,
  actions,
  onAction,
  citationLinks,
  collapsible = false,
  className
}: ContentRendererProps): React.JSX.Element {
  if (format === 'raw') {
    return (
      <pre className={cn('whitespace-pre-wrap font-mono text-sm p-4', className)}>
        {content}
      </pre>
    )
  }

  const blocks = parseMarkdown(content)

  const renderBlocks = (blocksToRender: ParsedBlock[]) =>
    blocksToRender.map((block, i) => {
      switch (block.type) {
        case 'code':
          if (block.language === 'mermaid') {
            return <MermaidBlock key={i} code={block.content} id={`${++mermaidCounter}`} />
          }
          return (
            <CodeBlock
              key={i}
              code={block.content}
              language={block.language ?? ''}
              showRunSql={
                actions?.includes('run-sql') &&
                ['sql', 'postgresql', 'pgsql'].includes(block.language ?? '')
              }
              onRunSql={() =>
                onAction?.('run-sql', { content: block.content })
              }
            />
          )
        case 'heading': {
          const cls =
            block.level === 1
              ? 'text-2xl font-semibold text-foreground mt-6 mb-3 first:mt-0'
              : block.level === 2
                ? 'text-xl font-semibold text-foreground mt-5 mb-2 first:mt-0'
                : 'text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0'
          return (
            <div key={i} className={cls}>
              {renderInline(block.content)}
            </div>
          )
        }
        case 'paragraph':
          return (
            <p key={i} className="text-foreground/90 leading-relaxed my-2 text-sm">
              {renderInline(block.content)}
            </p>
          )
        case 'list': {
          const lines = block.content.split('\n').filter((l) => l.trim())
          if (block.ordered) {
            return (
              <ol key={i} className="my-2 ml-1 space-y-1.5 text-sm">
                {lines.map((line, li) => (
                  <li key={li} className="flex gap-2">
                    <span className="shrink-0 font-medium text-primary/70">{li + 1}.</span>
                    <span className="leading-relaxed">{renderInline(line.replace(/^\d+[.)]\s*/, ''))}</span>
                  </li>
                ))}
              </ol>
            )
          }
          return (
            <ul key={i} className="my-2 ml-1 space-y-1.5 text-sm">
              {lines.map((line, li) => (
                <li key={li} className="flex items-start gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span className="leading-relaxed">{renderInline(line.replace(/^[-*•]\s*/, ''))}</span>
                </li>
              ))}
            </ul>
          )
        }
        case 'blockquote':
          return (
            <blockquote key={i} className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground my-3 text-sm">
              {renderInline(block.content)}
            </blockquote>
          )
        case 'table':
          return <MarkdownTable key={i} content={block.content} />
        case 'hr':
          return <hr key={i} className="my-4 border-t border-border/50" />
        default:
          return null
      }
    })

  // Collapsible mode: group blocks by heading sections
  const renderContent = () => {
    if (collapsible) {
      const sections: { heading: string; blocks: ParsedBlock[] }[] = []
      let current: { heading: string; blocks: ParsedBlock[] } = { heading: '', blocks: [] }

      for (const block of blocks) {
        if (block.type === 'heading' && block.level === 2) {
          if (current.heading || current.blocks.length > 0) {
            sections.push(current)
          }
          current = { heading: block.content, blocks: [] }
        } else {
          current.blocks.push(block)
        }
      }
      if (current.heading || current.blocks.length > 0) {
        sections.push(current)
      }

      if (sections.length <= 1) {
        return renderBlocks(blocks)
      }

      return (
        <Accordion type="multiple" defaultValue={sections.length > 0 ? ['section-0'] : []}>
          {sections.map((section, i) => (
            <AccordionItem key={i} value={`section-${i}`}>
              <AccordionTrigger className="text-lg font-semibold">
                {section.heading || 'Introduction'}
              </AccordionTrigger>
              <AccordionContent>{renderBlocks(section.blocks)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )
    }

    return renderBlocks(blocks)
  }

  return (
    <div className={cn('content-renderer', className)}>
      {renderContent()}

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-4 w-32 rounded" />
          <span className="animate-pulse text-primary">|</span>
        </div>
      )}

      {/* Citation links */}
      {citationLinks && citationLinks.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {citationLinks.map((cite, i) => (
            <button
              key={i}
              onClick={cite.onClick}
              className="text-primary text-sm hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <FileText size={12} />
              {cite.label}
            </button>
          ))}
        </div>
      )}

      {/* Action bar */}
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 pt-3 border-t border-border mt-4">
          {actions.includes('copy-raw') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(content)
                toast.success('Copied to clipboard')
              }}
            >
              <Copy size={14} className="mr-1.5" /> Copy
            </Button>
          )}
          {actions.includes('copy-md') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(content)
                toast.success('Markdown copied to clipboard')
              }}
            >
              <FileText size={14} className="mr-1.5" /> Copy Markdown
            </Button>
          )}
          {actions.includes('export-pdf') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction?.('export-pdf', { content })}
            >
              <FileDown size={14} className="mr-1.5" /> Export PDF
            </Button>
          )}
          {actions.includes('save-as-note') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction?.('save-as-note', { content })}
            >
              <BookOpen size={14} className="mr-1.5" /> Save as Note
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
