/**
 * CostTreemap3D -- 3D extruded block treemap showing service costs.
 *
 * Arranges services in a grid layout with block heights proportional to
 * monthly cost. Hover lifts a block and shows a tooltip with service name
 * and cost. Isometric camera with auto-rotate (respects reduced-motion).
 */
import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../lib/useReducedMotion'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// ---- Props -------------------------------------------------------------------

interface ServiceItem {
  serviceId: string
  serviceName: string
  monthly: number
  category?: string
}

interface Props {
  services: ServiceItem[]
  onServiceClick?: (serviceId: string) => void
}

// ---- Category color mapping --------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  compute: '#3b82f6',
  storage: '#10b981',
  network: '#8b5cf6',
  database: '#f59e0b',
  other: '#94a3b8'
}

function getCategoryColor(category?: string): string {
  if (!category) return CATEGORY_COLORS.other
  const lower = category.toLowerCase()
  return CATEGORY_COLORS[lower] ?? CATEGORY_COLORS.other
}

// ---- Block layout constants --------------------------------------------------

const BLOCK_SIZE = 2
const BLOCK_GAP = 0.4
const MIN_HEIGHT = 0.5
const MAX_HEIGHT = 5.0
const HOVER_LIFT = 0.5
const MAX_BLOCKS = 20

// ---- Computed block data -----------------------------------------------------

interface BlockData {
  serviceId: string
  serviceName: string
  monthly: number
  color: string
  height: number
  x: number
  z: number
}

function computeBlocks(services: ServiceItem[]): BlockData[] {
  const sorted = [...services]
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, MAX_BLOCKS)

  if (sorted.length === 0) return []

  const maxCost = Math.max(...sorted.map((s) => s.monthly), 0.01)
  const cols = Math.ceil(Math.sqrt(sorted.length))
  const spacing = BLOCK_SIZE + BLOCK_GAP

  // Center the grid
  const totalWidth = cols * spacing - BLOCK_GAP
  const rows = Math.ceil(sorted.length / cols)
  const totalDepth = rows * spacing - BLOCK_GAP
  const offsetX = -totalWidth / 2 + BLOCK_SIZE / 2
  const offsetZ = -totalDepth / 2 + BLOCK_SIZE / 2

  return sorted.map((service, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const normalizedHeight =
      MIN_HEIGHT + ((service.monthly / maxCost) * (MAX_HEIGHT - MIN_HEIGHT))

    return {
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      monthly: service.monthly,
      color: getCategoryColor(service.category),
      height: normalizedHeight,
      x: offsetX + col * spacing,
      z: offsetZ + row * spacing
    }
  })
}

// ---- Inner 3D scene (runs inside Canvas) -------------------------------------

interface InnerSceneProps {
  blocks: BlockData[]
  onServiceClick?: (serviceId: string) => void
  reducedMotion: boolean
}

function InnerScene({
  blocks,
  onServiceClick,
  reducedMotion
}: InnerSceneProps): React.JSX.Element {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])

  // Initialize mesh refs array
  useEffect(() => {
    meshRefs.current = new Array(blocks.length).fill(null)
  }, [blocks.length])

  // Animate hover lift via useFrame
  useFrame(() => {
    if (reducedMotion) return
    for (let i = 0; i < blocks.length; i++) {
      const mesh = meshRefs.current[i]
      if (!mesh) continue
      const block = blocks[i]
      const baseY = block.height / 2
      const targetY = hoveredId === block.serviceId ? baseY + HOVER_LIFT : baseY
      // Lerp toward target
      mesh.position.y += (targetY - mesh.position.y) * 0.15
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

  const hoveredBlock = hoveredId ? blocks.find((b) => b.serviceId === hoveredId) : null

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[15, 20, 15]} intensity={0.7} />
      <pointLight position={[-10, 15, -10]} intensity={0.3} />

      {/* Ground plane for depth reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.08} />
      </mesh>

      {/* Blocks */}
      {blocks.map((block, i) => {
        const isHovered = hoveredId === block.serviceId

        return (
          <mesh
            key={block.serviceId}
            ref={(el) => {
              meshRefs.current[i] = el
            }}
            position={[block.x, block.height / 2, block.z]}
            onClick={() => onServiceClick?.(block.serviceId)}
            onPointerOver={() => {
              setHoveredId(block.serviceId)
              pauseAutoRotate()
            }}
            onPointerOut={() => setHoveredId(null)}
          >
            <boxGeometry args={[1.8, block.height, 1.8]} />
            <meshStandardMaterial
              color={block.color}
              emissive={block.color}
              emissiveIntensity={isHovered ? 0.5 : 0.1}
              transparent
              opacity={0.9}
            />
            {isHovered && (
              <Html center distanceFactor={30}>
                <div className="pointer-events-none whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                  <span className="font-semibold">{block.serviceName}</span>
                  <span className="ml-1.5 opacity-70">
                    ${block.monthly.toFixed(2)}/mo
                  </span>
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
        minDistance={5}
        maxDistance={50}
        makeDefault
      />
    </>
  )
}

// ---- Exported wrapper --------------------------------------------------------

export default function CostTreemap3D({
  services,
  onServiceClick
}: Props): React.JSX.Element {
  const reducedMotion = usePrefersReducedMotion()

  const blocks = useMemo(() => computeBlocks(services), [services])

  if (blocks.length === 0) return <></>

  return (
    <div className="h-full w-full" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [10, 10, 10], fov: 45 }}
        style={{ background: 'transparent', touchAction: 'none' }}
        gl={{ antialias: true }}
      >
        <InnerScene
          blocks={blocks}
          onServiceClick={onServiceClick}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  )
}
