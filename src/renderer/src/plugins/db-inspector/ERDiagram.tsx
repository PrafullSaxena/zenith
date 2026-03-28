/**
 * ERDiagram — Select tables and generate Mermaid ER diagrams.
 * Features: fuzzy search, code/visual toggle, editable code mode,
 * relationship inference (convention-based + AI-powered).
 *
 * Wraps the layout in a resizable split-pane. 
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
  Network
} from 'lucide-react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import type {
  TableInfo,
  ERDiagramSession,
  RelationshipMode,
  ERInferenceStatus
} from '../../types/database'
import { Card } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import MermaidRenderer from './MermaidRenderer'

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
      const md = `# ER Diagram — ${connectionName ?? 'Database'}\n\n**Schema:** ${schema ?? 'N/A'} | **Tables:** ${selectedTables.length} | **Mode:** ${relationshipMode}\n\n\`\`\`mermaid\n${currentSyntax}\n\`\`\``
      const { renderAllMermaidBlocks } = await import('../../lib/mermaid-to-png')
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
  const aiPending = relationshipMode === 'ai' && isInferring

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
    <PanelGroup direction="horizontal" className="h-full w-full">
      {/* Sidebar: Table Selection & Mode Controls */}
      <Panel
        defaultSize={25}
        minSize={20}
        maxSize={40}
        className="flex flex-col bg-card/30 backdrop-blur-md"
      >
        <div className="flex flex-col h-full overflow-hidden p-4">
          <div className="flex items-center justify-between shrink-0 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Tables
            </p>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                {selectedTables.length}/{tables.length}
              </span>
            </div>
          </div>

          {!hasConnection ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground/50 text-center">Connect to a database first…</p>
            </div>
          ) : tables.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
               <p className="text-xs text-muted-foreground/50 text-center">No tables in selected schema</p>
            </div>
          ) : (
            <>
              {/* Fuzzy Search */}
              <div className="relative mb-3 shrink-0">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter tables…"
                  className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
                />
              </div>

              <div className="flex justify-between items-center mb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onSetTables(allSelected ? [] : tables.map((t) => t.name))}
                  className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Scrollable Table List */}
              <div className="flex-1 overflow-auto -mx-1 px-1 custom-scrollbar">
                <div className="flex flex-wrap gap-1.5 pb-2">
                  {filteredTables.map((t) => {
                    const isSelected = selectedTables.includes(t.name)
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => onToggleTable(t.name)}
                        className={`rounded-full px-2.5 py-1 text-[11px] transition-all whitespace-nowrap ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                        }`}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Controls Area (Fixed at bottom) */}
          <div className="shrink-0 pt-4 mt-2 border-t border-border/40 space-y-3">
            {hasConnection && tables.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Relationships Mode
                </span>
                <div className="flex rounded-md border border-border overflow-hidden bg-background">
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
                        className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium transition-colors ${
                          mode.id !== 'fk-only' ? 'border-l border-border' : ''
                        } ${
                          isActive
                            ? 'bg-primary/10 text-primary shadow-inner'
                            : isDisabled
                              ? 'text-muted-foreground/30 cursor-not-allowed bg-muted/30'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                      >
                        <Icon size={12} />
                        {mode.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <Button
              variant="default"
              size="sm"
              className="w-full text-xs font-medium bg-primary/90 hover:bg-primary text-primary-foreground"
              onClick={handleGenerate}
              disabled={noneSelected || isGenerating || !hasConnection}
            >
              {isGenerating ? (
                <Loader2 size={13} className="animate-spin mr-1.5" />
              ) : (
                <GitFork size={13} className="mr-1.5" />
              )}
              {isGenerating ? 'Generating...' : 'Generate ER Diagram'}
            </Button>

            {/* Inferred status alerts */}
            {inferredCount > 0 && inferredSummary && (
              <div className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/10 px-2 py-1.5 rounded-md border border-primary/20">
                <Sparkles size={11} className="shrink-0" />
                <span className="truncate">
                  {inferredCount} inferred ({inferredSummary})
                </span>
              </div>
            )}
            
            {aiPending && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1.5 rounded-md">
                <Loader2 size={11} className="animate-spin shrink-0" />
                <span className="truncate">AI inference in progress…</span>
              </div>
            )}

            {inferenceStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-400/10 px-2 py-1.5 rounded-md border border-red-400/20">
                <span className="truncate">AI inference failed. Showing convention results.</span>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Resize Handle */}
      <PanelResizeHandle className="w-[1px] bg-border hover:bg-primary/50 hover:w-[3px] -mx-[1px] z-10 transition-all cursor-col-resize active:bg-primary" />

      {/* Main Graph Area */}
      <Panel className="flex flex-col relative bg-background/50 h-full overflow-hidden">
        {/* Graph Toolbar */}
        {(session || editedSyntax) && (
          <div className="shrink-0 border-b border-border/40 bg-card/40 backdrop-blur px-4 py-2 flex items-center justify-between">
            {/* View Mode Toggle */}
            <div className="flex rounded-md border border-border overflow-hidden bg-background">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium transition-colors ${
                  viewMode === 'visual'
                    ? 'bg-primary/10 text-primary shadow-inner'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Image size={12} />
                Visual
              </button>
              <button
                type="button"
                onClick={handleSwitchToCode}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium border-l border-border transition-colors ${
                  viewMode === 'code'
                    ? 'bg-primary/10 text-primary shadow-inner'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Code2 size={12} />
                Code
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-[11px]">
                {copied ? <Check size={12} className="text-emerald-400 mr-1.5" /> : <Copy size={12} className="mr-1.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="h-7 text-[11px] bg-background"
              >
                {isExporting ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <FileDown size={12} className="mr-1.5" />}
                Export PDF
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {!session && !editedSyntax ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={Network}
                title="No ER diagram generated"
                description="Select tables from the sidebar and click Generate. Columns, keys, and relationships will be visualized."
              />
            </div>
          ) : viewMode === 'visual' ? (
             <div className="flex flex-col h-full gap-3">
               {/* Legend Overlay */}
               {inferredCount > 0 && (
                 <div className="shrink-0 self-start flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm px-3 py-2 text-[10px] text-muted-foreground shadow-sm">
                   <div className="flex items-center gap-1.5">
                      <span className="font-semibold uppercase tracking-wider text-foreground">Legend</span>
                   </div>
                   <span className="w-px h-3 bg-border" />
                   <span className="flex items-center"><span className="font-mono text-foreground font-semibold mr-1">fk_name</span> constraint</span>
                   <span className="flex items-center"><span className="text-primary font-semibold mr-1 bg-primary/10 px-1 rounded">conv:</span> convention</span>
                   <span className="flex items-center"><span className="text-primary font-semibold mr-1 bg-primary/10 px-1 rounded">shared:</span> shared col</span>
                   {session?.inferredRelationships?.some((r) => r.source === 'ai') && (
                     <span className="flex items-center"><span className="text-primary font-semibold mr-1 bg-primary/10 px-1 rounded">ai:</span> ai inferred</span>
                   )}
                 </div>
               )}
               {/* Fixed Mermaid Renderer */}
               <Card className="flex-1 overflow-auto bg-card p-4 border-border shadow-md">
                 <MermaidRenderer
                   syntax={currentSyntax}
                   className="h-full min-h-[400px]"
                   interactive
                 />
               </Card>
             </div>
          ) : (
            <Card className="flex h-full flex-col overflow-hidden bg-card border-border shadow-md">
              <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-2 shrink-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Mermaid Syntax (Editable)
                </p>
                <Button variant="default" size="sm" onClick={handleReRender} className="h-7 text-[11px]">
                  <RefreshCw size={11} className="mr-1.5" />
                  Apply & Re-render
                </Button>
              </div>
              <textarea
                value={editableCode}
                onChange={(e) => setEditableCode(e.target.value)}
                className="flex-1 resize-none bg-transparent p-4 font-mono text-[12px] leading-relaxed text-foreground focus:outline-none custom-scrollbar"
                spellCheck={false}
              />
            </Card>
          )}
        </div>
      </Panel>
    </PanelGroup>
  )
}
