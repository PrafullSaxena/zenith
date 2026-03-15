/**
 * MindGraphTab — Obsidian-style force-directed graph showing all entities
 * and their call-graph connections. Supports search with connected-node
 * highlighting, clickable nodes that open in code section.
 */
import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import { Search, X, Share2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import type { CodeEntity, CallEdge } from '../../../types/cortex'

// ── Color palette by entity kind ────────────────────────────────────────

const KIND_COLORS: Record<string, string> = {
  controller: '#10b981',
  service: '#8b5cf6',
  repository: '#f59e0b',
  class: '#3b82f6',
  method: '#6b7280',
  component: '#ec4899',
  middleware: '#ef4444',
  function: '#64748b',
  route: '#10b981',
  configuration: '#06b6d4',
  decorator: '#6b7280',
  dag: '#f59e0b',
  task: '#8b5cf6'
}

const DEFAULT_COLOR = '#64748b'

interface GraphNode {
  id: string
  name: string
  kind: string
  filePath: string
  line: number
  summary: string
  val: number // node size
  color: string
  x?: number
  y?: number
}

interface GraphLink {
  source: string
  target: string
  type: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

// ── Build graph data from analysis result ───────────────────────────────

function buildGraphData(
  entities: CodeEntity[],
  calls: CallEdge[],
  showMethods: boolean
): GraphData {
  const filtered = showMethods
    ? entities
    : entities.filter((e) => e.kind !== 'method')
  const entityIds = new Set(filtered.map((e) => e.id))

  const nodes: GraphNode[] = filtered.map((e) => ({
    id: e.id,
    name: e.name,
    kind: e.kind,
    filePath: e.filePath,
    line: e.line,
    summary: e.summary ?? '',
    val: getNodeSize(e.kind),
    color: KIND_COLORS[e.kind] ?? DEFAULT_COLOR
  }))

  // When methods are hidden, lift method edges to parent entities
  const links: GraphLink[] = []
  const seenLinks = new Set<string>()

  if (showMethods) {
    for (const c of calls) {
      if (entityIds.has(c.callerId) && entityIds.has(c.calleeId)) {
        links.push({ source: c.callerId, target: c.calleeId, type: c.type })
      }
    }
  } else {
    const entityById = new Map(entities.map((e) => [e.id, e]))
    for (const c of calls) {
      let sourceId = c.callerId
      let targetId = c.calleeId
      const caller = entityById.get(sourceId)
      if (caller && caller.kind === 'method' && caller.parentId) sourceId = caller.parentId
      const callee = entityById.get(targetId)
      if (callee && callee.kind === 'method' && callee.parentId) targetId = callee.parentId
      if (sourceId === targetId) continue
      if (!entityIds.has(sourceId) || !entityIds.has(targetId)) continue
      const key = `${sourceId}->${targetId}`
      if (seenLinks.has(key)) continue
      seenLinks.add(key)
      links.push({ source: sourceId, target: targetId, type: c.type })
    }
  }

  return { nodes, links }
}

function getNodeSize(kind: string): number {
  switch (kind) {
    case 'controller':
      return 8
    case 'service':
      return 6
    case 'repository':
      return 5
    case 'class':
      return 4
    case 'method':
      return 2
    default:
      return 3
  }
}

// ── Highlight connected nodes from search ───────────────────────────────

function getConnectedNodeIds(
  nodeId: string,
  links: GraphLink[],
  allNodeIds: Set<string>
): Set<string> {
  const connected = new Set<string>()
  const visited = new Set<string>()
  const queue = [nodeId]

  // Build adjacency (both directions for highlighting)
  const adj = new Map<string, string[]>()
  for (const link of links) {
    const src = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source
    const tgt = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target
    if (!adj.has(src)) adj.set(src, [])
    if (!adj.has(tgt)) adj.set(tgt, [])
    adj.get(src)!.push(tgt)
    adj.get(tgt)!.push(src)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    if (allNodeIds.has(current)) connected.add(current)

    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) queue.push(neighbor)
    }
  }

  return connected
}

// ── Component ───────────────────────────────────────────────────────────

export default function MindGraphTab(): React.JSX.Element {
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const navigateToFile = useCortexStore((s) => s.navigateToFile)

  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMethods, setShowMethods] = useState(false)
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Observe container size
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const graphData = useMemo<GraphData>(() => {
    if (!analysisResult) return { nodes: [], links: [] }
    return buildGraphData(analysisResult.entities, analysisResult.calls, showMethods)
  }, [analysisResult, showMethods])

  // Search across ALL entities (including methods even if hidden) for suggestions
  const allNodes = useMemo<GraphNode[]>(() => {
    if (!analysisResult) return []
    return analysisResult.entities.map((e) => ({
      id: e.id,
      name: e.name,
      kind: e.kind,
      filePath: e.filePath,
      line: e.line,
      summary: e.summary ?? '',
      val: getNodeSize(e.kind),
      color: KIND_COLORS[e.kind] ?? DEFAULT_COLOR
    }))
  }, [analysisResult])

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allNodes.filter(
      (n) => n.name.toLowerCase().includes(q) || n.kind.toLowerCase().includes(q)
    )
  }, [search, allNodes])

  const handleSearchSelect = useCallback(
    (node: GraphNode) => {
      // Auto-enable methods if a method entity is selected
      if (node.kind === 'method' && !showMethods) {
        setShowMethods(true)
      }

      // Use a timeout to let graphData update if showMethods changed
      setTimeout(() => {
        const currentData = showMethods || node.kind === 'method'
          ? buildGraphData(analysisResult?.entities ?? [], analysisResult?.calls ?? [], true)
          : graphData
        const allNodeIds = new Set(currentData.nodes.map((n) => n.id))
        const connected = getConnectedNodeIds(node.id, currentData.links, allNodeIds)
        setHighlightedNodes(connected)
      }, 0)

      setSearch(node.name)
      setShowDropdown(false)

      // Center on selected node
      if (graphRef.current && node.x !== undefined && node.y !== undefined) {
        graphRef.current.centerAt(node.x, node.y, 500)
        graphRef.current.zoom(3, 500)
      }
    },
    [graphData, showMethods, analysisResult]
  )

  const clearSearch = useCallback(() => {
    setSearch('')
    setShowDropdown(false)
    setHighlightedNodes(new Set())
  }, [])

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      navigateToFile(node.filePath, node.line)
    },
    [navigateToFile]
  )

  const handleZoomIn = useCallback(() => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom * 1.5, 300)
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom / 1.5, 300)
    }
  }, [])

  const handleFitView = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 40)
    }
  }, [])

  // Custom node rendering
  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isHighlighted = highlightedNodes.size === 0 || highlightedNodes.has(node.id)
      const isHovered = hoveredNode?.id === node.id
      const radius = Math.max(node.val * (isHovered ? 1.4 : 1), 2)
      const alpha = isHighlighted ? 1 : 0.15

      const x = node.x ?? 0
      const y = node.y ?? 0

      // Glow for highlighted nodes
      if (isHighlighted && highlightedNodes.size > 0) {
        ctx.beginPath()
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI)
        ctx.fillStyle = node.color + '40'
        ctx.fill()
      }

      // Node circle
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = node.color + (alpha < 1 ? '30' : 'cc')
      ctx.fill()
      ctx.strokeStyle = node.color + (alpha < 1 ? '20' : '88')
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Label (only when zoomed in or hovered)
      if (globalScale > 1.5 || isHovered) {
        const label = node.name
        const fontSize = Math.max(10 / globalScale, 2)
        ctx.font = `${isHovered ? 'bold ' : ''}${fontSize}px -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = isHighlighted ? '#e2e8f0' : '#e2e8f044'
        ctx.fillText(label, x, y + radius + 2)
      }
    },
    [highlightedNodes, hoveredNode]
  )

  const linkColor = useCallback(
    (link: GraphLink) => {
      if (highlightedNodes.size === 0) return '#47556930'
      const src = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source
      const tgt = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target
      if (highlightedNodes.has(src) && highlightedNodes.has(tgt)) return '#475569aa'
      return '#47556910'
    },
    [highlightedNodes]
  )

  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        <div className="text-center">
          <Share2 size={32} className="mx-auto mb-2 opacity-30" />
          <p>Analyze a repository to see the entity graph</p>
        </div>
      </div>
    )
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        <div className="text-center">
          <Share2 size={32} className="mx-auto mb-2 opacity-30" />
          <p>No entities detected for graph visualization</p>
        </div>
      </div>
    )
  }

  // Build kind legend
  const kindsInGraph = [...new Set(graphData.nodes.map((n) => n.kind))]

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setShowDropdown(true)
              if (!e.target.value) setHighlightedNodes(new Set())
            }}
            placeholder="Search entities..."
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-7 text-[11px] text-text-primary placeholder:text-text-secondary/50 focus:border-accent/50 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              <X size={12} />
            </button>
          )}

          {/* Search dropdown */}
          {search && searchResults.length > 0 && showDropdown && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
              {searchResults.slice(0, 15).map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => handleSearchSelect(node)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-surface-elevated"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: node.color }}
                  />
                  <span className="text-text-primary">{node.name}</span>
                  <span className="text-text-secondary/60">{node.kind}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle methods */}
        <label className="flex items-center gap-1.5 text-[10px] text-text-secondary">
          <input
            type="checkbox"
            checked={showMethods}
            onChange={(e) => setShowMethods(e.target.checked)}
            className="h-3 w-3 rounded border-border"
          />
          Methods
        </label>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleZoomIn}
            className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={handleFitView}
            className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            title="Fit to view"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Node count */}
        <span className="text-[10px] text-text-secondary">
          {graphData.nodes.length} nodes / {graphData.links.length} edges
        </span>
      </div>

      {/* Graph canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-background">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node: GraphNode, color, ctx) => {
            const r = Math.max(node.val * 1.5, 4)
            ctx.beginPath()
            ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI)
            ctx.fillStyle = color
            ctx.fill()
          }}
          linkColor={linkColor}
          linkWidth={0.5}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          onNodeHover={(node: GraphNode | null) => setHoveredNode(node)}
          cooldownTicks={100}
          backgroundColor="transparent"
          enableNodeDrag={true}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />

        {/* Kind legend */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-lg bg-surface/80 px-3 py-2 backdrop-blur-sm">
          {kindsInGraph.map((kind) => (
            <span key={kind} className="flex items-center gap-1 text-[9px] text-text-secondary">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: KIND_COLORS[kind] ?? DEFAULT_COLOR }}
              />
              {kind}
            </span>
          ))}
        </div>

        {/* Hovered node tooltip */}
        {hoveredNode && (
          <div className="absolute right-3 top-3 max-w-xs rounded-lg border border-border bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: hoveredNode.color }}
              />
              <span className="text-xs font-semibold text-text-primary">{hoveredNode.name}</span>
              <span className="text-[10px] text-text-secondary">({hoveredNode.kind})</span>
            </div>
            <p className="mt-1 text-[10px] text-text-secondary">{hoveredNode.filePath}:{hoveredNode.line}</p>
            {hoveredNode.summary && (
              <p className="mt-1 text-[10px] text-text-secondary/80">{hoveredNode.summary}</p>
            )}
            <p className="mt-1 text-[9px] text-accent">Click to open in code viewer</p>
          </div>
        )}
      </div>
    </div>
  )
}
