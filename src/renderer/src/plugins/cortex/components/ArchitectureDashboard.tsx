/**
 * ArchitectureDashboard -- Replaces DesignDocTab with interactive cards
 * showing AI-powered architecture insights. Three sections:
 *   A) Architecture Overview (full width)
 *   B) Insight Cards (responsive grid)
 *   C) Architecture Diagrams (tabbed, React Flow)
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
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
  TestTube2
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
import { useCortexStore } from '../../../stores/cortex-store'
import { useAgentStore } from '../../../stores/agent-store'
import InsightCard from './InsightCard'
import type { ToonInsights } from '../../../stores/cortex-store'

// ── Diagram tab IDs ─────────────────────────────────────────────────────

const DIAGRAM_TABS = [
  { id: 'entities', label: 'Entity Graph', icon: Network },
  { id: 'layers', label: 'Layer Interaction', icon: Layers },
  { id: 'dependencies', label: 'Dependency Map', icon: ArrowRightLeft }
] as const

type DiagramTabId = (typeof DIAGRAM_TABS)[number]['id']

// ── Helpers: build React Flow nodes/edges from insights ────────────────

const KIND_COLORS: Record<string, string> = {
  class: '#3b82f6',
  service: '#8b5cf6',
  controller: '#10b981',
  repository: '#f59e0b',
  component: '#ec4899',
  function: '#64748b',
  middleware: '#ef4444',
  decorator: '#6b7280',
  default: '#64748b'
}

/** Derive graph nodes/edges from entities */
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

  // Connect entities in the same location (file) with edges
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
  // Group entities by kind to form layers
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

  // Center node for the project
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

// ── Section B: InsightCards grid ────────────────────────────────────────

function InsightCardsGrid({ insights }: { insights: ToonInsights }): React.JSX.Element {
  // Group dependencies by category
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
      {/* Dependencies Card */}
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

      {/* Security Card */}
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

      {/* Patterns Card */}
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

      {/* Config Card */}
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

      {/* Async Card */}
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

      {/* Insights Card (strengths & concerns) */}
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

      {/* Tests Card */}
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

  const analysisResult = useCortexStore((s) => s.analysisResult)
  const aiInsights = useCortexStore((s) => s.aiInsights)
  const isGeneratingInsights = useCortexStore((s) => s.isGeneratingInsights)
  const generateInsights = useCortexStore((s) => s.generateInsights)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)
  const repos = useCortexStore((s) => s.repos)

  // Ensure agent providers are loaded (handles direct navigation to Cortex)
  useEffect(() => {
    const store = useAgentStore.getState()
    if (store.providers.length === 0) {
      store.loadProviders()
    }
  }, [])

  // Auto-load cached insights on mount
  useEffect(() => {
    if (!aiInsights && !isGeneratingInsights && activeRepoId) {
      const repo = repos.find((r) => r.id === activeRepoId)
      if (repo?.commitSha) {
        generateInsights()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRepoId])

  // Build graph data for the active diagram tab
  const diagramData = useMemo(() => {
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

  const handleGenerateInsights = useCallback(() => {
    generateInsights()
  }, [generateInsights])

  const handleRefreshInsights = useCallback(() => {
    useCortexStore.getState().setAiInsights(null)
    generateInsights()
  }, [generateInsights])

  // No analysis data at all
  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        No analysis data available
      </div>
    )
  }

  // No AI insights yet — show generation prompt
  if (!aiInsights && !isGeneratingInsights) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10"
          >
            <Brain size={28} className="text-accent" />
          </motion.div>
          <h3 className="text-sm font-semibold text-text-primary">Architecture Dashboard</h3>
          <p className="mt-1.5 max-w-sm text-xs text-text-secondary">
            Generate AI-powered architecture insights including design patterns,
            security analysis, dependency mapping, and interactive diagrams.
          </p>
          <button
            type="button"
            onClick={handleGenerateInsights}
            className="mt-5 rounded-lg bg-accent/15 px-5 py-2.5 text-xs font-medium text-accent hover:bg-accent/25 transition-colors"
          >
            Generate Architecture Insights
          </button>
        </motion.div>
      </div>
    )
  }

  // Loading state with progressive content
  if (isGeneratingInsights && !aiInsights) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Brain size={28} className="text-accent" />
        </motion.div>
        <p className="text-sm text-text-secondary">Cortex is thinking...</p>
        <div className="mt-4 w-full max-w-2xl space-y-3 px-6">
          <div className="h-6 w-3/4 animate-pulse rounded bg-surface" />
          <div className="h-4 w-full animate-pulse rounded bg-surface" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-surface" />
          <div className="h-32 w-full animate-pulse rounded bg-surface" />
        </div>
      </div>
    )
  }

  // Full dashboard with insights (may still be streaming)
  if (!aiInsights) return null
  const insights = aiInsights

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">
      {/* Streaming indicator */}
      {isGeneratingInsights && (
        <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
          <Loader2 size={14} className="animate-spin" />
          Streaming insights... cards will populate progressively.
        </div>
      )}

      {/* ── Section A: Architecture Overview ─────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Title row with refresh */}
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Architecture Overview</h3>
          <button
            type="button"
            onClick={handleRefreshInsights}
            disabled={isGeneratingInsights}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors disabled:opacity-40"
            title="Refresh insights"
          >
            <RefreshCw size={11} className={isGeneratingInsights ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Badges row */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Architecture pattern badge */}
          {insights.architecture.pattern && (
            <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold text-accent">
              {insights.architecture.pattern}
            </span>
          )}

          {/* Framework badge */}
          {insights.architecture.framework && (
            <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium text-text-secondary">
              {insights.architecture.framework}
            </span>
          )}

          {/* Language badge */}
          {insights.architecture.language && (
            <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium text-text-secondary">
              {insights.architecture.language}
            </span>
          )}

          {/* Lib badges */}
          {insights.architecture.libs.map((lib) => (
            <span
              key={lib}
              className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium text-text-secondary"
            >
              {lib}
            </span>
          ))}
        </div>

        {/* AI Summary */}
        {insights.summary && (
          <p className="mb-5 max-w-3xl text-sm leading-relaxed text-text-secondary">
            {insights.summary}
          </p>
        )}

        {/* Interactive entity graph */}
        {insights.entities.length > 0 && (
          <div className="h-64 overflow-hidden rounded-xl border border-border/60 bg-surface-elevated/40">
            <ReactFlow
              nodes={buildEntityGraph(insights).nodes}
              edges={buildEntityGraph(insights).edges}
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
              <MiniMap
                nodeStrokeWidth={3}
                pannable
                zoomable
                className="!bg-surface !border-border/60 !rounded-lg"
              />
            </ReactFlow>
          </div>
        )}
      </motion.section>

      {/* ── Section B: Insight Cards ─────────────────────────────── */}
      <section>
        <h3 className="mb-4 text-xs font-semibold text-text-primary">Architecture Insights</h3>
        <InsightCardsGrid insights={insights} />
      </section>

      {/* ── Section C: Architecture Diagrams ─────────────────────── */}
      <section>
        <h3 className="mb-3 text-xs font-semibold text-text-primary">Architecture Diagrams</h3>

        {/* Diagram tab bar */}
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

        {/* Diagram canvas */}
        <div className="h-80 overflow-hidden rounded-xl border border-border/60 bg-surface-elevated/40">
          {diagramData.nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-text-secondary">
              No diagram data available for this view
            </div>
          ) : (
            <ReactFlow
              key={activeDiagramTab}
              nodes={diagramData.nodes}
              edges={diagramData.edges}
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
      </section>
    </div>
  )
}
