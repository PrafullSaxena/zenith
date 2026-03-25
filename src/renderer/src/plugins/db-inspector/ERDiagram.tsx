/**
 * ERDiagram — Select tables and generate Mermaid ER diagrams.
 * Features: fuzzy search, code/visual toggle, editable code mode,
 * relationship inference (convention-based + AI-powered).
 *
 * All three modes (FK Only, Convention, AI Inferred) are generated once
 * on "Generate ER Diagram". Switching modes swaps cached syntax instantly.
 */
import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  GitFork,
  Copy,
  Check,
  Loader2,
  Image,
  Code2,
  Search,
  RefreshCw,
  Sparkles,
  Link2,
  FileDown,
  Network,
  Box,
  Grid3X3
} from 'lucide-react'
import type {
  TableInfo,
  ERDiagramSession,
  RelationshipMode,
  ERInferenceStatus
} from '../../types/database'
import { GlassCard, GlassSurface, GlassButton, GlassSelect, EmptyState, Scene3DWrapper, AnimatedIcon } from '../../components/ui'
import MermaidRenderer from './MermaidRenderer'

// ── Lazy-load 3D schema orb ─────────────────────────────────────────────
const SchemaOrb3D = React.lazy(() => import('./SchemaOrb3D'))

interface ERDiagramProps {
  tables: TableInfo[]
  selectedTables: string[]
  onToggleTable: (table: string) => void
  onSetTables: (tables: string[]) => void
  onGenerate: () => Promise<void>
  session: ERDiagramSession | null
  hasConnection: boolean
  hasAgent: boolean
  inferenceStatus: ERInferenceStatus
  relationshipMode: RelationshipMode
  onModeChange: (mode: RelationshipMode) => void
  inferredCount: number
  connectionName?: string
  schema?: string
}

/** Fuzzy match: every character in query appears in order in target. */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

const MODES: { id: RelationshipMode; label: string; icon: typeof Link2; needsAgent?: boolean }[] = [
  { id: 'fk-only', label: 'FK Only', icon: Link2 },
  { id: 'convention', label: 'Convention', icon: GitFork },
  { id: 'ai', label: 'AI Inferred', icon: Sparkles, needsAgent: true }
]

export default function ERDiagram({
  tables,
  selectedTables,
  onToggleTable,
  onSetTables,
  onGenerate,
  session,
  hasConnection,
  hasAgent,
  inferenceStatus,
  relationshipMode,
  onModeChange,
  inferredCount,
  connectionName,
  schema
}: ERDiagramProps): React.JSX.Element {
  const diagramRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual')
  const [editableCode, setEditableCode] = useState('')
  const [editedSyntax, setEditedSyntax] = useState<string | null>(null)
  const [show3D, setShow3D] = useState(false)

  // Sync editable code when session changes
  const currentSyntax = editedSyntax ?? session?.mermaidSyntax ?? ''

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables
    return tables.filter((t) => fuzzyMatch(tableSearch.trim(), t.name))
  }, [tables, tableSearch])

  const handleGenerate = async (): Promise<void> => {
    setIsGenerating(true)
    setEditedSyntax(null)
    try {
      await onGenerate()
    } finally {
      setIsGenerating(false)
    }
  }

  /** Mode switch just swaps cached syntax — no re-generation. */
  const handleModeChange = useCallback(
    (newMode: RelationshipMode) => {
      setEditedSyntax(null)
      onModeChange(newMode)
    },
    [onModeChange]
  )

  const handleCopy = useCallback(() => {
    if (currentSyntax) {
      navigator.clipboard.writeText(currentSyntax)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [currentSyntax])

  const handleSwitchToCode = useCallback(() => {
    setEditableCode(currentSyntax)
    setViewMode('code')
  }, [currentSyntax])

  const handleReRender = useCallback(() => {
    setEditedSyntax(editableCode)
    setViewMode('visual')
  }, [editableCode])

  const handleExportPdf = useCallback(async () => {
    if (!currentSyntax) return

    setIsExporting(true)
    try {
      // Compose markdown with ER diagram metadata and mermaid code fence
      const md = `# ER Diagram — ${connectionName ?? 'Database'}\n\n**Schema:** ${schema ?? 'N/A'} | **Tables:** ${selectedTables.length} | **Mode:** ${relationshipMode}\n\n\`\`\`mermaid\n${currentSyntax}\n\`\`\``
      const { renderAllMermaidBlocks } = await import('../../lib/mermaid-to-png')
      // Read PDF style to determine mermaid theme
      const settings = await window.api.settings.getAll()
      const pdfStyle = (settings?.['general.pdfStyle'] as string) ?? 'colored'
      const lightMode = pdfStyle !== 'pretty'
      const mermaidImages = await renderAllMermaidBlocks(md, lightMode)
      await window.api.app.exportPdf({
        markdown: md,
        title: `ER Diagram — ${connectionName ?? 'Database'}`,
        mermaidImages: Object.keys(mermaidImages).length > 0 ? mermaidImages : undefined,
        orientation: 'landscape'
      })
    } finally {
      setIsExporting(false)
    }
  }, [currentSyntax, connectionName, schema, selectedTables.length, relationshipMode])

  const allSelected = tables.length > 0 && selectedTables.length === tables.length
  const noneSelected = selectedTables.length === 0
  const isInferring = inferenceStatus === 'streaming' || inferenceStatus === 'inferring'

  // Show AI loading indicator when AI mode selected but results not yet ready
  const aiPending = relationshipMode === 'ai' && isInferring

  // Count inferred by source
  const inferredSummary = useMemo(() => {
    if (!session?.inferredRelationships?.length) return null
    const conv = session.inferredRelationships.filter((r) => r.source === 'convention').length
    const ai = session.inferredRelationships.filter((r) => r.source === 'ai').length
    const parts: string[] = []
    if (conv > 0) parts.push(`${conv} convention`)
    if (ai > 0) parts.push(`${ai} AI`)
    return parts.join(', ')
  }, [session?.inferredRelationships])

  return (
    <div className="flex h-full flex-col">
      {/* Table selector */}
      <GlassSurface className="rounded-none border-x-0 border-t-0 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Select Tables ({selectedTables.length}/{tables.length})
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSetTables(allSelected ? [] : tables.map((t) => t.name))}
              className="text-[10px] text-accent hover:underline"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {!hasConnection ? (
          <p className="mt-2 text-xs text-text-secondary/50">Connect to a database first…</p>
        ) : tables.length === 0 ? (
          <p className="mt-2 text-xs text-text-secondary/50">No tables in selected schema</p>
        ) : (
          <>
            {/* Fuzzy search */}
            {tables.length > 5 && (
              <div className="relative mt-2">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary/50" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter tables…"
                  className="w-full rounded border border-border bg-surface pl-7 pr-2 py-1 text-[11px] text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none"
                />
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-auto">
              {filteredTables.map((t) => {
                const isSelected = selectedTables.includes(t.name)
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => onToggleTable(t.name)}
                    className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-accent/20 text-accent border border-accent/30'
                        : 'bg-surface-elevated text-text-secondary border border-transparent hover:border-border'
                    }`}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Relationship mode selector */}
        {hasConnection && tables.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary mr-1">
              Relationships:
            </span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {MODES.map((mode) => {
                const Icon = mode.icon
                const isActive = relationshipMode === mode.id
                const isDisabled = mode.needsAgent && !hasAgent
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => !isDisabled && handleModeChange(mode.id)}
                    disabled={isDisabled}
                    title={isDisabled ? 'Requires AI agent — configure in Settings' : undefined}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] transition-colors ${
                      mode.id !== 'fk-only' ? 'border-l border-border' : ''
                    } ${
                      isActive
                        ? 'bg-accent/15 text-accent'
                        : isDisabled
                          ? 'text-text-secondary/30 cursor-not-allowed'
                          : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon size={11} />
                    {mode.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <GlassButton
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={noneSelected || isGenerating || !hasConnection}
          >
            {isGenerating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <GitFork size={12} />
            )}
            Generate ER Diagram
          </GlassButton>
          {(session || editedSyntax) && (
            <>
              <GlassButton variant="ghost" size="sm" onClick={handleCopy}>
                <AnimatedIcon icon={copied ? Check : Copy} iconKey={copied ? 'check' : 'copy'} size={12} className={copied ? 'text-emerald-400' : undefined} />
                {copied ? 'Copied!' : 'Copy Mermaid'}
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                Export PDF
              </GlassButton>

              {/* ER / 3D toggle pill */}
              <div className="ml-auto flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
                <button
                  type="button"
                  onClick={() => setShow3D(false)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors ${
                    !show3D ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="ER diagram view"
                >
                  <Grid3X3 size={11} />
                  ER
                </button>
                <button
                  type="button"
                  onClick={() => setShow3D(true)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors ${
                    show3D ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="3D schema orb view"
                >
                  <Box size={11} />
                  3D
                </button>
              </div>

              {/* View mode toggle (mermaid only) */}
              {!show3D && <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('visual')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] ${
                    viewMode === 'visual'
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Image size={11} />
                  Visual
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToCode}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] border-l border-border ${
                    viewMode === 'code'
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Code2 size={11} />
                  Code
                </button>
              </div>}
            </>
          )}
        </div>

        {/* Inferred relationships badge */}
        {inferredCount > 0 && inferredSummary && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-accent/80">
            <Sparkles size={11} />
            <span>
              {inferredCount} inferred relationship{inferredCount !== 1 ? 's' : ''}
              {' '}({inferredSummary})
            </span>
          </div>
        )}

        {/* AI inference streaming indicator */}
        {aiPending && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <Loader2 size={11} className="animate-spin" />
            <span>AI inference in progress… Convention results shown.</span>
          </div>
        )}

        {/* AI inference error */}
        {inferenceStatus === 'error' && (
          <p className="mt-2 text-[11px] text-red-400">
            AI inference failed. Convention-based results still shown.
          </p>
        )}
      </GlassSurface>

      {/* Diagram render area */}
      <div className="flex-1 overflow-auto p-4">
        {!session && !editedSyntax && (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={Network}
              title="No ER diagram"
              description="Select tables and generate an ER diagram. Columns, primary keys, foreign keys, and relationships will be visualized. All three modes are generated at once."
            />
          </div>
        )}

        {/* 3D Schema Orb view */}
        {show3D && session && selectedTables.length > 0 && (
          <div className="h-full">
            <Scene3DWrapper
              fallback={
                <GlassCard className="p-3" ref={diagramRef}>
                  <MermaidRenderer syntax={currentSyntax} className="h-full" interactive />
                </GlassCard>
              }
              loadingMessage="Loading 3D schema..."
            >
              <SchemaOrb3D
                tables={tables}
                selectedTables={selectedTables}
                session={session}
                onTableClick={onToggleTable}
              />
            </Scene3DWrapper>
          </div>
        )}

        {/* Mermaid visual view */}
        {!show3D && (session || editedSyntax) && viewMode === 'visual' && (
          <GlassCard className="p-3" ref={diagramRef}>
            {/* Legend when inferred relationships are present */}
            {inferredCount > 0 && (
              <div className="mb-3 flex items-center gap-4 rounded-lg border border-[var(--glass-border)] bg-white/[0.02] px-3 py-1.5 text-[10px] text-[var(--text-secondary)]">
                <span className="font-medium uppercase tracking-wider">Legend:</span>
                <span>
                  <span className="font-semibold text-text-primary">fk_name</span> = FK constraint
                </span>
                <span>
                  <span className="font-semibold text-accent">conv:</span> = Convention match
                </span>
                <span>
                  <span className="font-semibold text-accent">shared:</span> = Shared column
                </span>
                {session?.inferredRelationships?.some((r) => r.source === 'ai') && (
                  <span>
                    <span className="font-semibold text-accent">ai:</span> = AI inferred
                  </span>
                )}
              </div>
            )}
            <MermaidRenderer
              syntax={currentSyntax}
              className="h-full"
              interactive
            />
          </GlassCard>
        )}

        {!show3D && (session || editedSyntax) && viewMode === 'code' && (
          <GlassSurface className="flex h-full flex-col gap-2 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Mermaid Syntax (editable)
              </p>
              <GlassButton variant="primary" size="sm" onClick={handleReRender}>
                <RefreshCw size={11} />
                Re-render
              </GlassButton>
            </div>
            <textarea
              value={editableCode}
              onChange={(e) => setEditableCode(e.target.value)}
              className="flex-1 resize-none rounded-lg border border-[var(--glass-border)] bg-white/[0.03] px-3 py-2 font-mono text-[12px] leading-relaxed text-[var(--text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              spellCheck={false}
            />
          </GlassSurface>
        )}
      </div>
    </div>
  )
}
