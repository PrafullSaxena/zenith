/**
 * KnowledgeGraph -- Force-directed graph visualization of note connections.
 *
 * Uses react-force-graph-2d to render notes as nodes connected by
 * AI-inferred topic relationships. Interactive: zoom, pan, drag nodes,
 * click a node to navigate to that note.
 *
 * Graph data comes from the nebula-store (loadGraphData action).
 * Nodes = notes, links = edges inferred from shared topics.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { RefreshCw, Share2 } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import type { GraphNode } from '../../types/nebula'

// ── Color tokens (oklch dark-only, matching app theme) ───────────────

const NODE_COLOR_ACTIVE = 'oklch(0.85 0.18 195)'
const NODE_COLOR_DEFAULT = 'oklch(0.65 0.1 195)'
const LINK_COLOR = 'oklch(0.45 0.05 195)'
const TEXT_COLOR = 'oklch(0.9 0 0)'

// ── Component ────────────────────────────────────────────────────────

export default function KnowledgeGraph(): React.JSX.Element {
  const graphData = useNebulaStore((s) => s.graphData)
  const loadGraphData = useNebulaStore((s) => s.loadGraphData)
  const selectNote = useNebulaStore((s) => s.selectNote)
  const setActiveTab = useNebulaStore((s) => s.setActiveTab)
  const selectedGraphNodeId = useNebulaStore((s) => s.selectedGraphNodeId)
  const setSelectedGraphNode = useNebulaStore((s) => s.setSelectedGraphNode)

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Load graph data on mount
  useEffect(() => {
    loadGraphData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setDimensions({ width, height })
        }
      }
    })

    observer.observe(container)

    // Set initial dimensions
    const rect = container.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: rect.width, height: rect.height })
    }

    return () => observer.disconnect()
  }, [])

  // Node color callback
  const nodeColor = useCallback(
    (node: { id?: string | number }) => {
      return node.id === selectedGraphNodeId ? NODE_COLOR_ACTIVE : NODE_COLOR_DEFAULT
    },
    [selectedGraphNodeId]
  )

  // Link color callback
  const linkColor = useCallback(() => LINK_COLOR, [])

  // Link width based on edge weight
  const linkWidth = useCallback((link: { weight?: number }) => {
    return 0.5 + (link.weight ?? 1) * 0.5
  }, [])

  // Node click: navigate to that note
  const handleNodeClick = useCallback(
    (node: { id?: string | number }) => {
      if (node.id && typeof node.id === 'string') {
        setSelectedGraphNode(node.id)
        selectNote(node.id)
        setActiveTab('notes')
      }
    },
    [selectNote, setActiveTab, setSelectedGraphNode]
  )

  // Custom node canvas rendering: circle + truncated title text
  const nodeCanvasObject = useCallback(
    (
      node: { id?: string | number; name?: string; x?: number; y?: number; val?: number },
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      const radius = Math.sqrt(Math.max(node.val ?? 2, 2)) * 2
      const isSelected = node.id === selectedGraphNodeId
      const color = isSelected ? NODE_COLOR_ACTIVE : NODE_COLOR_DEFAULT

      // Draw node circle
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()

      // Draw title text below node (only when zoomed in enough)
      if (globalScale > 0.6) {
        const label = node.name || ''
        const truncated = label.length > 15 ? label.substring(0, 15) + '...' : label
        const fontSize = Math.max(8 / globalScale, 3)

        ctx.font = `${fontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = TEXT_COLOR
        ctx.fillText(truncated, x, y + radius + 2)
      }
    },
    [selectedGraphNodeId]
  )

  // Prepare graph data with safe defaults
  const safeGraphData = graphData ?? { nodes: [], links: [] }
  const nodeCount = safeGraphData.nodes.length
  const linkCount = safeGraphData.links.length

  // Empty state
  if (nodeCount === 0) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Share2 size={15} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Knowledge Graph</h2>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-1 items-center justify-center text-text-secondary">
          <div className="text-center">
            <Share2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No notes summarized yet</p>
            <p className="mt-1 text-xs text-text-secondary/70">
              Create and save notes to build your knowledge graph.
            </p>
            <p className="mt-1 text-xs text-text-secondary/70">
              AI will extract topics and reveal connections between your ideas.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Share2 size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">Knowledge Graph</h2>
          <span className="text-xs text-text-secondary">
            {nodeCount} {nodeCount === 1 ? 'note' : 'notes'} &middot; {linkCount}{' '}
            {linkCount === 1 ? 'connection' : 'connections'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => loadGraphData()}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          title="Refresh graph data"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Graph container */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <ForceGraph2D
          graphData={safeGraphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel="name"
          nodeColor={nodeColor as (node: object) => string}
          nodeVal={(node: object) => Math.max((node as GraphNode).val ?? 2, 2)}
          nodeCanvasObject={nodeCanvasObject as (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => void}
          nodeCanvasObjectMode={() => 'replace' as const}
          linkColor={linkColor as (link: object) => string}
          linkWidth={linkWidth as (link: object) => number}
          linkDirectionalArrowLength={0}
          onNodeClick={handleNodeClick as (node: object, event: MouseEvent) => void}
          backgroundColor="transparent"
          enableZoomInteraction={true}
          enablePanInteraction={true}
          enableNodeDrag={true}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      </div>
    </div>
  )
}
