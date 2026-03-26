/**
 * QueryOptimizer — Paste SQL, get EXPLAIN ANALYZE + AI optimization.
 * Each analysis is a collapsible tile with structured sections:
 * EXPLAIN, Insights, Query Flow (Mermaid), Tradeoffs, Suggestions, Optimized Query.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Square,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  AlertCircle,
  Copy,
  Check,
  Lightbulb,
  GitBranch,
  Scale,
  ListChecks,
  Code2,
  ChevronsUpDown,
  Clock,
  FileDown,
  AlignLeft,
  FileText
} from 'lucide-react'
import type {
  QueryOptimizationSession,
  OptimizationSuggestion,
  OptimizerTile
} from '../../types/database'
import { useDbStore } from '../../stores/db-store'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { staggerContainer, staggerItem } from '../../lib/motion'
import MermaidRenderer from './MermaidRenderer'
import { highlightCode } from '../../lib/highlight'
import { renderInline } from '../../components/MarkdownRenderer'

// ── Clipboard helper ──────────────────────────────────────────────

async function writeClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

// ── Strip markdown syntax to plain text ───────────────────────────

function stripMarkdown(md: string): string {
  let t = md
  t = t.replace(/^```[\w-]*\n?/gm, '')
  t = t.replace(/^~~~[\w-]*\n?/gm, '')
  t = t.replace(/^#{1,6}\s+/gm, '')
  t = t.replace(/\*\*\*(.+?)\*\*\*/g, '$1')
  t = t.replace(/___(.+?)___/g, '$1')
  t = t.replace(/\*\*(.+?)\*\*/g, '$1')
  t = t.replace(/__(.+?)__/g, '$1')
  t = t.replace(/\*(.+?)\*/g, '$1')
  t = t.replace(/_(.+?)_/g, '$1')
  t = t.replace(/~~(.+?)~~/g, '$1')
  t = t.replace(/`(.+?)`/g, '$1')
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  t = t.replace(/^>\s?/gm, '')
  t = t.replace(/^(\s*)[-*]\s+/gm, '$1• ')
  t = t.replace(/^[-*_]{3,}\s*$/gm, '')
  t = t.replace(/\n{3,}/g, '\n\n')
  return t.trim()
}

// ── Compose tile content as markdown ──────────────────────────────

function composeTileMarkdown(tile: OptimizerTile): string {
  const { session } = tile
  const lines: string[] = ['# Query Optimization Report', '']

  lines.push('## Original Query', '```sql', tile.originalQuery, '```', '')

  if (session.explainOutput) {
    lines.push('## EXPLAIN ANALYZE', '```', session.explainOutput, '```', '')
  }

  if (session.insights.length > 0) {
    lines.push('## Insights')
    for (const i of session.insights) lines.push(`- ${i}`)
    lines.push('')
  }

  if (session.tradeoffs.length > 0) {
    lines.push('## Tradeoffs')
    for (const t of session.tradeoffs) lines.push(`- ${t}`)
    lines.push('')
  }

  if (session.suggestions.length > 0) {
    lines.push('## Suggestions')
    for (const s of session.suggestions) {
      const sevLabel = SEVERITY_CONFIG[s.severity]?.label ?? s.severity
      const typeLabel = TYPE_LABELS[s.type] ?? s.type
      lines.push(`### [${sevLabel}] ${typeLabel}: ${s.title}`)
      lines.push(s.explanation, '')
      if (s.suggestedSQL) {
        lines.push('```sql', s.suggestedSQL, '```', '')
      }
    }
  }

  if (session.optimizedQuery) {
    lines.push('## Optimized Query', '```sql', session.optimizedQuery, '```', '')
  }

  if (session.summary) {
    lines.push('## Summary', session.summary, '')
  }

  return lines.join('\n')
}

// ── Export as PDF via native pdfmake (main process) ──────────────

async function exportTileAsPDF(tile: OptimizerTile): Promise<void> {
  const md = composeTileMarkdown(tile)
  await window.api.app.exportPdf({ markdown: md, title: 'Query Optimization Report' })
}

interface QueryOptimizerProps {
  session: QueryOptimizationSession | null
  tiles: OptimizerTile[]
  hasConnection: boolean
  hasAgent: boolean
  onStart: (sql: string) => void
  onCancel: () => void
}

const SEVERITY_CONFIG: Record<
  string,
  { badge: string; border: string; icon: typeof AlertCircle; label: string }
> = {
  high: {
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    border: 'border-l-red-500',
    icon: AlertCircle,
    label: 'High Impact'
  },
  medium: {
    badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    border: 'border-l-orange-500',
    icon: AlertTriangle,
    label: 'Medium Impact'
  },
  low: {
    badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    border: 'border-l-blue-500',
    icon: Info,
    label: 'Low Impact'
  }
}

const TYPE_LABELS: Record<string, string> = {
  'missing-index': 'Missing Index',
  'query-rewrite': 'Query Rewrite',
  'anti-pattern': 'Anti-Pattern',
  statistics: 'Statistics',
  general: 'General'
}

export default function QueryOptimizer({
  session,
  tiles,
  hasConnection,
  hasAgent,
  onStart,
  onCancel
}: QueryOptimizerProps): React.JSX.Element {
  const [sql, setSql] = useState('')
  const streamRef = useRef<HTMLDivElement>(null)

  // Consume pending SQL from QueryTab's Explain button
  const pendingOptimizerSql = useDbStore((s) => s.pendingOptimizerSql)
  const setPendingOptimizerSql = useDbStore((s) => s.setPendingOptimizerSql)

  useEffect(() => {
    if (pendingOptimizerSql) {
      setSql(pendingOptimizerSql)
      setPendingOptimizerSql(null)
    }
  }, [pendingOptimizerSql, setPendingOptimizerSql])

  useEffect(() => {
    if (session?.status === 'streaming' && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight
    }
  }, [session?.rawText, session?.status])

  const handleAnalyze = (): void => {
    if (!sql.trim() || !hasConnection || !hasAgent) return
    onStart(sql.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAnalyze()
    }
  }

  const isActive =
    session?.status === 'streaming' || session?.status === 'analyzing'
  const canAnalyze = hasConnection && hasAgent && !isActive

  return (
    <div className="flex h-full flex-col">
      {/* SQL input */}
      <Card className="shrink-0 rounded-none border-x-0 border-t-0 p-4">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasConnection
              ? 'Connect to a database first...'
              : !hasAgent
                ? 'Configure an AI agent in Settings...'
                : 'Paste your SQL query here... (Cmd+Enter to analyze)'
          }
          disabled={!canAnalyze}
          rows={4}
          className="w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-white/[0.03] px-3 py-2 font-mono text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:border-[var(--primary)] focus:outline-none disabled:opacity-50"
        />
        <div className="mt-2 flex items-center gap-2">
          {isActive ? (
            <Button variant="destructive" size="sm" onClick={onCancel}>
              <Square size={12} />
              Cancel
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleAnalyze}
              disabled={!canAnalyze || !sql.trim()}
            >
              <Zap size={12} />
              Analyze Query
            </Button>
          )}
          {session?.status === 'analyzing' && (
            <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
              <Loader2 size={12} className="animate-spin text-[var(--primary)]" />
              Running EXPLAIN ANALYZE...
            </span>
          )}
          {session?.status === 'streaming' && (
            <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
              <Loader2 size={12} className="animate-spin text-[var(--primary)]" />
              AI analyzing...
            </span>
          )}
        </div>
      </Card>

      {/* Results area */}
      <div ref={streamRef} className="flex-1 overflow-auto p-4">
        {!session && tiles.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div
              icon={Zap}
              title="No query to optimize"
              description="Paste a SQL query and click Analyze. AI will run EXPLAIN ANALYZE, inspect indexes and statistics, then suggest optimizations."
            />
          </div>
        )}

        {/* Active streaming session */}
        {session && session.status === 'streaming' && (
          <Card className="mb-4 overflow-hidden border-[var(--primary)]/30 bg-gradient-to-b from-[var(--primary)]/5 to-transparent p-0">
            <div className="flex items-center gap-2 border-b border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
              <p className="text-xs font-medium text-[var(--primary)]">AI Analysis in progress</p>
            </div>
            <pre className="max-h-64 overflow-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-[hsl(var(--foreground))]">
              {session.rawText || 'Analyzing...'}
            </pre>
          </Card>
        )}

        {/* Error state */}
        {session?.status === 'error' && session.error && (
          <Card className="mb-4 border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {session.error}
          </Card>
        )}

        {/* Completed tiles with stagger animation */}
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {tiles.map((tile) => (
            <motion.div key={tile.id} variants={staggerItem}>
              <TileCard tile={tile} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

// ── Tile Card ──────────────────────────────────────────────────────

function TileCard({ tile }: { tile: OptimizerTile }): React.JSX.Element {
  const { session } = tile
  const [expanded, setExpanded] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['suggestions'])
  )
  const [copiedMode, setCopiedMode] = useState<null | 'raw' | 'formatted'>(null)
  const [isExporting, setIsExporting] = useState(false)

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  const handleCopyRaw = useCallback(async () => {
    const md = composeTileMarkdown(tile)
    await writeClipboard(stripMarkdown(md))
    setCopiedMode('raw')
    setTimeout(() => setCopiedMode(null), 2000)
  }, [tile])

  const handleCopyFormatted = useCallback(async () => {
    await writeClipboard(composeTileMarkdown(tile))
    setCopiedMode('formatted')
    setTimeout(() => setCopiedMode(null), 2000)
  }, [tile])

  const handleExportPDF = useCallback(async (): Promise<void> => {
    if (isExporting) return
    setIsExporting(true)
    try {
      await exportTileAsPDF(tile)
    } finally {
      setIsExporting(false)
    }
  }, [tile, isExporting])

  const allSectionIds = [
    session.explainOutput && 'explain',
    session.insights.length > 0 && 'insights',
    session.mermaidDiagram && 'flow',
    session.tradeoffs.length > 0 && 'tradeoffs',
    session.suggestions.length > 0 && 'suggestions'
  ].filter(Boolean) as string[]

  const allExpanded = allSectionIds.every((id) => expandedSections.has(id))

  const toggleAll = useCallback(() => {
    setExpandedSections(allExpanded ? new Set() : new Set(allSectionIds))
  }, [allExpanded, allSectionIds])

  const timeLabel = new Date(tile.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  const sugCount = session.suggestions.length
  const highCount = session.suggestions.filter(
    (s) => s.severity === 'high'
  ).length

  return (
    <Card className="overflow-hidden p-0">
      {/* Tile header */}
      <div className="flex w-full items-center gap-3 bg-white/[0.02] px-4 py-3">
        {/* Clickable left region: expand/collapse */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors"
        >
          {expanded ? (
            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
          )}
          <Zap size={13} className="shrink-0 text-primary" />
          <p className="min-w-0 truncate font-mono text-[11px] text-foreground">
            {tile.originalQuery.slice(0, 100)}
            {tile.originalQuery.length > 100 ? '…' : ''}
          </p>
        </button>

        {/* Right region: badges + export actions */}
        <div className="flex shrink-0 items-center gap-2">
          {highCount > 0 && (
            <Badge variant="destructive">
              {highCount} critical
            </Badge>
          )}
          {sugCount > 0 && (
            <Badge variant="secondary">
              {sugCount} suggestion{sugCount !== 1 ? 's' : ''}
            </Badge>
          )}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Clock size={9} />
            {timeLabel}
          </span>

          {/* Separator */}
          <div className="h-4 w-px bg-border/40" />

          {/* Export buttons */}
          <button
            type="button"
            onClick={() => void handleExportPDF()}
            disabled={isExporting}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            title="Export as PDF (save to file)"
          >
            {isExporting ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
            {isExporting ? 'Exporting…' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={() => void handleCopyRaw()}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Copy plain text (no formatting)"
          >
            <span icon={copiedMode === 'raw' ? Check : AlignLeft} iconKey={copiedMode === 'raw' ? 'check' : 'alignleft'} size={11} className={copiedMode === 'raw' ? 'text-success' : undefined} />
            {copiedMode === 'raw' ? 'Copied!' : 'Raw Text'}
          </button>
          <button
            type="button"
            onClick={() => void handleCopyFormatted()}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Copy formatted markdown"
          >
            <span icon={copiedMode === 'formatted' ? Check : FileText} iconKey={copiedMode === 'formatted' ? 'check' : 'filetext'} size={11} className={copiedMode === 'formatted' ? 'text-success' : undefined} />
            {copiedMode === 'formatted' ? 'Copied!' : 'Formatted'}
          </button>
        </div>
      </div>

      {/* Tile body */}
      {expanded && (
        <div>
          {/* Collapse/Expand All bar */}
          {allSectionIds.length > 1 && (
            <div className="flex justify-end border-t border-border bg-card px-3 py-1">
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronsUpDown size={10} />
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          )}

          <div className="divide-y divide-border/60">
            {/* EXPLAIN ANALYZE */}
            {session.explainOutput && (
              <Section
                id="explain"
                label="EXPLAIN ANALYZE"
                icon={<Code2 size={12} className="text-violet-400" />}
                isExpanded={expandedSections.has('explain')}
                onToggle={toggleSection}
              >
                <pre className="max-h-48 overflow-auto rounded-lg bg-secondary/50 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  {session.explainOutput}
                </pre>
              </Section>
            )}

            {/* Insights */}
            {session.insights.length > 0 && (
              <Section
                id="insights"
                label={`Insights (${session.insights.length})`}
                icon={<Lightbulb size={12} className="text-yellow-400" />}
                isExpanded={expandedSections.has('insights')}
                onToggle={toggleSection}
              >
                <ul className="space-y-2">
                  {session.insights.map((insight, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg bg-secondary/30 px-3 py-2 text-xs text-foreground"
                    >
                      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400/60" />
                      <span className="leading-relaxed">{renderInline(insight)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Query Flow (Mermaid) */}
            {session.mermaidDiagram && (
              <Section
                id="flow"
                label="Query Flow"
                icon={<GitBranch size={12} className="text-cyan-400" />}
                isExpanded={expandedSections.has('flow')}
                onToggle={toggleSection}
              >
                <div className="overflow-auto rounded-lg bg-secondary/30 p-3">
                  <MermaidRenderer syntax={session.mermaidDiagram} />
                </div>
              </Section>
            )}

            {/* Tradeoffs */}
            {session.tradeoffs.length > 0 && (
              <Section
                id="tradeoffs"
                label={`Tradeoffs (${session.tradeoffs.length})`}
                icon={<Scale size={12} className="text-orange-400" />}
                isExpanded={expandedSections.has('tradeoffs')}
                onToggle={toggleSection}
              >
                <ul className="space-y-2">
                  {session.tradeoffs.map((tradeoff, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10 px-3 py-2 text-xs text-foreground"
                    >
                      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400/60" />
                      <span className="leading-relaxed">{renderInline(tradeoff)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Suggestions */}
            {session.suggestions.length > 0 && (
              <Section
                id="suggestions"
                label={`Suggestions (${session.suggestions.length})`}
                icon={<ListChecks size={12} className="text-primary" />}
                isExpanded={expandedSections.has('suggestions')}
                onToggle={toggleSection}
              >
                <div className="space-y-3">
                  {session.suggestions.map((s, i) => (
                    <SuggestionCard key={i} suggestion={s} index={i + 1} />
                  ))}
                </div>
              </Section>
            )}

            {/* Optimized Query (standalone) */}
            {session.optimizedQuery && (
              <div className="px-4 py-3">
                <OptimizedQueryBlock query={session.optimizedQuery} />
              </div>
            )}

            {/* Summary */}
            {session.summary && (
              <div className="bg-gradient-to-r from-accent/5 to-transparent px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Summary
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                  {renderInline(session.summary)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Collapsible Section ────────────────────────────────────────────

function Section({
  id,
  label,
  icon,
  isExpanded,
  onToggle,
  children
}: {
  id: string
  label: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: (id: string) => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50"
      >
        {isExpanded ? (
          <ChevronDown size={11} className="shrink-0" />
        ) : (
          <ChevronRight size={11} className="shrink-0" />
        )}
        {icon}
        <span>{label}</span>
      </button>
      {isExpanded && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

// ── Suggestion Card ────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  index
}: {
  suggestion: OptimizationSuggestion
  index: number
}): React.JSX.Element {
  const config = SEVERITY_CONFIG[suggestion.severity] ?? SEVERITY_CONFIG.low
  const Icon = config.icon
  const [sqlCopied, setSqlCopied] = useState(false)

  const handleCopySql = useCallback(() => {
    if (suggestion.suggestedSQL) {
      navigator.clipboard.writeText(suggestion.suggestedSQL)
      setSqlCopied(true)
      setTimeout(() => setSqlCopied(false), 2000)
    }
  }, [suggestion.suggestedSQL])

  const badgeVariant = suggestion.severity === 'high' ? 'error' as const : suggestion.severity === 'medium' ? 'warning' as const : 'info' as const

  return (
    <Card
      className={`overflow-hidden p-0 border-l-2 ${config.border}`}
    >
      <div className="px-3 py-2.5">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.04] text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
            {index}
          </span>
          <Badge variant={badgeVariant}>
            <Icon size={9} />
            {config.label}
          </Badge>
          <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
            {TYPE_LABELS[suggestion.type] ?? suggestion.type}
          </span>
        </div>

        {/* Title + explanation */}
        <p className="mt-2 text-[13px] font-medium text-foreground">
          {renderInline(suggestion.title)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {renderInline(suggestion.explanation)}
        </p>
      </div>

      {/* Suggested SQL */}
      {suggestion.suggestedSQL && (
        <div className="border-t border-border bg-card/50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Suggested Fix
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <span icon={sqlCopied ? Check : Copy} iconKey={sqlCopied ? 'check' : 'copy'} size={9} className={sqlCopied ? 'text-success' : undefined} />
              {sqlCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
            <code
              className="hljs"
              dangerouslySetInnerHTML={{ __html: highlightCode(suggestion.suggestedSQL, 'sql') }}
            />
          </pre>
        </div>
      )}
    </Card>
  )
}

// ── Optimized Query Block ──────────────────────────────────────────

function OptimizedQueryBlock({
  query
}: {
  query: string
}): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(query)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [query])

  return (
    <Card className="overflow-hidden border-[var(--primary)]/25 bg-gradient-to-b from-[var(--primary)]/5 to-transparent p-0">
      <div className="flex items-center justify-between border-b border-[var(--primary)]/15 px-3 py-2">
        <div className="flex items-center gap-2">
          <Zap size={11} className="text-[var(--primary)]" />
          <p className="text-xs font-semibold text-[var(--primary)]">Optimized Query</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[var(--primary)]/10 hover:text-[hsl(var(--foreground))]"
        >
          <span icon={copied ? Check : Copy} iconKey={copied ? 'check' : 'copy'} size={10} className={copied ? 'text-emerald-400' : undefined} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap px-3 py-3 font-mono text-[11px] leading-relaxed">
        <code
          className="hljs"
          dangerouslySetInnerHTML={{ __html: highlightCode(query, 'sql') }}
        />
      </pre>
    </Card>
  )
}
