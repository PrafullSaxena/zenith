/**
 * MindGraph3D — 3D force-directed graph using react-three-fiber.
 * Shows entities as glowing spheres connected by animated edges.
 */
import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
// @ts-expect-error — d3-force-3d has no TS declarations
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force-3d'
import * as THREE from 'three'
import { getKindColor } from '../cortex-theme'
import type { CodeEntity, CallEdge } from '../../../../types/cortex'

interface Props {
  entities: CodeEntity[]
  calls: CallEdge[]
  onNodeClick?: (entityId: string) => void
}

interface SimNode {
  id: string
  name: string
  kind: string
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
  type: string
}

const NODE_CAP = 200

function buildSimData(entities: CodeEntity[], calls: CallEdge[]): { nodes: SimNode[]; links: SimLink[] } {
  // Count connections per entity
  const connCount = new Map<string, number>()
  for (const c of calls) {
    connCount.set(c.callerId, (connCount.get(c.callerId) ?? 0) + 1)
    connCount.set(c.calleeId, (connCount.get(c.calleeId) ?? 0) + 1)
  }

  // Filter to non-method entities, sort by connections, take top NODE_CAP
  const filtered = entities
    .filter((e) => e.kind !== 'method' && e.kind !== 'decorator')
    .sort((a, b) => (connCount.get(b.id) ?? 0) - (connCount.get(a.id) ?? 0))
    .slice(0, NODE_CAP)

  const nodeIds = new Set(filtered.map((e) => e.id))
  const nodes: SimNode[] = filtered.map((e) => ({
    id: e.id,
    name: e.name,
    kind: e.kind,
    x: (Math.random() - 0.5) * 50,
    y: (Math.random() - 0.5) * 50,
    z: (Math.random() - 0.5) * 50,
    vx: 0,
    vy: 0,
    vz: 0,
    connections: connCount.get(e.id) ?? 0
  }))

  // Lift method edges to parents
  const entityById = new Map(entities.map((e) => [e.id, e]))
  const links: SimLink[] = []
  const seen = new Set<string>()

  for (const c of calls) {
    let src = c.callerId
    let tgt = c.calleeId
    const caller = entityById.get(src)
    if (caller?.kind === 'method' && caller.parentId) src = caller.parentId
    const callee = entityById.get(tgt)
    if (callee?.kind === 'method' && callee.parentId) tgt = callee.parentId
    if (src === tgt || !nodeIds.has(src) || !nodeIds.has(tgt)) continue
    const key = `${src}->${tgt}`
    if (seen.has(key)) continue
    seen.add(key)
    links.push({ source: src, target: tgt, type: c.type })
  }

  return { nodes, links }
}

// ── Inner 3D Scene (runs inside Canvas) ──

function ForceGraph3DScene({ entities, calls, onNodeClick }: Props): React.JSX.Element {
  const { nodes: initNodes, links: initLinks } = useMemo(() => buildSimData(entities, calls), [entities, calls])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef = useRef<any>(null)
  const nodesRef = useRef(initNodes)
  const linksRef = useRef(initLinks)
  const [positions, setPositions] = useState<Float32Array>(new Float32Array(initNodes.length * 3))
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const { camera } = useThree()
  const targetPos = useRef<THREE.Vector3 | null>(null)

  // Initialize simulation
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

    return () => { sim.stop() }
  }, [initNodes, initLinks])

  // Tick simulation in animation frame
  useFrame(() => {
    const sim = simRef.current
    if (!sim) return
    sim.tick()

    const nodes = nodesRef.current
    const arr = new Float32Array(nodes.length * 3)
    for (let i = 0; i < nodes.length; i++) {
      arr[i * 3] = nodes[i].x ?? 0
      arr[i * 3 + 1] = nodes[i].y ?? 0
      arr[i * 3 + 2] = nodes[i].z ?? 0
    }
    setPositions(arr)

    // Smooth camera lerp to focused node
    if (targetPos.current) {
      camera.position.lerp(
        new THREE.Vector3(
          targetPos.current.x + 60,
          targetPos.current.y + 30,
          targetPos.current.z + 60
        ),
        0.03
      )
      camera.lookAt(targetPos.current)
    }
  })

  const handleNodeClick = useCallback((idx: number) => {
    const node = nodesRef.current[idx]
    if (!node) return
    targetPos.current = new THREE.Vector3(node.x, node.y, node.z)
    onNodeClick?.(node.id)
  }, [onNodeClick])

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[100, 100, 100]} intensity={0.8} />

      {/* Edges */}
      {linksRef.current.map((link, i) => {
        const src = typeof link.source === 'object' ? link.source as SimNode : nodesRef.current.find(n => n.id === link.source)
        const tgt = typeof link.target === 'object' ? link.target as SimNode : nodesRef.current.find(n => n.id === link.target)
        if (!src || !tgt) return null
        const si = nodesRef.current.indexOf(src)
        const ti = nodesRef.current.indexOf(tgt)
        if (si === -1 || ti === -1) return null

        return (
          <Line
            key={i}
            points={[
              [positions[si * 3] ?? 0, positions[si * 3 + 1] ?? 0, positions[si * 3 + 2] ?? 0],
              [positions[ti * 3] ?? 0, positions[ti * 3 + 1] ?? 0, positions[ti * 3 + 2] ?? 0]
            ]}
            color="#475569"
            lineWidth={0.5}
            opacity={0.3}
            transparent
          />
        )
      })}

      {/* Nodes */}
      {nodesRef.current.map((node, i) => {
        const colors = getKindColor(node.kind)
        const isHovered = hoveredId === node.id
        const radius = Math.max(1.2 + node.connections * 0.2, 1.5)

        return (
          <mesh
            key={node.id}
            position={[positions[i * 3] ?? 0, positions[i * 3 + 1] ?? 0, positions[i * 3 + 2] ?? 0]}
            onClick={() => handleNodeClick(i)}
            onPointerOver={() => setHoveredId(node.id)}
            onPointerOut={() => setHoveredId(null)}
          >
            <sphereGeometry args={[isHovered ? radius * 1.3 : radius, 16, 16]} />
            <meshStandardMaterial
              color={colors.text}
              emissive={colors.text}
              emissiveIntensity={isHovered ? 0.8 : 0.3}
              transparent
              opacity={0.9}
            />
            {isHovered && (
              <Html center distanceFactor={80}>
                <div className="whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                  <span className="font-semibold">{node.name}</span>
                  <span className="ml-1 opacity-60">({node.kind})</span>
                </div>
              </Html>
            )}
          </mesh>
        )
      })}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate
        autoRotateSpeed={0.3}
        zoomSpeed={1.2}
        minDistance={10}
        maxDistance={300}
        makeDefault
      />
    </>
  )
}

// ── Exported wrapper ──

export default function MindGraph3D({ entities, calls, onNodeClick }: Props): React.JSX.Element {
  return (
    <div className="h-full w-full" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [60, 40, 60], fov: 55 }}
        style={{ background: 'transparent', touchAction: 'none' }}
        gl={{ antialias: true }}
      >
        <ForceGraph3DScene entities={entities} calls={calls} onNodeClick={onNodeClick} />
      </Canvas>
    </div>
  )
}
