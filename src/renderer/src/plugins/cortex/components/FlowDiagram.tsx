/**
 * FlowDiagram -- Reusable React Flow container component.
 * Wraps React Flow with dagre auto-layout, dark theme, controls, and minimap.
 * Caps rendering at 200 nodes to keep React Flow performant; shows a banner
 * when the input exceeds that limit.
 */
import { useMemo, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import FlowNodeComponent from './FlowNode'
import FlowEdgeComponent from './FlowEdge'
import { layoutGraph } from './flow-utils'

interface FlowDiagramProps {
  nodes: Node[]
  edges: Edge[]
  direction?: 'TB' | 'LR'
  title?: string
  onNodeClick?: (entityId: string) => void
}

// MUST be defined outside component or memoized for React Flow perf
const nodeTypes = { codeEntity: FlowNodeComponent }
const edgeTypes = { animated: FlowEdgeComponent }

const NODE_CAP = 200

export default function FlowDiagram({
  nodes: inputNodes,
  edges: inputEdges,
  direction = 'LR',
  onNodeClick
}: FlowDiagramProps): React.JSX.Element {
  const totalNodes = inputNodes.length

  // Cap nodes to NODE_CAP; only include edges whose both endpoints are retained
  const { cappedNodes, cappedEdges } = useMemo(() => {
    if (totalNodes <= NODE_CAP) {
      return { cappedNodes: inputNodes, cappedEdges: inputEdges }
    }
    const sliced = inputNodes.slice(0, NODE_CAP)
    const retainedIds = new Set(sliced.map((n) => n.id))
    return {
      cappedNodes: sliced,
      cappedEdges: inputEdges.filter((e) => retainedIds.has(e.source) && retainedIds.has(e.target))
    }
  }, [inputNodes, inputEdges, totalNodes])

  // Compute layout once when inputs change
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => layoutGraph(cappedNodes, cappedEdges, direction),
    [cappedNodes, cappedEdges, direction]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  // Sync when layouted data changes
  useEffect(() => {
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges])

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.data?.entityId as string)
    },
    [onNodeClick]
  )

  return (
    <div className="cortex-flow relative h-full w-full rounded-xl border border-white/[0.06] bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.03)_0%,transparent_70%)] pointer-events-none" />
      {totalNodes > NODE_CAP && (
        <div className="absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-300 shadow">
          Showing {NODE_CAP} of {totalNodes} nodes. Use filters to narrow the view.
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'animated', animated: true }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={2}
        onNodeClick={handleNodeClick}
      >
        <Background gap={20} size={1} color="#1e293b" variant={BackgroundVariant.Dots} />
        <Controls
          showInteractive={false}
          className="!bg-white/[0.03] !backdrop-blur-xl !border-white/[0.08] !rounded-xl [&>button]:!bg-transparent [&>button]:!border-white/[0.06] [&>button]:!text-muted-foreground"
        />
        <MiniMap
          style={{ background: 'rgba(255,255,255,0.02)' }}
          maskColor="rgba(0,0,0,0.7)"
          nodeColor="oklch(72% 0.15 195 / 0.5)"
          className="!border-white/[0.08] !rounded-xl"
        />
      </ReactFlow>
    </div>
  )
}
