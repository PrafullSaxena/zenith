/**
 * DiagramsTab — AI-powered architecture diagrams (entity graph, layer interaction, dependency map).
 * Extracted from ArchitectureDashboard to its own dedicated tab.
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Network,
  Layers,
  ArrowRightLeft,
  Loader2,
  RefreshCw
} from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCortexStore, getCortexAgent } from '../../../stores/cortex-store'
import { useAgentStore } from '../../../stores/agent-store'
import type { ToonInsights } from '../../../stores/cortex-store'

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

const DIAGRAM_TABS = [
  { id: 'entities', label: 'Entity Graph', icon: Network },
  { id: 'layers', label: 'Layer Interaction', icon: Layers },
  { id: 'dependencies', label: 'Dependency Map', icon: ArrowRightLeft }
] as const

type DiagramTabId = (typeof DIAGRAM_TABS)[number]['id']

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

export default function DiagramsTab(): React.JSX.Element {
  const [activeDiagramTab, setActiveDiagramTab] = useState<DiagramTabId>('entities')

  const analysisResult = useCortexStore((s) => s.analysisResult)
  const aiInsights = useCortexStore((s) => s.aiInsights)
  const isGeneratingInsights = useCortexStore((s) => s.isGeneratingInsights)
  const generateInsights = useCortexStore((s) => s.generateInsights)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)
  const repos = useCortexStore((s) => s.repos)

  useEffect(() => {
    const store = useAgentStore.getState()
    if (store.providers.length === 0) {
      store.loadProviders()
    }
  }, [])

  // Auto-load cached insights if not loaded
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

  const hasAgent = !!getCortexAgent()

  const handleGenerateInsights = useCallback(() => {
    generateInsights()
  }, [generateInsights])

  const handleRefreshInsights = useCallback(() => {
    useCortexStore.getState().setAiInsights(null)
    generateInsights()
  }, [generateInsights])

  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        No analysis data available
      </div>
    )
  }

  // Not yet generated
  if (!aiInsights && !isGeneratingInsights) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <Brain size={36} className="mx-auto mb-3 text-text-secondary/30" />
          <h3 className="text-sm font-semibold text-text-primary">Architecture Diagrams</h3>
          <p className="mt-1 max-w-xs text-xs text-text-secondary">
            Generate AI-powered diagrams: entity graphs, layer interactions, and dependency maps.
          </p>
          {hasAgent ? (
            <button
              type="button"
              onClick={handleGenerateInsights}
              className="mt-4 rounded-lg bg-accent/15 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/25 transition-colors"
              title="Generate architecture diagrams using AI"
            >
              Generate Diagrams
            </button>
          ) : (
            <p className="mt-3 text-[11px] text-text-secondary/70">
              Configure an AI agent in Settings to generate diagrams
            </p>
          )}
        </motion.div>
      </div>
    )
  }

  // Loading
  if (isGeneratingInsights && !aiInsights) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Brain size={24} className="text-accent" />
        </motion.div>
        <p className="text-xs text-text-secondary">Generating architecture diagrams...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-1">
          {DIAGRAM_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeDiagramTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDiagramTab(tab.id)}
                title={tab.label}
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

        <div className="flex items-center gap-2">
          {isGeneratingInsights && (
            <span className="flex items-center gap-1 text-[10px] text-accent">
              <Loader2 size={10} className="animate-spin" />
              Streaming...
            </span>
          )}
          <button
            type="button"
            onClick={handleRefreshInsights}
            disabled={isGeneratingInsights}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors disabled:opacity-40"
            title="Refresh diagrams"
          >
            <RefreshCw size={10} className={isGeneratingInsights ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Diagram */}
      <div className="flex-1 overflow-hidden">
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
    </div>
  )
}
