/**
 * ArchitectureDashboard -- Architecture visualization with two layers:
 *   Section A (always shown): Static analysis from analysisResult
 *     - Code Structure Overview (entity counts, stats, framework badges)
 *     - Entity Relationship Diagram (React Flow from analysisResult)
 *     - Route Summary (API endpoints from analysisResult.routes)
 *   Section B (optional, collapsible): AI-powered insights
 *     - InsightCards grid (dependencies, security, patterns, etc.)
 *     - Architecture Diagrams (tabbed React Flow from aiInsights)
 */
import { useMemo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import {
  Brain,
  Package,
  Shield,
  Layers,
  Settings,
  Zap,
  Network,
  BookOpen,
  Loader2,
  RefreshCw,
  Lightbulb,
  TestTube2,
  ChevronDown,
  ChevronRight,
  Globe,
  FileCode,
  Hash,
  Cpu,
  ExternalLink
} from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCortexStore, getCortexAgent } from '../../../stores/cortex-store'
import { getKindColor, getMethodColor } from '../cortex-theme'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useAgentStore } from '../../../stores/agent-store'
import InsightCard from './InsightCard'
import MarkdownRenderer from '../../../components/MarkdownRenderer'
import type { ToonInsights } from '../../../stores/cortex-store'
import type { AnalysisResult, RouteInfo } from '../../../types/cortex'

// ── Helpers: build React Flow graph from raw analysisResult ────────────

/**
 * Build a static entity graph from raw analysisResult data.
 * Groups entities by kind and places them in layers:
 *   controllers → left, services → middle, repositories → right.
 * Draws call edges between connected entities.
 * Capped at top 30 entities for readability.
 */
function buildStaticEntityGraph(analysisResult: AnalysisResult): { nodes: Node[]; edges: Edge[] } {
  const LAYER_ORDER = ['controller', 'service', 'repository', 'class', 'component', 'middleware', 'function']
  const entities = analysisResult.entities
    .filter((e) => e.kind !== 'method') // skip methods, keep top-level classes
    .slice(0, 30)

  // Group by kind
  const byKind = new Map<string, typeof entities>()
  for (const e of entities) {
    const kind = e.kind.toLowerCase()
    const list = byKind.get(kind) ?? []
    list.push(e)
    byKind.set(kind, list)
  }

  // Sort kinds by layer order
  const sortedKinds = [...byKind.keys()].sort((a, b) => {
    const ai = LAYER_ORDER.indexOf(a)
    const bi = LAYER_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const nodes: Node[] = []
  const entityNodeMap = new Map<string, string>() // entityId -> nodeId

  const COLUMN_WIDTH = 220
  const ROW_HEIGHT = 100

  sortedKinds.forEach((kind, colIdx) => {
    const kindEntities = byKind.get(kind) ?? []
    const colors = getKindColor(kind)
    const x = colIdx * COLUMN_WIDTH

    // Column header node
    nodes.push({
      id: `col-${kind}`,
      position: { x, y: 0 },
      data: { label: kind.toUpperCase() },
      selectable: false,
      style: {
        background: colors.bg,
        border: `1px dashed ${colors.border}`,
        borderRadius: 8,
        padding: '4px 12px',
        fontSize: 9,
        color: colors.text,
        fontWeight: 700,
        letterSpacing: '0.08em',
        width: 180
      }
    })

    kindEntities.forEach((e, rowIdx) => {
      const nodeId = `static-${colIdx}-${rowIdx}`
      entityNodeMap.set(e.id, nodeId)
      nodes.push({
        id: nodeId,
        position: { x, y: (rowIdx + 1) * ROW_HEIGHT },
        data: { label: e.name },
        style: {
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: '6px 14px',
          fontSize: 11,
          color: '#e2e8f0',
          fontWeight: 500,
          width: 180
        }
      })
    })
  })

  // Build edges from call graph
  const edges: Edge[] = []
  let edgeIdx = 0
  for (const call of analysisResult.calls.slice(0, 60)) {
    const sourceId = entityNodeMap.get(call.callerId)
    const targetId = entityNodeMap.get(call.calleeId)
    if (sourceId && targetId && sourceId !== targetId) {
      edges.push({
        id: `se-${edgeIdx++}`,
        source: sourceId,
        target: targetId,
        animated: call.type === 'inject' || call.type === 'route',
        style: { stroke: '#47556966' }
      })
    }
  }

  return { nodes, edges }
}

// ── Section A: Static Code Structure Overview ───────────────────────────

function CodeStructureOverview({ analysisResult }: { analysisResult: AnalysisResult }): React.JSX.Element {
  const { stats, framework, language } = analysisResult

  // Entity count grouped by kind
  const entityBadges = stats.entityCount
    .filter((ec) => ec.count > 0 && ec.kind !== 'method')
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-4">
      {/* Framework + Language badges */}
      <div className="flex flex-wrap items-center gap-2">
        {framework && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary">
            <Cpu size={11} />
            {framework}
          </span>
        )}
        {language && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            <FileCode size={10} />
            {language}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5">
          <FileCode size={13} className="text-text-tertiary" />
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.totalFiles.toLocaleString()}</span> files
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Hash size={13} className="text-text-tertiary" />
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.totalLines.toLocaleString()}</span> lines
          </span>
        </div>
        {stats.routeCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Globe size={13} className="text-text-tertiary" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.routeCount}</span> API endpoints
            </span>
          </div>
        )}
        {stats.componentCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Network size={13} className="text-text-tertiary" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.componentCount}</span> components
            </span>
          </div>
        )}
      </div>

      {/* Entity kind badges */}
      {entityBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entityBadges.map((ec) => {
            const colors = getKindColor(ec.kind.toLowerCase())
            return (
              <span
                key={ec.kind}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium"
                style={{ background: colors.bg, color: colors.text }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: colors.text }}
                />
                {ec.kind}
                <span className="ml-0.5 opacity-70">{ec.count}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Language breakdown */}
      {stats.languages.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {stats.languages.slice(0, 6).map((lang) => (
            <span
              key={lang.language}
              className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-[10px] text-muted-foreground"
            >
              {lang.language}
              <span className="text-text-tertiary">{lang.fileCount}f</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section A: Route Summary ────────────────────────────────────────────

function RouteSummary({ routes, onNavigate }: { routes: RouteInfo[]; onNavigate: (filePath: string, line: number) => void }): React.JSX.Element {
  // Count by HTTP method
  const methodCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const route of routes) {
      counts.set(route.method, (counts.get(route.method) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [routes])

  // Top 10 routes sorted by path
  const topRoutes = useMemo(
    () => [...routes].sort((a, b) => a.fullPath.localeCompare(b.fullPath)).slice(0, 10),
    [routes]
  )

  return (
    <div className="space-y-3">
      {/* Method distribution */}
      <div className="flex flex-wrap gap-2">
        {methodCounts.map(([method, count]) => {
          const mc = getMethodColor(method)
          return (
            <span
              key={method}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: mc.bg, color: mc.text }}
            >
              {method}
              <span className="ml-0.5 opacity-70">{count}</span>
            </span>
          )
        })}
      </div>

      {/* Route list */}
      <Card className="divide-y divide-white/[0.04]">
        {topRoutes.map((route, i) => {
          const mc = getMethodColor(route.method)
          return (
            <button
              key={i}
              type="button"
              className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-secondary"
              onClick={() => onNavigate(route.filePath, route.line)}
            >
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                style={{ background: mc.bg, color: mc.text }}
              >
                {route.method}
              </span>
              <span className="flex-1 truncate text-[11px] font-mono text-foreground">
                {route.fullPath}
              </span>
              <span className="shrink-0 text-[10px] text-text-tertiary">
                {route.handlerName}
              </span>
              <ExternalLink
                size={10}
                className="shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-60"
              />
            </button>
          )
        })}
        {routes.length > 10 && (
          <div className="px-3 py-2 text-[10px] text-text-tertiary">
            +{routes.length - 10} more endpoints
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Section B: InsightCards grid ────────────────────────────────────────

function InsightCardsGrid({ insights }: { insights: ToonInsights }): React.JSX.Element {
  const depsByCategory = useMemo(() => {
    const map = new Map<string, typeof insights.dependencies>()
    for (const dep of insights.dependencies) {
      const list = map.get(dep.category) ?? []
      list.push(dep)
      map.set(dep.category, list)
    }
    return map
  }, [insights.dependencies])

  return (
    <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" variants={staggerContainer} initial="hidden" animate="visible">
      <InsightCard title="Dependencies" icon={Package} delay={0.05}>
        {insights.dependencies.length === 0 ? (
          <p className="text-xs text-muted-foreground">No dependency data available</p>
        ) : (
          <div className="space-y-3">
            {[...depsByCategory.entries()].map(([category, deps]) => (
              <div key={category}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {deps.map((dep) => (
                    <span
                      key={dep.name}
                      className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {dep.name}
                      {dep.version && (
                        <span className="text-primary/70">{dep.version}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </InsightCard>

      <InsightCard title="Security" icon={Shield} delay={0.1}>
        {insights.security.length === 0 ? (
          <p className="text-xs text-muted-foreground">No security patterns detected</p>
        ) : (
          <ul className="space-y-2">
            {insights.security.map((s, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-foreground">{s.type}</span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.description}</p>
              </li>
            ))}
          </ul>
        )}
      </InsightCard>

      <InsightCard title="Design Patterns" icon={Layers} delay={0.15}>
        {insights.patterns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No design patterns detected</p>
        ) : (
          <ul className="space-y-2">
            {insights.patterns.map((p, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-foreground">{p.name}</span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{p.description}</p>
              </li>
            ))}
          </ul>
        )}
      </InsightCard>

      <InsightCard title="Configuration" icon={Settings} delay={0.2}>
        {insights.config.length === 0 ? (
          <p className="text-xs text-muted-foreground">No config sources detected</p>
        ) : (
          <ul className="space-y-2">
            {insights.config.map((c, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-foreground">{c.source}</span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{c.description}</p>
              </li>
            ))}
          </ul>
        )}
      </InsightCard>

      <InsightCard title="Async Patterns" icon={Zap} delay={0.25}>
        {insights.async.length === 0 ? (
          <p className="text-xs text-muted-foreground">No async patterns detected</p>
        ) : (
          <ul className="space-y-2">
            {insights.async.map((a, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-foreground">{a.type}</span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{a.description}</p>
              </li>
            ))}
          </ul>
        )}
      </InsightCard>

      {insights.insights.length > 0 && (
        <InsightCard title="Key Insights" icon={Lightbulb} delay={0.3}>
          <ul className="space-y-2">
            {insights.insights.map((ins, i) => (
              <li key={i} className="text-xs">
                <span
                  className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                    ins.severity === 'strength' ? 'bg-green-400' : 'bg-amber-400'
                  }`}
                />
                <span className="font-medium text-foreground">
                  {ins.severity === 'strength' ? 'Strength' : 'Concern'}
                </span>
                <p className="mt-0.5 ml-3 text-[11px] text-muted-foreground">{ins.description}</p>
              </li>
            ))}
          </ul>
        </InsightCard>
      )}

      {insights.tests.framework && (
        <InsightCard title="Testing" icon={TestTube2} delay={0.35}>
          <div className="space-y-2">
            <p className="text-xs">
              <span className="font-medium text-foreground">Framework:</span>{' '}
              <span className="text-muted-foreground">{insights.tests.framework}</span>
            </p>
            {insights.tests.details.length > 0 && (
              <ul className="space-y-1">
                {insights.tests.details.map((d, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </InsightCard>
      )}
    </motion.div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function ArchitectureDashboard(): React.JSX.Element {
  const [aiSectionExpanded, setAiSectionExpanded] = useState(false)

  const analysisResult = useCortexStore((s) => s.analysisResult)
  const aiInsights = useCortexStore((s) => s.aiInsights)
  const isGeneratingInsights = useCortexStore((s) => s.isGeneratingInsights)
  const generateInsights = useCortexStore((s) => s.generateInsights)
  const navigateToFile = useCortexStore((s) => s.navigateToFile)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)
  const repos = useCortexStore((s) => s.repos)

  // HLD / Design Doc state
  const hldContent = useCortexStore((s) => s.hldContent)
  const designDoc = useCortexStore((s) => s.designDoc)
  const isHLDGenerating = useCortexStore((s) => s.isHLDGenerating)
  const generateHLD = useCortexStore((s) => s.generateHLD)
  const displayContent = hldContent || designDoc

  // Ensure agent providers are loaded (handles direct navigation to Cortex)
  useEffect(() => {
    const store = useAgentStore.getState()
    if (store.providers.length === 0) {
      store.loadProviders()
    }
  }, [])

  // Auto-expand AI section when insights arrive
  useEffect(() => {
    if (aiInsights) {
      setAiSectionExpanded(true)
    }
  }, [aiInsights])

  // Auto-load cached insights on mount if agent configured
  useEffect(() => {
    if (!aiInsights && !isGeneratingInsights && activeRepoId) {
      const repo = repos.find((r) => r.id === activeRepoId)
      const agent = getCortexAgent()
      if (repo?.commitSha && agent) {
        generateInsights()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRepoId])

  // Build static entity graph from analysisResult
  const staticEntityGraph = useMemo(() => {
    if (!analysisResult || analysisResult.entities.length === 0) return { nodes: [], edges: [] }
    return buildStaticEntityGraph(analysisResult)
  }, [analysisResult])

  const hasAgent = !!getCortexAgent()

  const handleGenerateInsights = useCallback(() => {
    setAiSectionExpanded(true)
    generateInsights()
  }, [generateInsights])

  const handleRefreshInsights = useCallback(() => {
    useCortexStore.getState().setAiInsights(null)
    generateInsights()
  }, [generateInsights])

  const handleNavigateToFile = useCallback(
    (filePath: string, line: number) => {
      navigateToFile(filePath, line)
    },
    [navigateToFile]
  )

  // No analysis data at all
  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No analysis data available
      </div>
    )
  }

  const hasRoutes = analysisResult.routes.length > 0
  const hasEntities = analysisResult.entities.length > 0

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">

      {/* ── Section A: Code Structure Overview ───────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h3 className="mb-4 text-sm font-semibold text-foreground">Code Structure Overview</h3>
        <CodeStructureOverview analysisResult={analysisResult} />
      </motion.section>

      {/* ── Section A: Entity Relationship Diagram ────────────── */}
      {hasEntities && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground">Entity Relationship Diagram</h3>
          <p className="mb-3 text-[11px] text-text-tertiary">
            Grouped by kind — controllers, services, repositories. Edges show call/injection relationships.
          </p>
          <Card className="h-72 overflow-hidden">
            {staticEntityGraph.nodes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No entity data available
              </div>
            ) : (
              <ReactFlow
                nodes={staticEntityGraph.nodes}
                edges={staticEntityGraph.edges}
                fitView
                proOptions={{ hideAttribution: true }}
                minZoom={0.2}
                maxZoom={2}
              >
                <Background gap={20} size={1} color="#1e293b" />
                <Controls
                  showInteractive={false}
                  className="!bg-card !border-border/60 !rounded-lg [&>button]:!bg-card [&>button]:!border-border/40 [&>button]:!text-muted-foreground"
                />
                <MiniMap
                  nodeStrokeWidth={3}
                  pannable
                  zoomable
                  className="!bg-card !border-border/60 !rounded-lg"
                />
              </ReactFlow>
            )}
          </Card>
        </motion.section>
      )}

      {/* ── Section A: Route Summary ──────────────────────────── */}
      {hasRoutes && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            API Endpoints
            <span className="ml-2 text-xs font-normal text-text-tertiary">
              {analysisResult.routes.length} total
            </span>
          </h3>
          <RouteSummary routes={analysisResult.routes} onNavigate={handleNavigateToFile} />
        </motion.section>
      )}

      {/* ── Design Document (HLD) ─────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-primary/70" />
            <h3 className="text-sm font-semibold text-foreground">Design Document</h3>
            {isHLDGenerating && (
              <Loader2 size={12} className="animate-spin text-primary" />
            )}
          </div>
          {displayContent && (
            <button
              type="button"
              onClick={() => generateHLD()}
              disabled={isHLDGenerating}
              className="flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
              title="Regenerate design document"
            >
              <RefreshCw size={11} />
              Regenerate
            </button>
          )}
        </div>
        {displayContent ? (
          <Card className="p-5">
            <MarkdownRenderer text={displayContent} />
          </Card>
        ) : isHLDGenerating ? (
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">Generating design document...</p>
            <Skeleton variant="text" lines={4} />
          </div>
        ) : (
          <Card className="p-5 text-center">
            <BookOpen size={28} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              Generate a High Level Design document with architecture diagrams and API flows.
            </p>
            {hasAgent ? (
              <button
                type="button"
                onClick={() => generateHLD()}
                className="mt-3 rounded-lg bg-primary/15 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/25 transition-colors"
                title="Generate design document using AI"
              >
                Generate Design Document
              </button>
            ) : (
              <p className="mt-2 text-[10px] text-muted-foreground/60">
                Configure an AI agent in Settings to generate design documents
              </p>
            )}
          </Card>
        )}
      </motion.section>

      {/* ── Section B: AI-Powered Insights (collapsible) ─────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        {/* Collapsible header */}
        <button
          type="button"
          className="group mb-3 flex w-full items-center gap-2 text-left"
          onClick={() => setAiSectionExpanded((v) => !v)}
          title="Toggle AI-powered insights section"
        >
          <Brain size={15} className="text-primary/70" />
          <h3 className="flex-1 text-sm font-semibold text-foreground">AI-Powered Insights</h3>
          {aiInsights && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Generated
            </span>
          )}
          {aiSectionExpanded ? (
            <ChevronDown size={14} className="text-text-tertiary group-hover:text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="text-text-tertiary group-hover:text-muted-foreground" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {aiSectionExpanded && (
            <motion.div
              key="ai-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-6">
                {/* Generate / Refresh controls */}
                {!aiInsights && !isGeneratingInsights && (
                  <Card className="p-5">
                    {hasAgent ? (
                      <div className="flex flex-col items-start gap-3">
                        <p className="text-xs text-muted-foreground">
                          Generate AI-powered architecture insights: design patterns, security analysis,
                          and dependency mapping.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateInsights}
                          className="rounded-lg bg-primary/15 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/25 transition-colors"
                          title="Generate architecture insights using AI"
                        >
                          Generate Architecture Insights
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Configure an AI agent in{' '}
                        <span className="font-medium text-foreground">Settings</span>{' '}
                        to unlock deeper architecture insights, pattern detection, and security analysis.
                      </p>
                    )}
                  </Card>
                )}

                {/* Loading state */}
                {isGeneratingInsights && !aiInsights && (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Brain size={24} className="text-primary" />
                    </motion.div>
                    <p className="text-xs text-muted-foreground">Cortex is thinking...</p>
                    <div className="mt-2 w-full max-w-lg space-y-2">
                      <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.04]" />
                      <div className="h-4 w-full animate-pulse rounded bg-white/[0.04]" />
                      <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.04]" />
                    </div>
                  </div>
                )}

                {/* Streaming indicator */}
                {isGeneratingInsights && aiInsights && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                    <Loader2 size={13} className="animate-spin" />
                    Streaming insights — cards are populating progressively.
                  </div>
                )}

                {/* AI content */}
                {aiInsights && (
                  <>
                    {/* Architecture overview from AI */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-foreground">Architecture Overview</h4>
                        <button
                          type="button"
                          onClick={handleRefreshInsights}
                          disabled={isGeneratingInsights}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
                          title="Refresh insights"
                        >
                          <RefreshCw size={10} className={isGeneratingInsights ? 'animate-spin' : ''} />
                          Refresh
                        </button>
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {aiInsights.architecture.pattern && (
                          <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary">
                            {aiInsights.architecture.pattern}
                          </span>
                        )}
                        {aiInsights.architecture.framework && (
                          <span className="inline-flex items-center rounded-full bg-card px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {aiInsights.architecture.framework}
                          </span>
                        )}
                        {aiInsights.architecture.language && (
                          <span className="inline-flex items-center rounded-full bg-card px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {aiInsights.architecture.language}
                          </span>
                        )}
                        {aiInsights.architecture.libs.map((lib) => (
                          <span
                            key={lib}
                            className="inline-flex items-center rounded-full bg-card px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {lib}
                          </span>
                        ))}
                      </div>

                      {aiInsights.summary && (
                        <p className="mb-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                          {aiInsights.summary}
                        </p>
                      )}
                    </div>

                    {/* Insight Cards */}
                    <div>
                      <h4 className="mb-3 text-xs font-semibold text-foreground">Architecture Insights</h4>
                      <InsightCardsGrid insights={aiInsights} />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  )
}
