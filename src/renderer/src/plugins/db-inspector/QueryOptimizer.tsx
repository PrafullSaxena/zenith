/**
 * QueryOptimizer — Paste SQL, get EXPLAIN ANALYZE + AI optimization.
 * Refactored to use Shadcn Tabs for modular analysis views and 
 * strong framer-motion staggers for modern aesthetic feel.
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
import { Card } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs'
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

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const staggerItem = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  }

  return (
    <div className="flex h-full flex-col bg-background/50">
      {/* SQL input */}
      <Card className="shrink-0 rounded-none border-x-0 border-t-0 p-4 shadow-sm bg-card/60 backdrop-blur-md z-10 transition-all">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-background shadow-inner focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all p-1">
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
            className="w-full resize-none font-mono bg-transparent px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50 min-h-[80px]"
          />
        </div>
        
        <div className="mt-3 flex flex-wrap justify-between items-center gap-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider pl-1">
             SQL Analyzer
          </p>
          <div className="flex items-center gap-2">
             {session?.status === 'analyzing' && (
               <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                 <Loader2 size={12} className="animate-spin text-primary" />
                 Running EXPLAIN ANALYZE...
               </span>
             )}
             {session?.status === 'streaming' && (
               <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                 <Loader2 size={12} className="animate-spin text-primary" />
                 AI analyzing...
               </span>
             )}
             {isActive ? (
               <Button variant="destructive" size="sm" onClick={onCancel} className="h-8 shadow-sm">
                 <Square size={12} className="mr-1.5 fill-current" />
                 Cancel
               </Button>
             ) : (
               <Button
                 variant="default"
                 size="sm"
                 onClick={handleAnalyze}
                 disabled={!canAnalyze || !sql.trim()}
                 className="h-8 shadow-sm"
               >
                 <Zap size={12} className="mr-1.5 fill-current" />
                 Analyze Query
               </Button>
             )}
          </div>
        </div>
      </Card>

      {/* Results area */}
      <div ref={streamRef} className="flex-1 overflow-auto p-4 scroll-smooth">
        {!session && tiles.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={Zap}
              title="No query to optimize"
              description="Paste a SQL query and click Analyze. AI will run EXPLAIN ANALYZE, inspect indexes and statistics, then suggest optimizations."
            />
          </div>
        )}

        {/* Active streaming session */}
        <AnimatePresence>
          {session && session.status === 'streaming' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Card className="overflow-hidden border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-0 shadow-lg relative">
                <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2">
                  <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider">Analysis in progress</p>
                </div>
                <pre className="max-h-64 overflow-auto px-4 py-4 font-mono text-[11px] leading-relaxed text-foreground custom-scrollbar">
                  {session.rawText || 'Analyzing...'}
                </pre>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        {session?.status === 'error' && session.error && (
          <Card className="mb-4 border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {session.error}
          </Card>
        )}

        {/* Completed tiles with stagger animation */}
        <motion.div
          className="space-y-6 pb-8"
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
  const [copiedMode, setCopiedMode] = useState<null | 'raw' | 'formatted'>(null)
  const [isExporting, setIsExporting] = useState(false)

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

  const timeLabel = new Date(tile.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  let defaultTab = 'suggestions'
  if (session.suggestions.length === 0) {
    if (session.explainOutput) defaultTab = 'explain'
    else if (session.insights.length > 0) defaultTab = 'insights'
    else if (session.mermaidDiagram) defaultTab = 'flow'
    else if (session.tradeoffs.length > 0) defaultTab = 'tradeoffs'
  }

  const sugCount = session.suggestions.length
  const highCount = session.suggestions.filter(
    (s) => s.severity === 'high'
  ).length

  return (
    <Card className="overflow-hidden p-0 shadow-md border-border bg-card">
      {/* Tile header */}
      <div className="flex w-full items-center gap-3 bg-gradient-to-r from-background to-muted/20 px-4 py-3 border-b border-border/40 hover:bg-muted/10 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
        >
          <div className={`p-1 rounded-md transition-colors ${expanded ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          <Zap size={14} className="shrink-0 text-primary" />
          <p className="min-w-0 truncate font-mono text-xs font-semibold text-foreground/90">
            {tile.originalQuery.slice(0, 100)}
            {tile.originalQuery.length > 100 ? '…' : ''}
          </p>
        </button>

        {/* Badges + Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {highCount > 0 && (
            <Badge variant="destructive" className="animate-pulse shadow-sm h-5 py-0">
              {highCount} critical
            </Badge>
          )}
          {sugCount > 0 && (
            <Badge variant="secondary" className="h-5 py-0 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
              {sugCount} suggestion{sugCount !== 1 ? 's' : ''}
            </Badge>
          )}

          <div className="w-px h-4 bg-border mx-1" />

          {/* Export Dropdown styled via inline buttons for now */}
          <div className="flex items-center gap-1 bg-background border border-border rounded-md shadow-sm p-0.5">
             <button
               type="button"
               onClick={() => void handleExportPDF()}
               disabled={isExporting}
               className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
             >
               {isExporting ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
               PDF
             </button>
             <div className="w-px h-3 bg-border" />
             <button
               type="button"
               onClick={() => void handleCopyRaw()}
               className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition-colors ${copiedMode === 'raw' ? 'bg-emerald-400/10 text-emerald-400' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
             >
               {copiedMode === 'raw' ? <Check size={11} /> : <AlignLeft size={11} />}
               Raw
             </button>
             <div className="w-px h-3 bg-border" />
             <button
               type="button"
               onClick={() => void handleCopyFormatted()}
               className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition-colors ${copiedMode === 'formatted' ? 'bg-emerald-400/10 text-emerald-400' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
             >
               {copiedMode === 'formatted' ? <Check size={11} /> : <FileText size={11} />}
               Format
             </button>
          </div>
          
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 ml-1">
            <Clock size={10} />
            {timeLabel}
          </span>
        </div>
      </div>

      {/* Tile body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-background"
          >
            <div className="px-4 py-3 flex flex-col gap-4">
              
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="h-8 bg-muted/40 mb-4 inline-flex items-center p-1 border border-border/50">
                  {session.suggestions.length > 0 && (
                    <TabsTrigger value="suggestions" className="text-[11px] h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                       Suggestions ({session.suggestions.length})
                    </TabsTrigger>
                  )}
                  {session.explainOutput && (
                    <TabsTrigger value="explain" className="text-[11px] h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                       Explain Output
                    </TabsTrigger>
                  )}
                  {session.insights.length > 0 && (
                    <TabsTrigger value="insights" className="text-[11px] h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                       Insights
                    </TabsTrigger>
                  )}
                  {session.mermaidDiagram && (
                    <TabsTrigger value="flow" className="text-[11px] h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                       Query Flow
                    </TabsTrigger>
                  )}
                  {session.tradeoffs.length > 0 && (
                    <TabsTrigger value="tradeoffs" className="text-[11px] h-6 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                       Tradeoffs
                    </TabsTrigger>
                  )}
                </TabsList>
                
                {/* Tab contents */}
                {session.suggestions.length > 0 && (
                  <TabsContent value="suggestions" className="m-0 space-y-3 outline-none">
                    {session.suggestions.map((s, i) => (
                      <SuggestionCard key={i} suggestion={s} index={i + 1} />
                    ))}
                  </TabsContent>
                )}
                
                {session.explainOutput && (
                   <TabsContent value="explain" className="m-0 outline-none">
                     <div className="bg-muted/30 border border-border/60 rounded-lg p-1 shadow-inner">
                       <pre className="max-h-64 overflow-auto rounded-md bg-transparent p-3 font-mono text-[11px] leading-relaxed text-foreground custom-scrollbar">
                         {session.explainOutput}
                       </pre>
                     </div>
                   </TabsContent>
                )}
                
                {session.insights.length > 0 && (
                   <TabsContent value="insights" className="m-0 outline-none">
                     <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {session.insights.map((insight, i) => (
                         <li
                           key={i}
                           className="flex flex-col gap-2 rounded-lg bg-yellow-400/5 border border-yellow-400/20 px-4 py-3 text-xs text-foreground shadow-sm"
                         >
                           <div className="flex items-center gap-2 font-medium text-yellow-500/80">
                             <Lightbulb size={12} /> Insight
                           </div>
                           <span className="leading-relaxed opacity-90">{renderInline(insight)}</span>
                         </li>
                       ))}
                     </ul>
                   </TabsContent>
                )}
                
                {session.mermaidDiagram && (
                   <TabsContent value="flow" className="m-0 outline-none">
                     <div className="overflow-auto rounded-lg border border-border/60 bg-muted/20 p-4 shadow-sm min-h-[300px]">
                       <MermaidRenderer syntax={session.mermaidDiagram} />
                     </div>
                   </TabsContent>
                )}
                
                {session.tradeoffs.length > 0 && (
                   <TabsContent value="tradeoffs" className="m-0 outline-none">
                     <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {session.tradeoffs.map((tradeoff, i) => (
                         <li
                           key={i}
                           className="flex flex-col gap-2 rounded-lg bg-orange-500/5 border border-orange-500/20 px-4 py-3 text-xs text-foreground shadow-sm"
                         >
                           <div className="flex items-center gap-2 font-medium text-orange-500/80">
                             <Scale size={12} /> Tradeoff
                           </div>
                           <span className="leading-relaxed opacity-90">{renderInline(tradeoff)}</span>
                         </li>
                       ))}
                     </ul>
                   </TabsContent>
                )}
              </Tabs>

              {/* Optimized Query (standalone) */}
              {session.optimizedQuery && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <OptimizedQueryBlock query={session.optimizedQuery} />
                </div>
              )}

              {/* Summary */}
              {session.summary && (
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 shadow-inner">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    <ListChecks size={11} /> AI Summary
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-foreground/90">
                    {renderInline(session.summary)}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
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

  const badgeVariant = suggestion.severity === 'high' ? 'destructive' as const : suggestion.severity === 'medium' ? 'warning' as const : 'info' as const

  return (
    <Card
      className={`overflow-hidden p-0 border-l-[3px] ${config.border} shadow-sm transition-all hover:shadow-md bg-card/40`}
    >
      <div className="px-4 py-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground/60 shadow-inner">
            {index}
          </span>
          <Badge variant={badgeVariant} className="shadow-sm">
            <Icon size={10} className="mr-1" />
            {config.label}
          </Badge>
          <span className="rounded bg-muted/50 px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            {TYPE_LABELS[suggestion.type] ?? suggestion.type}
          </span>
        </div>

        {/* Title + explanation */}
        <div className="mt-3 pl-9">
           <p className="text-[13px] font-bold text-foreground tracking-tight">
             {renderInline(suggestion.title)}
           </p>
           <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/80">
             {renderInline(suggestion.explanation)}
           </p>
        </div>
      </div>

      {/* Suggested SQL */}
      {suggestion.suggestedSQL && (
        <div className="border-t border-border/40 bg-muted/10 px-4 py-3 ml-0">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Code2 size={11} /> Suggested Fix
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-background border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shadow-sm"
            >
              {sqlCopied ? <Check size={10} className={sqlCopied ? 'text-emerald-400' : undefined} /> : <Copy size={10} className={sqlCopied ? 'text-emerald-400' : undefined} />}
              {sqlCopied ? 'Copied!' : 'Copy Fix'}
            </button>
          </div>
          <div className="bg-card border border-border/50 rounded-lg p-1 shadow-inner">
             <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed p-2 custom-scrollbar">
               <code
                 className="hljs"
                 dangerouslySetInnerHTML={{ __html: highlightCode(suggestion.suggestedSQL, 'sql') }}
               />
             </pre>
          </div>
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
    <Card className="overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-0 shadow-md">
      <div className="flex items-center justify-between border-b border-primary/15 bg-primary/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-1.5 rounded-md">
             <Zap size={13} className="text-primary fill-primary" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Optimized Query Output</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2.5 text-[11px] font-medium bg-background border border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
        >
          {copied ? <Check size={11} className={copied ? 'text-emerald-400 mr-1.5' : undefined} /> : <Copy size={11} className={copied ? 'text-emerald-400 mr-1.5' : undefined} />}
          {copied ? 'Copied!' : 'Copy Full Query'}
        </Button>
      </div>
      <div className="bg-background/40 p-1">
         <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-3 font-mono text-[11px] leading-relaxed custom-scrollbar">
           <code
             className="hljs"
             dangerouslySetInnerHTML={{ __html: highlightCode(query, 'sql') }}
           />
         </pre>
      </div>
    </Card>
  )
}
