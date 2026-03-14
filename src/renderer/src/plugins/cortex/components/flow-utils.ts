/**
 * flow-utils.ts -- Layout engine and data transformation for React Flow diagrams.
 * Uses dagre for automatic hierarchical layout.
 */
import * as dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type {
  CodeEntity,
  CallEdge,
  RouteInfo,
  ComponentInfo,
  PipelineInfo,
  FlowNodeData,
  FlowEdgeData,
  FlowNodeType
} from '../../../types/cortex'

// ---- Layout ----

const NODE_WIDTH = 220
const NODE_HEIGHT = 80
const MAX_NODES = 150

export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120 })

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2
      }
    }
  })

  return { nodes: layoutedNodes, edges }
}

// ---- Color mapping ----

export function getStageColor(type: FlowNodeType): {
  bg: string
  border: string
  text: string
  glow: string
} {
  const colors: Record<FlowNodeType, { bg: string; border: string; text: string; glow: string }> = {
    controller: {
      bg: 'oklch(70% 0.15 250 / 0.15)',
      border: 'oklch(70% 0.15 250 / 0.4)',
      text: 'oklch(80% 0.12 250)',
      glow: 'oklch(70% 0.15 250 / 0.25)'
    },
    service: {
      bg: 'oklch(72% 0.17 142 / 0.15)',
      border: 'oklch(72% 0.17 142 / 0.4)',
      text: 'oklch(82% 0.14 142)',
      glow: 'oklch(72% 0.17 142 / 0.25)'
    },
    repository: {
      bg: 'oklch(75% 0.15 85 / 0.15)',
      border: 'oklch(75% 0.15 85 / 0.4)',
      text: 'oklch(85% 0.12 85)',
      glow: 'oklch(75% 0.15 85 / 0.25)'
    },
    database: {
      bg: 'oklch(65% 0.2 25 / 0.15)',
      border: 'oklch(65% 0.2 25 / 0.4)',
      text: 'oklch(78% 0.16 25)',
      glow: 'oklch(65% 0.2 25 / 0.25)'
    },
    middleware: {
      bg: 'oklch(70% 0.15 300 / 0.15)',
      border: 'oklch(70% 0.15 300 / 0.4)',
      text: 'oklch(80% 0.12 300)',
      glow: 'oklch(70% 0.15 300 / 0.25)'
    },
    component: {
      bg: 'oklch(72% 0.15 195 / 0.15)',
      border: 'oklch(72% 0.15 195 / 0.4)',
      text: 'oklch(82% 0.12 195)',
      glow: 'oklch(72% 0.15 195 / 0.25)'
    },
    route: {
      bg: 'oklch(70% 0.15 250 / 0.15)',
      border: 'oklch(70% 0.15 250 / 0.4)',
      text: 'oklch(80% 0.12 250)',
      glow: 'oklch(70% 0.15 250 / 0.25)'
    },
    dag: {
      bg: 'oklch(72% 0.15 55 / 0.15)',
      border: 'oklch(72% 0.15 55 / 0.4)',
      text: 'oklch(82% 0.12 55)',
      glow: 'oklch(72% 0.15 55 / 0.25)'
    },
    task: {
      bg: 'oklch(72% 0.15 55 / 0.15)',
      border: 'oklch(72% 0.15 55 / 0.4)',
      text: 'oklch(82% 0.12 55)',
      glow: 'oklch(72% 0.15 55 / 0.25)'
    },
    model: {
      bg: 'oklch(70% 0.15 175 / 0.15)',
      border: 'oklch(70% 0.15 175 / 0.4)',
      text: 'oklch(82% 0.12 175)',
      glow: 'oklch(70% 0.15 175 / 0.25)'
    }
  }
  return colors[type] ?? colors.component
}

// ---- Icon mapping ----

const ICON_MAP: Record<string, string> = {
  controller: 'Globe',
  service: 'Cog',
  repository: 'Database',
  middleware: 'Shield',
  database: 'HardDrive',
  component: 'Component',
  route: 'Route',
  dag: 'Workflow',
  task: 'Play',
  model: 'Table'
}

function iconFor(kind: string): string {
  return ICON_MAP[kind] ?? 'Circle'
}

// ---- API Flow builder ----

export function buildAPIFlowNodes(
  entities: CodeEntity[],
  calls: CallEdge[],
  routes: RouteInfo[]
): { nodes: Node<FlowNodeData>[]; edges: Edge<FlowEdgeData>[] } {
  const nodes: Node<FlowNodeData>[] = []
  const edges: Edge<FlowEdgeData>[] = []
  const seen = new Set<string>()

  // Build adjacency for calls
  const callMap = new Map<string, string[]>()
  for (const c of calls) {
    const list = callMap.get(c.callerId) ?? []
    list.push(c.calleeId)
    callMap.set(c.callerId, list)
  }

  const entityById = new Map(entities.map((e) => [e.id, e]))

  function addNode(entity: CodeEntity): void {
    if (seen.has(entity.id)) return
    seen.add(entity.id)

    const nodeType = mapKindToFlowType(entity.kind)
    nodes.push({
      id: entity.id,
      type: 'codeEntity',
      position: { x: 0, y: 0 },
      data: {
        label: entity.name,
        type: nodeType,
        entityId: entity.id,
        filePath: entity.filePath,
        line: entity.line,
        summary: entity.summary,
        icon: iconFor(nodeType)
      }
    })
  }

  // Trace chains from each route handler
  for (const route of routes) {
    // Find handler entity
    const handler = entities.find(
      (e) =>
        e.name === route.handlerName &&
        e.filePath === route.filePath
    )
    if (!handler) continue

    // BFS from handler
    const queue = [handler.id]
    const visited = new Set<string>()

    while (queue.length > 0 && nodes.length < MAX_NODES) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const current = entityById.get(currentId)
      if (!current) continue

      addNode(current)

      const callees = callMap.get(currentId) ?? []
      for (const calleeId of callees) {
        const callee = entityById.get(calleeId)
        if (!callee) continue

        addNode(callee)
        edges.push({
          id: `e-${currentId}-${calleeId}`,
          source: currentId,
          target: calleeId,
          type: 'animated',
          animated: true,
          data: { label: 'calls', type: 'call', animated: true }
        })
        queue.push(calleeId)
      }

      // Add virtual DB node for repository entities
      if (current.kind === 'repository' && !seen.has(`db-${current.id}`)) {
        const dbId = `db-${current.id}`
        seen.add(dbId)
        nodes.push({
          id: dbId,
          type: 'codeEntity',
          position: { x: 0, y: 0 },
          data: {
            label: 'Database',
            type: 'database',
            entityId: dbId,
            filePath: current.filePath,
            line: 0,
            summary: 'Database layer',
            icon: 'HardDrive'
          }
        })
        edges.push({
          id: `e-${current.id}-${dbId}`,
          source: current.id,
          target: dbId,
          type: 'animated',
          animated: true,
          data: { label: 'query', type: 'call', animated: true }
        })
      }
    }

    if (nodes.length >= MAX_NODES) break
  }

  // If no routes matched, add all entities of relevant kinds
  if (nodes.length === 0) {
    for (const e of entities) {
      if (nodes.length >= MAX_NODES) break
      if (['controller', 'service', 'repository', 'middleware'].includes(e.kind)) {
        addNode(e)
      }
    }
    // Add call edges for added nodes
    for (const c of calls) {
      if (seen.has(c.callerId) && seen.has(c.calleeId)) {
        edges.push({
          id: `e-${c.id}`,
          source: c.callerId,
          target: c.calleeId,
          type: 'animated',
          animated: true,
          data: { label: c.type, type: c.type, animated: true }
        })
      }
    }
  }

  return { nodes, edges }
}

// ---- Component Tree builder ----

export function buildComponentTreeNodes(
  components: ComponentInfo[]
): { nodes: Node<FlowNodeData>[]; edges: Edge<FlowEdgeData>[] } {
  const nodes: Node<FlowNodeData>[] = []
  const edges: Edge<FlowEdgeData>[] = []
  const compMap = new Map(components.map((c) => [c.name, c]))

  for (const comp of components) {
    const nodeType: FlowNodeType = comp.isRoute ? 'route' : 'component'
    nodes.push({
      id: comp.name,
      type: 'codeEntity',
      position: { x: 0, y: 0 },
      data: {
        label: comp.name,
        type: nodeType,
        entityId: comp.name,
        filePath: comp.filePath,
        line: 1,
        summary: comp.props.length > 0
          ? `Props: ${comp.props.slice(0, 4).join(', ')}${comp.props.length > 4 ? '...' : ''}`
          : comp.hooks.length > 0
            ? `Hooks: ${comp.hooks.slice(0, 3).join(', ')}`
            : '',
        icon: comp.isRoute ? 'Route' : 'Component'
      }
    })
  }

  // Create edges from parent to children
  for (const comp of components) {
    for (const childName of comp.children) {
      if (compMap.has(childName)) {
        edges.push({
          id: `e-${comp.name}-${childName}`,
          source: comp.name,
          target: childName,
          type: 'animated',
          animated: true,
          data: { label: 'renders', type: 'call', animated: true }
        })
      }
    }
  }

  return { nodes, edges }
}

// ---- Pipeline builder ----

export function buildPipelineNodes(
  pipelines: PipelineInfo[]
): { nodes: Node<FlowNodeData>[]; edges: Edge<FlowEdgeData>[] } {
  const nodes: Node<FlowNodeData>[] = []
  const edges: Edge<FlowEdgeData>[] = []

  for (const pipeline of pipelines) {
    // Pipeline root node
    nodes.push({
      id: pipeline.id,
      type: 'codeEntity',
      position: { x: 0, y: 0 },
      data: {
        label: pipeline.name,
        type: 'dag',
        entityId: pipeline.id,
        filePath: pipeline.filePath,
        line: 1,
        summary: pipeline.schedule ? `Schedule: ${pipeline.schedule}` : pipeline.type,
        icon: 'Workflow'
      }
    })

    // Task nodes
    for (const task of pipeline.tasks) {
      const taskType: FlowNodeType = task.operator.toLowerCase().includes('model') ? 'model' : 'task'
      nodes.push({
        id: task.id,
        type: 'codeEntity',
        position: { x: 0, y: 0 },
        data: {
          label: task.name,
          type: taskType,
          entityId: task.id,
          filePath: task.filePath,
          line: task.line,
          summary: `Operator: ${task.operator}`,
          icon: taskType === 'model' ? 'Table' : 'Play'
        }
      })

      // Pipeline -> task edge (if no upstream deps, connect from pipeline root)
      const hasUpstream = pipeline.dependencies.some((d) => d.downstream === task.id)
      if (!hasUpstream) {
        edges.push({
          id: `e-${pipeline.id}-${task.id}`,
          source: pipeline.id,
          target: task.id,
          type: 'animated',
          animated: true,
          data: { label: 'triggers', type: 'call', animated: true }
        })
      }
    }

    // Dependency edges
    for (const dep of pipeline.dependencies) {
      edges.push({
        id: `e-${dep.upstream}-${dep.downstream}`,
        source: dep.upstream,
        target: dep.downstream,
        type: 'animated',
        animated: true,
        data: { label: 'depends', type: 'call', animated: true }
      })
    }
  }

  return { nodes, edges }
}

// ---- Mermaid export ----

/**
 * Convert React Flow node/edge arrays to Mermaid flowchart syntax.
 * Pure string transformation — safe to call from the renderer.
 */
export function flowDataToMermaid(
  nodes: { id: string; data: { label: string; kind: string } }[],
  edges: { source: string; target: string; data?: { label: string } }[],
  direction: 'TB' | 'LR' = 'TB'
): string {
  const lines = [`flowchart ${direction}`]
  for (const node of nodes) {
    // Sanitize label (remove chars that break Mermaid syntax)
    const label = node.data.label.replace(/["\[\](){}|]/g, '')
    const shape =
      node.data.kind === 'database' ||
      node.data.kind === 'repository' ||
      node.data.kind === 'db-adapter'
        ? `[(${label})]`
        : `[${label}]`
    // Sanitize node id for Mermaid (only alphanumeric + underscore)
    const nodeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_')
    lines.push(`  ${nodeId}${shape}`)
  }
  for (const edge of edges) {
    const srcId = edge.source.replace(/[^a-zA-Z0-9_]/g, '_')
    const tgtId = edge.target.replace(/[^a-zA-Z0-9_]/g, '_')
    const label = edge.data?.label ? `|${edge.data.label}|` : ''
    lines.push(`  ${srcId} -->${label} ${tgtId}`)
  }
  return lines.join('\n')
}

/**
 * Derive Mermaid diagram(s) from an AnalysisResult for use in exports.
 * Returns an object with one Mermaid block per relevant diagram type.
 */
export function analysisResultToMermaidBlocks(result: {
  entities: CodeEntity[]
  calls: CallEdge[]
  routes: RouteInfo[]
  components: ComponentInfo[]
  pipelines: PipelineInfo[]
  repoType: string
}): { title: string; mermaid: string }[] {
  const diagrams: { title: string; mermaid: string }[] = []

  if (result.routes.length > 0 || result.entities.length > 0) {
    // API / call flow
    const { nodes, edges } = buildAPIFlowNodes(result.entities, result.calls, result.routes)
    if (nodes.length > 0) {
      const mermaidNodes = nodes.map((n) => ({
        id: n.id,
        data: { label: n.data.label, kind: n.data.type }
      }))
      const mermaidEdges = edges.map((e) => ({
        source: e.source,
        target: e.target,
        data: e.data ? { label: e.data.label } : undefined
      }))
      const diagram = flowDataToMermaid(mermaidNodes, mermaidEdges, 'LR')
      diagrams.push({ title: 'Call Flow', mermaid: diagram })
    }
  }

  if (result.components.length > 0) {
    const { nodes, edges } = buildComponentTreeNodes(result.components)
    if (nodes.length > 0) {
      const mermaidNodes = nodes.map((n) => ({
        id: n.id,
        data: { label: n.data.label, kind: n.data.type }
      }))
      const mermaidEdges = edges.map((e) => ({
        source: e.source,
        target: e.target,
        data: e.data ? { label: e.data.label } : undefined
      }))
      const diagram = flowDataToMermaid(mermaidNodes, mermaidEdges, 'TB')
      diagrams.push({ title: 'Component Tree', mermaid: diagram })
    }
  }

  if (result.pipelines.length > 0) {
    const { nodes, edges } = buildPipelineNodes(result.pipelines)
    if (nodes.length > 0) {
      const mermaidNodes = nodes.map((n) => ({
        id: n.id,
        data: { label: n.data.label, kind: n.data.type }
      }))
      const mermaidEdges = edges.map((e) => ({
        source: e.source,
        target: e.target,
        data: e.data ? { label: e.data.label } : undefined
      }))
      const diagram = flowDataToMermaid(mermaidNodes, mermaidEdges, 'LR')
      diagrams.push({ title: 'Pipeline', mermaid: diagram })
    }
  }

  return diagrams
}

// ---- Helpers ----

function mapKindToFlowType(kind: CodeEntity['kind']): FlowNodeType {
  switch (kind) {
    case 'controller':
      return 'controller'
    case 'service':
      return 'service'
    case 'repository':
      return 'repository'
    case 'middleware':
      return 'middleware'
    case 'component':
      return 'component'
    case 'route':
      return 'route'
    case 'dag':
      return 'dag'
    case 'task':
      return 'task'
    default:
      return 'service'
  }
}
