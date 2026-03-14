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
import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Package,
  Shield,
  Layers,
  Settings,
  Zap,
  Network,
  ArrowRightLeft,
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
import { useAgentStore } from '../../../stores/agent-store'
import InsightCard from './InsightCard'
import type { ToonInsights } from '../../../stores/cortex-store'
import type { AnalysisResult, RouteInfo } from '../../../types/cortex'

// ── Color constants ──────────────────────────────────────────────────────

const KIND_COLORS: Record<string, string> = {
  class: '#3b82f6',
  service: '#8b5cf6',
  controller: '#10b981',
  repository: '#f59e0b',
  component: '#ec4899',
  function: '#64748b',
  middleware: '#ef4444',
  decorator: '#6b7280',
  method: '#6b7280',
  route: '#10b981',
  dag: '#f59e0b',
  task: '#8b5cf6',
  default: '#64748b'
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#10b981',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  PATCH: '#8b5cf6',
  DELETE: '#ef4444',
  ALL: '#64748b'
}

// ── Diagram tab IDs ─────────────────────────────────────────────────────

const DIAGRAM_TABS = [
  { id: 'entities', label: 'Entity Graph', icon: Network },
  { id: 'layers', label: 'Layer Interaction', icon: Layers },
  { id: 'dependencies', label: 'Dependency Map', icon: ArrowRightLeft }
] as const

type DiagramTabId = (typeof DIAGRAM_TABS)[number]['id']

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
    const color = KIND_COLORS[kind] ?? KIND_COLORS.default
    const x = colIdx * COLUMN_WIDTH

    // Column header node
    nodes.push({
      id: `col-${kind}`,
      position: { x, y: 0 },
      data: { label: kind.toUpperCase() },
      selectable: false,
      style: {
        background: `${color}15`,
        border: `1px dashed ${color}44`,
        borderRadius: 8,
        padding: '4px 12px',
        fontSize: 9,
        color,
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
          background: `${color}22`,
          border: `1px solid ${color}55`,
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

// ── Helpers: build React Flow graphs from AI insights ──────────────────

function buildEntityGraph(insights: ToonInsights): { nodes: Node[]; edges: Edge[] } {
  const entities = insights.entities.slice(0, 20)
  const nodes: Node[] = entities.map((e, i) => {
    const color = KIND_COLORS[e.kind.toLowerCase()] ?? KIND_COLORS.default
    return {
      id: `entity-${i}`,
      position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 140 },
      data: { label: `${e.name}\n(${e.kind})` },
      style: {
        background: `${color}22`,
        border: `1px solid ${color}66`,
        borderRadius: 12,
        padding: '8px 16px',
        fontSize: 11,
        color: '#e2e8f0',
        fontWeight: 600,
        whiteSpace: 'pre-line' as const
      }
    }
  })

  const edges: Edge[] = []
  const locationMap = new Map<string, number[]>()
  entities.forEach((e, i) => {
    const loc = e.location.split('/').slice(0, -1).join('/')
    const list = locationMap.get(loc) ?? []
    list.push(i)
    locationMap.set(loc, list)
  })
  let edgeIdx = 0
  for (const indices of locationMap.values()) {
    for (let j = 1; j < indices.length; j++) {
      edges.push({
        id: `ee-${edgeIdx++}`,
        source: `entity-${indices[j - 1]}`,
        target: `entity-${indices[j]}`,
        animated: true,
        style: { stroke: '#475569' }
      })
    }
  }
  return { nodes, edges }
}

function buildLayerGraph(insights: ToonInsights): { nodes: Node[]; edges: Edge[] } {
  const groups = new Map<string, typeof insights.entities>()
  for (const e of insights.entities.slice(0, 30)) {
    const kind = e.kind.toLowerCase()
    const list = groups.get(kind) ?? []
    list.push(e)
    groups.set(kind, list)
  }

  const nodes: Node[] = []
  const edges: Edge[] = []
  let y = 0
  let layerIdx = 0

  for (const [kind, members] of groups) {
    const color = KIND_COLORS[kind] ?? KIND_COLORS.default
    nodes.push({
      id: `layer-${kind}`,
      position: { x: 0, y },
      data: { label: kind.toUpperCase() },
      style: {
        background: `${color}15`,
        border: `1px dashed ${color}44`,
        borderRadius: 12,
        padding: '6px 14px',
        fontSize: 10,
        color: `${color}`,
        fontWeight: 700,
        letterSpacing: '0.05em',
        width: 120
      }
    })
    members.slice(0, 5).forEach((m, mi) => {
      nodes.push({
        id: `layer-${kind}-${mi}`,
        position: { x: 150 + mi * 180, y },
        data: { label: m.name },
        style: {
          background: `${color}22`,
          border: `1px solid ${color}55`,
          borderRadius: 10,
          padding: '8px 14px',
          fontSize: 11,
          color: '#e2e8f0',
          fontWeight: 500
        }
      })
    })
    if (layerIdx > 0) {
      const prevKind = [...groups.keys()][layerIdx - 1]
      const prevMembers = groups.get(prevKind)
      if (prevMembers && prevMembers.length > 0) {
        edges.push({
          id: `layer-e-${layerIdx}`,
          source: `layer-${prevKind}-0`,
          target: `layer-${kind}-0`,
          animated: true,
          style: { stroke: '#475569', strokeDasharray: '5 5' }
        })
      }
    }
    y += 120
    layerIdx++
  }
  return { nodes, edges }
}

function buildDependencyGraph(insights: ToonInsights): { nodes: Node[]; edges: Edge[] } {
  const deps = insights.dependencies.slice(0, 20)
  const catColors: Record<string, string> = {
    runtime: '#3b82f6',
    devdependency: '#8b5cf6',
    core: '#10b981',
    test: '#6b7280',
    build: '#f59e0b',
    util: '#ec4899'
  }
  const nodes: Node[] = [
    {
      id: 'project',
      position: { x: 300, y: 200 },
      data: { label: insights.architecture.framework || 'Project' },
      style: {
        background: '#3b82f622',
        border: '2px solid #3b82f6',
        borderRadius: 16,
        padding: '10px 20px',
        fontSize: 12,
        color: '#e2e8f0',
        fontWeight: 700
      }
    }
  ]
  const edges: Edge[] = []
  const angleStep = (2 * Math.PI) / Math.max(deps.length, 1)
  deps.forEach((dep, i) => {
    const angle = i * angleStep
    const radius = 180
    const color = catColors[dep.category.toLowerCase()] ?? '#64748b'
    nodes.push({
      id: `dep-${i}`,
      position: { x: 300 + Math.cos(angle) * radius, y: 200 + Math.sin(angle) * radius },
      data: { label: `${dep.name}\n${dep.version}` },
      style: {
        background: `${color}22`,
        border: `1px solid ${color}55`,
        borderRadius: 10,
        padding: '6px 12px',
        fontSize: 10,
        color: '#e2e8f0',
        fontWeight: 500,
        whiteSpace: 'pre-line' as const
      }
    })
    edges.push({
      id: `dep-e-${i}`,
      source: 'project',
      target: `dep-${i}`,
      style: { stroke: `${color}66` }
    })
  })
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold text-accent">
            <Cpu size={11} />
            {framework}
          </span>
        )}
        {language && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[10px] font-medium text-text-secondary">
            <FileCode size={10} />
            {language}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5">
          <FileCode size={13} className="text-text-tertiary" />
          <span className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">{stats.totalFiles.toLocaleString()}</span> files
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Hash size={13} className="text-text-tertiary" />
          <span className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">{stats.totalLines.toLocaleString()}</span> lines
          </span>
        </div>
        {stats.routeCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Globe size={13} className="text-text-tertiary" />
            <span className="text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">{stats.routeCount}</span> API endpoints
            </span>
          </div>
        )}
        {stats.componentCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Network size={13} className="text-text-tertiary" />
            <span className="text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">{stats.componentCount}</span> components
            </span>
          </div>
        )}
      </div>

      {/* Entity kind badges */}
      {entityBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entityBadges.map((ec) => {
            const color = KIND_COLORS[ec.kind.toLowerCase()] ?? KIND_COLORS.default
            return (
              <span
                key={ec.kind}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium"
                style={{ background: `${color}20`, color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: color }}
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
              className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-[10px] text-text-secondary"
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
          const color = METHOD_COLORS[method] ?? '#64748b'
          return (
            <span
              key={method}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: `${color}20`, color }}
            >
              {method}
              <span className="ml-0.5 opacity-70">{count}</span>
            </span>
          )
        })}
      </div>

      {/* Route list */}
      <div className="divide-y divide-border/30 rounded-lg border border-border/40 bg-surface/50">
        {topRoutes.map((route, i) => {
          const color = METHOD_COLORS[route.method] ?? '#64748b'
          return (
            <button
              key={i}
              type="button"
              className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-elevated"
              onClick={() => onNavigate(route.filePath, route.line)}
            >
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                style={{ background: `${color}20`, color }}
              >
                {route.method}
              </span>
              <span className="flex-1 truncate text-[11px] font-mono text-text-primary">
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
      </div>
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <InsightCard title="Dependencies" icon={Package} delay={0.05}>
        {insights.dependencies.length === 0 ? (
          <p className="text-xs text-text-secondary">No dependency data available</p>
        ) : (
          <div className="space-y-3">
            {[...depsByCategory.entries()].map(([category, deps]) => (
              <div key={category}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                  {category}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {deps.map((dep) => (
                    <span
                      key={dep.name}
                      className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[10px] text-text-secondary"
                    >
                      {dep.name}
                      {dep.version && (
                        <span className="text-accent/70">{dep.version}</span>
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
          <p className="text-xs text-text-secondary">No security patterns detected</p>
        ) : (
          <ul className="space-y-2">
            {insights.security.map((s, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-text-primary">{s.type}</span>
                <p className="mt-0.5 text-[11px] text-text-secondary">{s.description}</p>
              </li>
            ))}
          </ul>
        )}
      </InsightCard>

      <InsightCard title="Design Patterns" icon={Layers} delay={0.15}>
        {insights.patterns.length === 0 ? (
          <p className="text-xs text-text-secondary">No design patterns detected</p>
        ) : (
          <ul className="space-y-2">
            {insights.patterns.map((p, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-text-primary">{p.name}</span>
                <p className="mt-0.5 text-[11px] text-text-secondary">{p.description}</p>
              </li>
            ))}
          </ul>
        )}
      </InsightCard>

      <InsightCard title="Configuration" icon={Settings} delay={0.2}>
        {insights.config.length === 0 ? (
          <p className="text-xs text-text-secondary">No config sources detected</p>
        ) : (
          <ul className="space-y-2">
            {insights.config.map((c, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-text-primary">{c.source}</span>
                <p className="mt-0.5 text-[11px] text-text-secondary">{c.description}</p>
              </li>
            ))}
          </ul>
        )}
      </InsightCard>

      <InsightCard title="Async Patterns" icon={Zap} delay={0.25}>
        {insights.async.length === 0 ? (
          <p className="text-xs text-text-secondary">No async patterns detected</p>
        ) : (
          <ul className="space-y-2">
            {insights.async.map((a, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-text-primary">{a.type}</span>
                <p className="mt-0.5 text-[11px] text-text-secondary">{a.description}</p>
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
                <span className="font-medium text-text-primary">
                  {ins.severity === 'strength' ? 'Strength' : 'Concern'}
                </span>
                <p className="mt-0.5 ml-3 text-[11px] text-text-secondary">{ins.description}</p>
              </li>
            ))}
          </ul>
        </InsightCard>
      )}

      {insights.tests.framework && (
        <InsightCard title="Testing" icon={TestTube2} delay={0.35}>
          <div className="space-y-2">
            <p className="text-xs">
              <span className="font-medium text-text-primary">Framework:</span>{' '}
              <span className="text-text-secondary">{insights.tests.framework}</span>
            </p>
            {insights.tests.details.length > 0 && (
              <ul className="space-y-1">
                {insights.tests.details.map((d, i) => (
                  <li key={i} className="text-[11px] text-text-secondary">
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </InsightCard>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function ArchitectureDashboard(): React.JSX.Element {
  const [activeDiagramTab, setActiveDiagramTab] = useState<DiagramTabId>('entities')
  const [aiSectionExpanded, setAiSectionExpanded] = useState(false)

  const analysisResult = useCortexStore((s) => s.analysisResult)
  const aiInsights = useCortexStore((s) => s.aiInsights)
  const isGeneratingInsights = useCortexStore((s) => s.isGeneratingInsights)
  const generateInsights = useCortexStore((s) => s.generateInsights)
  const navigateToFile = useCortexStore((s) => s.navigateToFile)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)
  const repos = useCortexStore((s) => s.repos)

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

  // Build AI diagram data
  const aiDiagramData = useMemo(() => {
    if (!aiInsights) return { nodes: [], edges: [] }
    switch (activeDiagramTab) {
      case 'entities':
        return buildEntityGraph(aiInsights)
      case 'layers':
        return buildLayerGraph(aiInsights)
      case 'dependencies':
        return buildDependencyGraph(aiInsights)
      default:
        return { nodes: [], edges: [] }
    }
  }, [aiInsights, activeDiagramTab])

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
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
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
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Code Structure Overview</h3>
        <CodeStructureOverview analysisResult={analysisResult} />
      </motion.section>

      {/* ── Section A: Entity Relationship Diagram ────────────── */}
      {hasEntities && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Entity Relationship Diagram</h3>
          <p className="mb-3 text-[11px] text-text-tertiary">
            Grouped by kind — controllers, services, repositories. Edges show call/injection relationships.
          </p>
          <div className="h-72 overflow-hidden rounded-xl border border-border/60 bg-surface-elevated/40">
            {staticEntityGraph.nodes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-text-secondary">
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
                  className="!bg-surface !border-border/60 !rounded-lg [&>button]:!bg-surface [&>button]:!border-border/40 [&>button]:!text-text-secondary"
                />
                <MiniMap
                  nodeStrokeWidth={3}
                  pannable
                  zoomable
                  className="!bg-surface !border-border/60 !rounded-lg"
                />
              </ReactFlow>
            )}
          </div>
        </motion.section>
      )}

      {/* ── Section A: Route Summary ──────────────────────────── */}
      {hasRoutes && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <h3 className="mb-3 text-sm font-semibold text-text-primary">
            API Endpoints
            <span className="ml-2 text-xs font-normal text-text-tertiary">
              {analysisResult.routes.length} total
            </span>
          </h3>
          <RouteSummary routes={analysisResult.routes} onNavigate={handleNavigateToFile} />
        </motion.section>
      )}

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
        >
          <Brain size={15} className="text-accent/70" />
          <h3 className="flex-1 text-sm font-semibold text-text-primary">AI-Powered Insights</h3>
          {aiInsights && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              Generated
            </span>
          )}
          {aiSectionExpanded ? (
            <ChevronDown size={14} className="text-text-tertiary group-hover:text-text-secondary" />
          ) : (
            <ChevronRight size={14} className="text-text-tertiary group-hover:text-text-secondary" />
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
                  <div className="rounded-xl border border-border/40 bg-surface/40 p-5">
                    {hasAgent ? (
                      <div className="flex flex-col items-start gap-3">
                        <p className="text-xs text-text-secondary">
                          Generate AI-powered architecture insights: design patterns, security analysis,
                          dependency mapping, and richer interactive diagrams.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateInsights}
                          className="rounded-lg bg-accent/15 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/25 transition-colors"
                        >
                          Generate Architecture Insights
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary">
                        Configure an AI agent in{' '}
                        <span className="font-medium text-text-primary">Settings</span>{' '}
                        to unlock deeper architecture insights, pattern detection, and security analysis.
                      </p>
                    )}
                  </div>
                )}

                {/* Loading state */}
                {isGeneratingInsights && !aiInsights && (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Brain size={24} className="text-accent" />
                    </motion.div>
                    <p className="text-xs text-text-secondary">Cortex is thinking...</p>
                    <div className="mt-2 w-full max-w-lg space-y-2">
                      <div className="h-5 w-3/4 animate-pulse rounded bg-surface" />
                      <div className="h-4 w-full animate-pulse rounded bg-surface" />
                      <div className="h-4 w-5/6 animate-pulse rounded bg-surface" />
                    </div>
                  </div>
                )}

                {/* Streaming indicator */}
                {isGeneratingInsights && aiInsights && (
                  <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
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
                        <h4 className="text-xs font-semibold text-text-primary">Architecture Overview</h4>
                        <button
                          type="button"
                          onClick={handleRefreshInsights}
                          disabled={isGeneratingInsights}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors disabled:opacity-40"
                          title="Refresh insights"
                        >
                          <RefreshCw size={10} className={isGeneratingInsights ? 'animate-spin' : ''} />
                          Refresh
                        </button>
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {aiInsights.architecture.pattern && (
                          <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold text-accent">
                            {aiInsights.architecture.pattern}
                          </span>
                        )}
                        {aiInsights.architecture.framework && (
                          <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium text-text-secondary">
                            {aiInsights.architecture.framework}
                          </span>
                        )}
                        {aiInsights.architecture.language && (
                          <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium text-text-secondary">
                            {aiInsights.architecture.language}
                          </span>
                        )}
                        {aiInsights.architecture.libs.map((lib) => (
                          <span
                            key={lib}
                            className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium text-text-secondary"
                          >
                            {lib}
                          </span>
                        ))}
                      </div>

                      {aiInsights.summary && (
                        <p className="mb-3 max-w-3xl text-sm leading-relaxed text-text-secondary">
                          {aiInsights.summary}
                        </p>
                      )}
                    </div>

                    {/* Insight Cards */}
                    <div>
                      <h4 className="mb-3 text-xs font-semibold text-text-primary">Architecture Insights</h4>
                      <InsightCardsGrid insights={aiInsights} />
                    </div>

                    {/* AI Diagram Tabs */}
                    <div>
                      <h4 className="mb-3 text-xs font-semibold text-text-primary">Architecture Diagrams</h4>
                      <div className="mb-3 flex items-center gap-1">
                        {DIAGRAM_TABS.map((tab) => {
                          const Icon = tab.icon
                          const isActive = activeDiagramTab === tab.id
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActiveDiagramTab(tab.id)}
                              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                                isActive
                                  ? 'bg-accent/15 text-accent'
                                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                              }`}
                            >
                              <Icon size={12} />
                              {tab.label}
                            </button>
                          )
                        })}
                      </div>
                      <div className="h-80 overflow-hidden rounded-xl border border-border/60 bg-surface-elevated/40">
                        {aiDiagramData.nodes.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-xs text-text-secondary">
                            No diagram data available for this view
                          </div>
                        ) : (
                          <ReactFlow
                            key={activeDiagramTab}
                            nodes={aiDiagramData.nodes}
                            edges={aiDiagramData.edges}
                            fitView
                            proOptions={{ hideAttribution: true }}
                            minZoom={0.3}
                            maxZoom={2}
                          >
                            <Background gap={20} size={1} color="#1e293b" />
                            <Controls
                              showInteractive={false}
                              className="!bg-surface !border-border/60 !rounded-lg [&>button]:!bg-surface [&>button]:!border-border/40 [&>button]:!text-text-secondary"
                            />
                          </ReactFlow>
                        )}
                      </div>
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
