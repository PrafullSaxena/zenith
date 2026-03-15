/**
 * DiagramsTab — Architecture diagrams built from actual analysis data.
 * Shows entity graph (from CodeEntity + CallEdge), layer interaction, and dependency map.
 */
import { useState, useMemo } from 'react'
import {
  Network,
  Layers,
  ArrowRightLeft
} from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'framer-motion'
import { useCortexStore } from '../../../stores/cortex-store'
import type { AnalysisResult, CodeEntity } from '../../../types/cortex'
import { getKindColor, GLASS_SURFACE } from '../cortex-theme'

const DIAGRAM_TABS = [
  { id: 'entities', label: 'Entity Graph', icon: Network },
  { id: 'layers', label: 'Layer Interaction', icon: Layers },
  { id: 'dependencies', label: 'Dependency Map', icon: ArrowRightLeft }
] as const

type DiagramTabId = (typeof DIAGRAM_TABS)[number]['id']

/** Build entity graph from real entities and call edges */
function buildEntityGraph(result: AnalysisResult): { nodes: Node[]; edges: Edge[] } {
  const topEntities = result.entities.filter(
    (e) => e.kind !== 'method' && e.kind !== 'function' && e.kind !== 'decorator'
  )

  const cols = Math.max(Math.ceil(Math.sqrt(topEntities.length)), 4)
  const nodes: Node[] = topEntities.slice(0, 40).map((e, i) => {
    const color = getKindColor(e.kind)
    return {
      id: e.id,
      position: { x: (i % cols) * 240, y: Math.floor(i / cols) * 120 },
      data: { label: `${e.name}\n(${e.kind})` },
      style: {
        background: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: 14,
        padding: '10px 16px',
        fontSize: 11,
        color: '#e2e8f0',
        fontWeight: 600,
        whiteSpace: 'pre-line' as const,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 4px 20px ${color.glow}`
      }
    }
  })

  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges: Edge[] = []
  const seenEdges = new Set<string>()
  const entityById = new Map(result.entities.map((e) => [e.id, e]))

  for (const call of result.calls) {
    let sourceId = call.callerId
    let targetId = call.calleeId

    const caller = entityById.get(sourceId)
    if (caller && caller.kind === 'method' && caller.parentId) sourceId = caller.parentId
    const callee = entityById.get(targetId)
    if (callee && callee.kind === 'method' && callee.parentId) targetId = callee.parentId

    if (sourceId === targetId) continue
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) continue

    const key = `${sourceId}->${targetId}`
    if (seenEdges.has(key)) continue
    seenEdges.add(key)

    const color = call.type === 'inject' ? '#8b5cf6' : call.type === 'inferred' ? '#64748b' : '#475569'
    edges.push({
      id: `ee-${edges.length}`,
      source: sourceId,
      target: targetId,
      animated: call.type === 'inject',
      label: call.type !== 'call' ? call.type : undefined,
      style: { stroke: color },
      labelStyle: { fontSize: 9, fill: '#94a3b8' }
    })
  }

  return { nodes, edges }
}

/** Build layer interaction diagram from real entities grouped by kind */
function buildLayerGraph(result: AnalysisResult): { nodes: Node[]; edges: Edge[] } {
  const groups = new Map<string, CodeEntity[]>()
  for (const e of result.entities) {
    if (e.kind === 'method' || e.kind === 'function' || e.kind === 'decorator') continue
    const list = groups.get(e.kind) ?? []
    list.push(e)
    groups.set(e.kind, list)
  }

  const layerOrder = ['controller', 'web-adapter', 'middleware', 'service', 'port-in', 'port-out', 'repository', 'db-adapter', 'class', 'component', 'configuration', 'dag', 'task']
  const orderedKinds = [...groups.keys()].sort((a, b) => {
    const ai = layerOrder.indexOf(a)
    const bi = layerOrder.indexOf(b)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  const nodes: Node[] = []
  const edges: Edge[] = []
  let y = 0

  const entityById = new Map(result.entities.map((e) => [e.id, e]))
  const layerConnections = new Map<string, Set<string>>()

  for (const call of result.calls) {
    let sourceId = call.callerId
    let targetId = call.calleeId
    const caller = entityById.get(sourceId)
    if (caller?.kind === 'method' && caller.parentId) sourceId = caller.parentId
    const callee = entityById.get(targetId)
    if (callee?.kind === 'method' && callee.parentId) targetId = callee.parentId

    const sourceEntity = entityById.get(sourceId)
    const targetEntity = entityById.get(targetId)
    if (!sourceEntity || !targetEntity || sourceEntity.kind === targetEntity.kind) continue

    const conns = layerConnections.get(sourceEntity.kind) ?? new Set()
    conns.add(targetEntity.kind)
    layerConnections.set(sourceEntity.kind, conns)
  }

  for (const kind of orderedKinds) {
    const members = groups.get(kind)
    if (!members) continue
    const color = getKindColor(kind)

    nodes.push({
      id: `layer-${kind}`,
      position: { x: 0, y },
      data: { label: kind.toUpperCase() },
      style: {
        background: color.bg,
        border: `1px dashed ${color.border}`,
        borderRadius: 12,
        padding: '6px 14px',
        fontSize: 10,
        color: color.text,
        fontWeight: 700,
        letterSpacing: '0.05em',
        width: 120,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 4px 20px ${color.glow}`
      }
    })

    members.slice(0, 5).forEach((m, mi) => {
      nodes.push({
        id: `layer-${kind}-${mi}`,
        position: { x: 150 + mi * 200, y },
        data: { label: m.name },
        style: {
          background: color.bg,
          border: `1px solid ${color.border}`,
          borderRadius: 10,
          padding: '8px 14px',
          fontSize: 11,
          color: '#e2e8f0',
          fontWeight: 500,
          backdropFilter: 'blur(8px)',
          boxShadow: `0 4px 20px ${color.glow}`
        }
      })
    })

    y += 120
  }

  let edgeIdx = 0
  for (const [sourceKind, targetKinds] of layerConnections) {
    for (const targetKind of targetKinds) {
      const sourceMembers = groups.get(sourceKind)
      const targetMembers = groups.get(targetKind)
      if (sourceMembers && sourceMembers.length > 0 && targetMembers && targetMembers.length > 0) {
        edges.push({
          id: `layer-e-${edgeIdx++}`,
          source: `layer-${sourceKind}-0`,
          target: `layer-${targetKind}-0`,
          animated: true,
          style: { stroke: '#475569', strokeDasharray: '5 5' }
        })
      }
    }
  }

  return { nodes, edges }
}

/** Build dependency graph showing entity kind distribution with inter-kind connections */
function buildDependencyGraph(result: AnalysisResult): { nodes: Node[]; edges: Edge[] } {
  const entityKinds = result.stats.entityCount
  if (entityKinds.length === 0) return { nodes: [], edges: [] }

  const projectColor = getKindColor('class')
  const nodes: Node[] = [
    {
      id: 'project',
      position: { x: 300, y: 250 },
      data: { label: result.framework || 'Project' },
      style: {
        background: projectColor.bg,
        border: `2px solid ${projectColor.border}`,
        borderRadius: 16,
        padding: '10px 20px',
        fontSize: 12,
        color: '#e2e8f0',
        fontWeight: 700,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 4px 24px ${projectColor.glow}`
      }
    }
  ]
  const edges: Edge[] = []

  const angleStep = (2 * Math.PI) / Math.max(entityKinds.length, 1)
  entityKinds.forEach((ek, i) => {
    const angle = i * angleStep - Math.PI / 2
    const radius = 200
    const color = getKindColor(ek.kind)
    nodes.push({
      id: `ek-${i}`,
      position: { x: 300 + Math.cos(angle) * radius, y: 250 + Math.sin(angle) * radius },
      data: { label: `${ek.kind}\n(${ek.count})` },
      style: {
        background: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: 10,
        padding: '6px 12px',
        fontSize: 10,
        color: '#e2e8f0',
        fontWeight: 500,
        whiteSpace: 'pre-line' as const,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 4px 20px ${color.glow}`
      }
    })
    edges.push({
      id: `ek-e-${i}`,
      source: 'project',
      target: `ek-${i}`,
      style: { stroke: color.border }
    })
  })

  // Add inter-kind edges based on actual call graph
  const entityById = new Map(result.entities.map((e) => [e.id, e]))
  const kindToKind = new Map<string, Set<string>>()

  for (const call of result.calls) {
    const caller = entityById.get(call.callerId)
    const callee = entityById.get(call.calleeId)
    if (!caller || !callee) continue

    const callerKind = caller.kind === 'method' && caller.parentId
      ? (entityById.get(caller.parentId)?.kind ?? caller.kind)
      : caller.kind
    const calleeKind = callee.kind === 'method' && callee.parentId
      ? (entityById.get(callee.parentId)?.kind ?? callee.kind)
      : callee.kind

    if (callerKind === calleeKind) continue
    const conns = kindToKind.get(callerKind) ?? new Set()
    conns.add(calleeKind)
    kindToKind.set(callerKind, conns)
  }

  const kindIndexMap = new Map(entityKinds.map((ek, i) => [ek.kind, i]))
  let edgeId = entityKinds.length
  for (const [sourceKind, targetKinds] of kindToKind) {
    const si = kindIndexMap.get(sourceKind)
    if (si === undefined) continue
    for (const targetKind of targetKinds) {
      const ti = kindIndexMap.get(targetKind)
      if (ti === undefined) continue
      edges.push({
        id: `ek-e-${edgeId++}`,
        source: `ek-${si}`,
        target: `ek-${ti}`,
        animated: true,
        style: { stroke: '#47556944', strokeDasharray: '4 4' }
      })
    }
  }

  return { nodes, edges }
}

export default function DiagramsTab(): React.JSX.Element {
  const [activeDiagramTab, setActiveDiagramTab] = useState<DiagramTabId>('entities')
  const analysisResult = useCortexStore((s) => s.analysisResult)

  const diagramData = useMemo(() => {
    if (!analysisResult) return { nodes: [], edges: [] }
    switch (activeDiagramTab) {
      case 'entities':
        return buildEntityGraph(analysisResult)
      case 'layers':
        return buildLayerGraph(analysisResult)
      case 'dependencies':
        return buildDependencyGraph(analysisResult)
      default:
        return { nodes: [], edges: [] }
    }
  }, [analysisResult, activeDiagramTab])

  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        No analysis data available
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2 ${GLASS_SURFACE}`}>
        <div className="flex items-center gap-1">
          {DIAGRAM_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeDiagramTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDiagramTab(tab.id)}
                className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="cortex-diagram-tab"
                    className="absolute inset-0 rounded-lg bg-accent/12"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={12} />
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
        <span className="text-[10px] text-text-secondary">
          {diagramData.nodes.length} nodes / {diagramData.edges.length} edges
        </span>
      </div>

      {/* Diagram */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.03)_0%,transparent_70%)]" />
        {diagramData.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-text-secondary">
            No entities detected for diagram visualization
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
            <Background gap={20} size={1} color="#1e293b" variant="dots" />
            <Controls
              showInteractive={false}
              className="!bg-white/[0.03] !backdrop-blur-xl !border-white/[0.08] !rounded-xl [&>button]:!bg-transparent [&>button]:!border-white/[0.06] [&>button]:!text-text-secondary"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
