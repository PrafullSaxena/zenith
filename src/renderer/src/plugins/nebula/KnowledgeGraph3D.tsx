/**
 * KnowledgeGraph3D -- 3D force-directed graph of notes using react-three-fiber.
 * Shows notes as colored spheres connected by tag-based edges.
 * Ports the MindGraph3D architecture from Cortex, adapted for Nebula's note data.
 */
import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
// @ts-expect-error -- d3-force-3d has no TS declarations
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force-3d'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../lib/useReducedMotion'
import type { GraphNode, GraphEdge } from '../../types/nebula'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// ---- Props -------------------------------------------------------------------

interface Props {
  graphData: { nodes: GraphNode[]; links: GraphEdge[] }
  onNodeClick: (nodeId: string) => void
}

// ---- Simulation types --------------------------------------------------------

interface SimNode {
  id: string
  label: string
  color: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  connections: number
}

interface SimLink {
  source: string | SimNode
  target: string | SimNode
}

// ---- Color palette (8 distinct colors cycling by node index) -----------------

const TAG_PALETTE = [
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6'  // teal
]

// ---- Build simulation data ---------------------------------------------------

function buildSimData(
  nodes: GraphNode[],
  links: GraphEdge[]
): { nodes: SimNode[]; links: SimLink[] } {
  // Count connections per node
  const connCount = new Map<string, number>()
  for (const link of links) {
    connCount.set(link.source, (connCount.get(link.source) ?? 0) + 1)
    connCount.set(link.target, (connCount.get(link.target) ?? 0) + 1)
  }

  const simNodes: SimNode[] = nodes.map((n, i) => ({
    id: n.id,
    label: n.name,
    color: TAG_PALETTE[i % TAG_PALETTE.length],
    x: (Math.random() - 0.5) * 50,
    y: (Math.random() - 0.5) * 50,
    z: (Math.random() - 0.5) * 50,
    vx: 0,
    vy: 0,
    vz: 0,
    connections: connCount.get(n.id) ?? 0
  }))

  const nodeIds = new Set(nodes.map((n) => n.id))
  const simLinks: SimLink[] = links
    .filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target))
    .map((l) => ({ source: l.source, target: l.target }))

  return { nodes: simNodes, links: simLinks }
}

// ---- Inner 3D scene (runs inside Canvas) -------------------------------------

function InnerScene({ graphData, onNodeClick }: Props): React.JSX.Element {
  const { nodes: initNodes, links: initLinks } = useMemo(
    () => buildSimData(graphData.nodes, graphData.links),
    [graphData]
  )

  const reducedMotion = usePrefersReducedMotion()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef = useRef<any>(null)
  const nodesRef = useRef(initNodes)
  const linksRef = useRef(initLinks)
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Initialize d3-force-3d simulation
  useEffect(() => {
    const sim = forceSimulation(initNodes)
      .force('charge', forceManyBody().strength(-60))
      .force('link', forceLink(initLinks).id((d: SimNode) => d.id).distance(25))
      .force('center', forceCenter())
      .alpha(1)
      .alphaDecay(0.015)

    simRef.current = sim
    nodesRef.current = initNodes
    linksRef.current = initLinks
    meshRefs.current = new Array(initNodes.length).fill(null)

    return () => {
      sim.stop()
    }
  }, [initNodes, initLinks])

  // Update mesh positions via refs (no state, no re-renders)
  useFrame(() => {
    const sim = simRef.current
    if (!sim) return
    sim.tick()

    const currentNodes = nodesRef.current
    for (let i = 0; i < currentNodes.length; i++) {
      const mesh = meshRefs.current[i]
      if (mesh) {
        mesh.position.set(
          currentNodes[i].x ?? 0,
          currentNodes[i].y ?? 0,
          currentNodes[i].z ?? 0
        )
      }
    }
  })

  // Pause auto-rotate on hover, resume after 3s idle
  const pauseAutoRotate = useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.autoRotate = false

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }

    idleTimerRef.current = setTimeout(() => {
      if (!reducedMotion && controlsRef.current) {
        controlsRef.current.autoRotate = true
      }
    }, 3000)
  }, [reducedMotion])

  // Cleanup idle timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [])

  // Get link endpoint positions from resolved sim nodes
  const getLinkPositions = useCallback(
    (link: SimLink): [THREE.Vector3Tuple, THREE.Vector3Tuple] | null => {
      const src =
        typeof link.source === 'object'
          ? (link.source as SimNode)
          : nodesRef.current.find((n) => n.id === link.source)
      const tgt =
        typeof link.target === 'object'
          ? (link.target as SimNode)
          : nodesRef.current.find((n) => n.id === link.target)
      if (!src || !tgt) return null

      const si = nodesRef.current.indexOf(src)
      const ti = nodesRef.current.indexOf(tgt)
      if (si === -1 || ti === -1) return null

      const sm = meshRefs.current[si]
      const tm = meshRefs.current[ti]
      if (!sm || !tm) return null

      return [
        [sm.position.x, sm.position.y, sm.position.z],
        [tm.position.x, tm.position.y, tm.position.z]
      ]
    },
    []
  )

  const hoveredNode = hoveredId ? nodesRef.current.find((n) => n.id === hoveredId) : null

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[100, 100, 100]} intensity={0.8} />

      {/* Edges */}
      {linksRef.current.map((link, i) => {
        const pts = getLinkPositions(link)
        if (!pts) return null
        return (
          <Line
            key={i}
            points={pts}
            color="#475569"
            lineWidth={0.5}
            opacity={0.3}
            transparent
          />
        )
      })}

      {/* Nodes */}
      {nodesRef.current.map((node, i) => {
        const isHovered = hoveredId === node.id
        const radius = Math.max(1.2 + node.connections * 0.15, 1.5)

        return (
          <mesh
            key={node.id}
            ref={(el) => {
              meshRefs.current[i] = el
            }}
            onClick={() => onNodeClick(node.id)}
            onPointerOver={() => {
              setHoveredId(node.id)
              pauseAutoRotate()
            }}
            onPointerOut={() => setHoveredId(null)}
          >
            <sphereGeometry args={[isHovered ? radius * 1.3 : radius, 16, 16]} />
            <meshStandardMaterial
              color={node.color}
              emissive={node.color}
              emissiveIntensity={isHovered ? 0.8 : 0.3}
              transparent
              opacity={0.9}
            />
            {isHovered && (
              <Html center distanceFactor={80}>
                <div className="pointer-events-none whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                  <span className="font-semibold">{node.label}</span>
                </div>
              </Html>
            )}
          </mesh>
        )
      })}

      <OrbitControls
        ref={controlsRef}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.3}
        enablePan
        enableZoom
        enableRotate
        minDistance={10}
        maxDistance={300}
        makeDefault
      />
    </>
  )
}

// ---- Exported wrapper --------------------------------------------------------

export default function KnowledgeGraph3D({ graphData, onNodeClick }: Props): React.JSX.Element {
  return (
    <div className="h-full w-full" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [60, 40, 60], fov: 55 }}
        style={{ background: 'transparent', touchAction: 'none' }}
        gl={{ antialias: true }}
      >
        <InnerScene graphData={graphData} onNodeClick={onNodeClick} />
      </Canvas>
    </div>
  )
}
