/**
 * FlowDiagram -- Reusable React Flow container component.
 * Wraps React Flow with dagre auto-layout, dark theme, controls, and minimap.
 */
import { useMemo, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './flow-styles.css'
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

export default function FlowDiagram({
  nodes: inputNodes,
  edges: inputEdges,
  direction = 'LR',
  onNodeClick
}: FlowDiagramProps): React.JSX.Element {
  // Compute layout once when inputs change
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => layoutGraph(inputNodes, inputEdges, direction),
    [inputNodes, inputEdges, direction]
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
    <div className="cortex-flow h-full w-full rounded-xl border border-border bg-background">
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
        <Background color="oklch(20% 0 0 / 0.5)" gap={20} size={1} />
        <Controls />
        <MiniMap
          style={{ background: 'var(--color-surface)' }}
          maskColor="oklch(10% 0 0 / 0.7)"
          nodeColor="oklch(72% 0.15 195 / 0.5)"
        />
      </ReactFlow>
    </div>
  )
}
