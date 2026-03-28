/**
 * ERDiagram — Renders the Mermaid ER diagram in visual or code mode.
 * Table selection and mode controls live in the parent's left sidebar.
 */
import React, { useState, useCallback, useMemo } from 'react'
import {
  GitFork,
  Copy,
  Check,
  Loader2,
  Image,
  Code2,
  RefreshCw,
  Sparkles,
  FileDown,
  Network
} from 'lucide-react'
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

export default function ERDiagram({
  selectedTables,
  session,
  inferenceStatus,
  relationshipMode,
  inferredCount,
  connectionName,
  schema
}: ERDiagramProps): React.JSX.Element {
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual')
  const [editableCode, setEditableCode] = useState('')
  const [editedSyntax, setEditedSyntax] = useState<string | null>(null)

  const currentSyntax = editedSyntax ?? session?.mermaidSyntax ?? ''

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
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Toolbar */}
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

      <div className="flex-1 overflow-hidden relative">
        {!session && !editedSyntax ? (
          <div className="flex h-full items-center justify-center p-4">
            <EmptyState
              icon={Network}
              title="No ER diagram generated"
              description="Select tables from the sidebar and click Generate. Columns, keys, and relationships will be visualized."
            />
          </div>
        ) : viewMode === 'visual' ? (
           <div className="flex flex-col h-full">
             {/* Legend Overlay */}
             {inferredCount > 0 && (
               <div className="shrink-0 self-start flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm px-3 py-2 mx-4 mt-3 text-[10px] text-muted-foreground shadow-sm">
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
             <div className="flex-1 overflow-hidden">
               <MermaidRenderer
                 syntax={currentSyntax}
                 className="h-full"
                 interactive
               />
             </div>
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
    </div>
  )
}
