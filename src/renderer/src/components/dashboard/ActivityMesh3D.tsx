/**
 * ActivityMesh3D — 3D activity visualization for the Dashboard hero area.
 *
 * Shows up to 50 recent activity entries as glowing spheres in a force-directed
 * cloud, colored by plugin source. Auto-rotates slowly, pauses on hover,
 * resumes after 3 seconds idle. Respects prefers-reduced-motion.
 */
import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
// @ts-expect-error — d3-force-3d has no TS declarations
import { forceSimulation, forceManyBody, forceCenter } from 'd3-force-3d'
import * as THREE from 'three'
import { useActivityStore } from '../../stores/activity-store'
import { usePrefersReducedMotion } from '../../lib/useReducedMotion'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// ── Plugin color mapping ─────────────────────────────────────────────────

const PLUGIN_COLORS: Record<string, string> = {
  cortex: '#06b6d4',
  'db-inspector': '#3b82f6',
  nebula: '#ec4899',
  launchpad: '#f59e0b',
  'code-review-bot': '#10b981',
  textcraft: '#8b5cf6'
}

const FALLBACK_COLOR = '#94a3b8'

function getPluginColor(pluginId: string): string {
  return PLUGIN_COLORS[pluginId] ?? FALLBACK_COLOR
}

function getPluginLabel(pluginId: string): string {
  const labels: Record<string, string> = {
    cortex: 'Cortex',
    'db-inspector': 'DB Inspector',
    nebula: 'Nebula',
    launchpad: 'Launchpad',
    'code-review-bot': 'Code Review',
    textcraft: 'TextCraft'
  }
  return labels[pluginId] ?? pluginId
}

// ── Simulation node type ─────────────────────────────────────────────────

interface MeshNode {
  id: string
  pluginId: string
  operation: string
  timestamp: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

// ── Inner 3D scene (runs inside Canvas) ──────────────────────────────────

interface InnerSceneProps {
  nodes: MeshNode[]
  reducedMotion: boolean
}

function InnerScene({ nodes, reducedMotion }: InnerSceneProps): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef = useRef<any>(null)
  const nodesRef = useRef(nodes)
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Initialize d3-force-3d simulation
  useEffect(() => {
    const sim = forceSimulation(nodes)
      .force('charge', forceManyBody().strength(-30))
      .force('center', forceCenter())
      .alphaDecay(0.02)

    simRef.current = sim
    nodesRef.current = nodes
    meshRefs.current = new Array(nodes.length).fill(null)

    return () => {
      sim.stop()
    }
  }, [nodes])

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

  // Compute radius based on recency (newer = larger)
  const now = Date.now()
  const radiusForNode = useCallback(
    (timestamp: string) => {
      const age = now - new Date(timestamp).getTime()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      const normalized = Math.min(age / maxAge, 1)
      // Newer entries (low normalized) get larger radius
      return 0.8 + (1 - normalized) * 1.2
    },
    [now]
  )

  const hoveredNode = hoveredId ? nodesRef.current.find((n) => n.id === hoveredId) : null

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[80, 80, 80]} intensity={0.6} />

      {nodesRef.current.map((node, i) => {
        const color = getPluginColor(node.pluginId)
        const isHovered = hoveredId === node.id
        const radius = radiusForNode(node.timestamp)

        return (
          <mesh
            key={node.id}
            ref={(el) => {
              meshRefs.current[i] = el
            }}
            onPointerOver={() => {
              setHoveredId(node.id)
              pauseAutoRotate()
            }}
            onPointerOut={() => setHoveredId(null)}
          >
            <sphereGeometry args={[radius, 12, 12]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isHovered ? 0.7 : 0.2}
              transparent
              opacity={0.85}
            />
            {isHovered && (
              <Html center distanceFactor={50}>
                <div className="pointer-events-none whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                  <span className="font-semibold">{getPluginLabel(node.pluginId)}</span>
                  <span className="ml-1.5 opacity-70">{node.operation}</span>
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
        enablePan={false}
        enableZoom
        enableRotate
        minDistance={8}
        maxDistance={40}
        makeDefault
      />
    </>
  )
}

// ── Exported wrapper ─────────────────────────────────────────────────────

export default function ActivityMesh3D(): React.JSX.Element {
  const getRecentEntries = useActivityStore((s) => s.getRecentEntries)
  const reducedMotion = usePrefersReducedMotion()

  const nodes = useMemo<MeshNode[]>(() => {
    const entries = getRecentEntries(50)
    return entries.map((entry) => ({
      id: entry.id,
      pluginId: entry.pluginId,
      operation: entry.operation,
      timestamp: entry.timestamp,
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 30,
      z: (Math.random() - 0.5) * 30,
      vx: 0,
      vy: 0,
      vz: 0
    }))
  }, [getRecentEntries])

  if (nodes.length === 0) return <></>

  return (
    <div className="h-full w-full" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 25], fov: 50 }}
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        <InnerScene nodes={nodes} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  )
}
