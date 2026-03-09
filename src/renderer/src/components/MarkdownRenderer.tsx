/**
 * MarkdownRenderer — Renders common markdown elements:
 * code fences, headers, bold, italic, inline code, lists, paragraphs.
 * Lightweight — no external dependencies.
 *
 * Supports optional SQL query execution: when `onRunQuery` is provided,
 * SQL code fences render a "▶ Run" button that executes read-only queries
 * and displays results inline below the code block.
 */
import React from 'react'
import { Play, Loader2, AlertCircle } from 'lucide-react'
import { highlightCode } from '../lib/highlight'

/** Shape returned by window.api.db.query */
export interface QueryResult {
  rows: Record<string, unknown>[]
  fields: { name: string; dataTypeID: number }[]
  rowCount: number
  command: string
}

/** State for a single query execution */
export interface QueryExecState {
  result?: QueryResult
  isLoading: boolean
  error?: string
}

interface MarkdownRendererProps {
  text: string
  className?: string
  /** Called when user clicks "▶ Run" on a SQL code fence */
  onRunQuery?: (sql: string) => void
  /** Map of SQL → execution state (loading/result/error) */
  queryResults?: Map<string, QueryExecState>
}

/**
 * Split text into top-level blocks: code fences vs everything else.
 * Then render each block appropriately.
 */
export default function MarkdownRenderer({
  text,
  className,
  onRunQuery,
  queryResults
}: MarkdownRendererProps): React.JSX.Element {
  // Split by code fences first (``` ... ```)
  const blocks = text.split(/(```[\s\S]*?```)/g)

  return (
    <div className={`markdown-content ${className ?? ''}`}>
      {blocks.map((block, i) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          return (
            <CodeFenceBlock
              key={i}
              raw={block}
              onRunQuery={onRunQuery}
              queryResults={queryResults}
            />
          )
        }
        if (!block.trim()) return null
        return <InlineMarkdownBlock key={i} text={block} />
      })}
    </div>
  )
}

/** Render a ``` code fence block with optional SQL run button */
function CodeFenceBlock({
  raw,
  onRunQuery,
  queryResults
}: {
  raw: string
  onRunQuery?: (sql: string) => void
  queryResults?: Map<string, QueryExecState>
}): React.JSX.Element {
  const inner = raw.slice(3, -3)
  const newlineIdx = inner.indexOf('\n')
  const lang = newlineIdx >= 0 ? inner.slice(0, newlineIdx).trim().toLowerCase() : ''
  const code = newlineIdx >= 0 ? inner.slice(newlineIdx + 1) : inner
  const trimmedCode = code.trim()

  const isSql = lang === 'sql' || lang === 'postgresql' || lang === 'pgsql'
  const canRun = isSql && !!onRunQuery && trimmedCode.length > 0
  const execState = queryResults?.get(trimmedCode)

  return (
    <div className="my-3">
      <div className="group relative">
        {/* Language label + Run button header */}
        <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-surface-elevated/60 px-3 py-1.5">
          <span className="text-[9px] uppercase tracking-wider text-text-secondary/60">
            {lang || 'code'}
          </span>
          {canRun && (
            <button
              type="button"
              onClick={() => onRunQuery(trimmedCode)}
              disabled={execState?.isLoading}
              className="flex items-center gap-1 rounded bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
            >
              {execState?.isLoading ? (
                <>
                  <Loader2 size={10} className="animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play size={9} className="fill-current" />
                  Run
                </>
              )}
            </button>
          )}
        </div>
        <pre className="overflow-x-auto rounded-b-lg border border-border bg-surface px-4 py-3 font-mono text-[12px] leading-relaxed">
          <code
            className="hljs"
            dangerouslySetInnerHTML={{ __html: highlightCode(trimmedCode, lang || undefined) }}
          />
        </pre>
      </div>

      {/* Inline query result */}
      {execState && !execState.isLoading && (execState.result || execState.error) && (
        <QueryResultTable execState={execState} />
      )}
    </div>
  )
}

/** Maximum rows to display in the result table */
const MAX_DISPLAY_ROWS = 100

/** Render query results or error inline below a SQL code fence */
function QueryResultTable({ execState }: { execState: QueryExecState }): React.JSX.Element {
  if (execState.error) {
    return (
      <div className="mt-1 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
        <AlertCircle size={13} className="mt-0.5 shrink-0 text-red-400" />
        <div>
          <p className="text-[11px] font-medium text-red-400">Query Error</p>
          <p className="mt-0.5 font-mono text-[11px] text-red-400/80">{execState.error}</p>
        </div>
      </div>
    )
  }

  const { result } = execState
  if (!result) return <></>

  const { rows, fields, rowCount } = result
  const displayRows = rows.slice(0, MAX_DISPLAY_ROWS)
  const isTruncated = rows.length > MAX_DISPLAY_ROWS

  if (fields.length === 0) {
    return (
      <div className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[11px] text-text-secondary">
        Query executed successfully. {rowCount} row{rowCount !== 1 ? 's' : ''} affected.
      </div>
    )
  }

  return (
    <div className="mt-1 rounded-lg border border-border bg-surface">
      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="border-b border-border bg-surface-elevated/50">
              {fields.map((f, fi) => (
                <th
                  key={fi}
                  className="whitespace-nowrap px-3 py-1.5 text-left font-semibold text-text-secondary"
                >
                  {f.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-border/50 last:border-b-0 hover:bg-surface-elevated/30"
              >
                {fields.map((f, fi) => {
                  const val = row[f.name]
                  return (
                    <td key={fi} className="whitespace-nowrap px-3 py-1 text-text-primary">
                      {val === null ? (
                        <span className="text-text-secondary/40 italic">NULL</span>
                      ) : typeof val === 'object' ? (
                        JSON.stringify(val)
                      ) : (
                        String(val)
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-1.5 text-[10px] text-text-secondary">
        {isTruncated
          ? `Showing ${MAX_DISPLAY_ROWS} of ${rows.length} rows`
          : `${rowCount} row${rowCount !== 1 ? 's' : ''} returned`}
      </div>
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
            <h3 key={pi} className="mb-2 mt-4 text-sm font-semibold text-text-primary first:mt-0">
              {renderInline(trimmed.slice(4))}
            </h3>
          )
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={pi} className="mb-2 mt-4 text-[15px] font-bold text-text-primary first:mt-0">
              {renderInline(trimmed.slice(3))}
            </h2>
          )
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={pi} className="mb-3 mt-4 text-base font-bold text-text-primary first:mt-0">
              {renderInline(trimmed.slice(2))}
            </h1>
          )
        }

        // Check if this paragraph is a list
        const lines = trimmed.split('\n')
        const isNumberedList = lines.every((l) => /^\d+[.)]\s/.test(l.trim()) || !l.trim())
        const isBulletList = lines.every((l) => /^[-*•]\s/.test(l.trim()) || !l.trim())

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

        // Markdown table — lines with | separators and a ---+| divider row
        const isTable =
          lines.length >= 2 &&
          lines[0].includes('|') &&
          /^\|?\s*[-:\s|]+\s*\|?$/.test(lines[1].trim()) &&
          lines[1].includes('-')
        if (isTable) {
          const parseRow = (line: string): string[] =>
            line
              .trim()
              .replace(/^\||\|$/g, '')
              .split('|')
              .map((cell) => cell.trim())

          const headers = parseRow(lines[0])
          const bodyRows = lines
            .slice(2)
            .filter((l) => l.trim() && l.includes('|'))
            .map(parseRow)

          return (
            <div key={pi} className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated/50">
                    {headers.map((h, hi) => (
                      <th
                        key={hi}
                        className="whitespace-nowrap px-3 py-2 text-left font-semibold text-text-primary"
                      >
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-border/50 last:border-b-0 hover:bg-surface-elevated/30"
                    >
                      {headers.map((_, ci) => (
                        <td key={ci} className="px-3 py-1.5 text-text-primary">
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
