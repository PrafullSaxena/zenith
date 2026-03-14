/**
 * ArchitectureDashboard -- Replaces DesignDocTab with interactive cards
 * showing AI-powered architecture insights. Three sections:
 *   A) Architecture Overview (full width)
 *   B) Insight Cards (responsive grid)
 *   C) Architecture Diagrams (tabbed, React Flow)
 */
import { useState, useMemo, useCallback } from 'react'
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
  Loader2
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
import InsightCard from './InsightCard'

// ── ToonInsights type (matches Task 16 shape) ──────────────────────────

export interface ToonInsights {
  summary: string
  architecture: {
    style: string // e.g. "Hexagonal Architecture", "Layered", "MVC"
    techStack: string[]
    modules: { id: string; label: string; group: string }[]
    moduleDeps: { source: string; target: string; label?: string }[]
  }
  patterns: { name: string; description: string; files: string[] }[]
  security: { pattern: string; description: string; files: string[] }[]
  config: { source: string; description: string; files: string[] }[]
  async: { pattern: string; description: string; files: string[] }[]
  dependencies: {
    name: string
    version: string
    category: string // e.g. "core", "test", "build", "util"
  }[]
  entities: { name: string; kind: string; filePath: string }[]
}

// ── Diagram tab IDs ─────────────────────────────────────────────────────

const DIAGRAM_TABS = [
  { id: 'modules', label: 'Module Dependencies', icon: Network },
  { id: 'layers', label: 'Layer Interaction', icon: Layers },
  { id: 'dataflow', label: 'Data Flow', icon: ArrowRightLeft }
] as const

type DiagramTabId = (typeof DIAGRAM_TABS)[number]['id']

// ── Helpers: build React Flow nodes/edges from insights ────────────────

const MODULE_COLORS: Record<string, string> = {
  core: '#3b82f6',
  api: '#10b981',
  service: '#8b5cf6',
  data: '#f59e0b',
  infra: '#ef4444',
  ui: '#ec4899',
  test: '#6b7280',
  default: '#64748b'
}

function buildModuleGraph(insights: ToonInsights): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = insights.architecture.modules.map((m, i) => ({
    id: m.id,
    position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 140 },
    data: {
      label: m.label
    },
    style: {
      background: `${MODULE_COLORS[m.group] ?? MODULE_COLORS.default}22`,
      border: `1px solid ${MODULE_COLORS[m.group] ?? MODULE_COLORS.default}66`,
      borderRadius: 12,
      padding: '8px 16px',
      fontSize: 11,
      color: '#e2e8f0',
      fontWeight: 600
    }
  }))

  const edges: Edge[] = insights.architecture.moduleDeps.map((d, i) => ({
    id: `me-${i}`,
    source: d.source,
    target: d.target,
    label: d.label ?? '',
    animated: true,
    style: { stroke: '#475569' },
    labelStyle: { fill: '#94a3b8', fontSize: 9 }
  }))

  return { nodes, edges }
}

function buildLayerGraph(insights: ToonInsights): { nodes: Node[]; edges: Edge[] } {
  const groups = new Map<string, typeof insights.architecture.modules>()
  for (const m of insights.architecture.modules) {
    const list = groups.get(m.group) ?? []
    list.push(m)
    groups.set(m.group, list)
  }

  const nodes: Node[] = []
  const edges: Edge[] = []
  let y = 0
  let layerIdx = 0

  for (const [group, members] of groups) {
    const color = MODULE_COLORS[group] ?? MODULE_COLORS.default
    // Layer label node
    nodes.push({
      id: `layer-${group}`,
      position: { x: 0, y },
      data: { label: group.toUpperCase() },
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

    members.forEach((m, mi) => {
      nodes.push({
        id: m.id,
        position: { x: 150 + mi * 180, y },
        data: { label: m.label },
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
      const prevGroup = [...groups.keys()][layerIdx - 1]
      const prevMembers = groups.get(prevGroup)
      if (prevMembers && prevMembers.length > 0) {
        edges.push({
          id: `layer-e-${layerIdx}`,
          source: prevMembers[0].id,
          target: members[0].id,
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

function buildDataFlowGraph(insights: ToonInsights): { nodes: Node[]; edges: Edge[] } {
  // Simple data flow: take moduleDeps and present with a vertical layout
  const nodes: Node[] = insights.architecture.modules.map((m, i) => ({
    id: m.id,
    position: { x: (i % 3) * 240, y: Math.floor(i / 3) * 130 },
    data: { label: m.label },
    style: {
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: 10,
      padding: '8px 16px',
      fontSize: 11,
      color: '#e2e8f0',
      fontWeight: 500
    }
  }))

  const edges: Edge[] = insights.architecture.moduleDeps.map((d, i) => ({
    id: `df-${i}`,
    source: d.source,
    target: d.target,
    label: d.label ?? 'data',
    animated: true,
    style: { stroke: '#3b82f6' },
    labelStyle: { fill: '#94a3b8', fontSize: 9 }
  }))

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
                <span className="font-medium text-text-primary">{s.pattern}</span>
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
                <span className="font-medium text-text-primary">{a.pattern}</span>
                <p className="mt-0.5 text-[11px] text-text-secondary">{a.description}</p>
              </li>
            ))}
          </ul>
        )}
      </InsightCard>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function ArchitectureDashboard(): React.JSX.Element {
  const [activeDiagramTab, setActiveDiagramTab] = useState<DiagramTabId>('modules')

  const analysisResult = useCortexStore((s) => s.analysisResult)
  const aiInsights = useCortexStore((s) => s.aiInsights)
  const isGeneratingInsights = useCortexStore((s) => s.isGeneratingInsights)
  const setGeneratingInsights = useCortexStore((s) => s.setGeneratingInsights)

  // Build graph data for the active diagram tab
  const diagramData = useMemo(() => {
    if (!aiInsights) return { nodes: [], edges: [] }
    switch (activeDiagramTab) {
      case 'modules':
        return buildModuleGraph(aiInsights)
      case 'layers':
        return buildLayerGraph(aiInsights)
      case 'dataflow':
        return buildDataFlowGraph(aiInsights)
      default:
        return { nodes: [], edges: [] }
    }
  }, [aiInsights, activeDiagramTab])

  const handleGenerateInsights = useCallback(() => {
    // Placeholder: actual generation comes in Task 17
    setGeneratingInsights(true)
    // The real implementation will call an IPC handler
  }, [setGeneratingInsights])

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

  // Loading state
  if (isGeneratingInsights) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-accent" />
        <p className="text-sm text-text-secondary">Generating architecture insights...</p>
        <div className="mt-4 w-full max-w-2xl space-y-3 px-6">
          <div className="h-6 w-3/4 animate-pulse rounded bg-surface" />
          <div className="h-4 w-full animate-pulse rounded bg-surface" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-surface" />
          <div className="h-32 w-full animate-pulse rounded bg-surface" />
        </div>
      </div>
    )
  }

  // Full dashboard with insights
  const insights = aiInsights!

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">
      {/* ── Section A: Architecture Overview ─────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Badges row */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Architecture style badge */}
          <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold text-accent">
            {insights.architecture.style}
          </span>

          {/* Tech stack badges */}
          {insights.architecture.techStack.map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium text-text-secondary"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* AI Summary */}
        {insights.summary && (
          <p className="mb-5 max-w-3xl text-sm leading-relaxed text-text-secondary">
            {insights.summary}
          </p>
        )}

        {/* Interactive module graph */}
        {insights.architecture.modules.length > 0 && (
          <div className="h-64 overflow-hidden rounded-xl border border-border/60 bg-surface-elevated/40">
            <ReactFlow
              nodes={buildModuleGraph(insights).nodes}
              edges={buildModuleGraph(insights).edges}
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
