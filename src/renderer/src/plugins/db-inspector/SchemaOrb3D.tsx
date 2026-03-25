/**
 * SchemaOrb3D -- 3D floating table planes with FK connection lines.
 * Uses radial clustering by schema/namespace prefix with orbit controls.
 * Falls back gracefully via Scene3DWrapper error boundary.
 */
import { useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../lib/useReducedMotion'
import type { TableInfo, ERDiagramSession, ForeignKey, InferredRelationship } from '../../types/database'

// ── Constants ───────────────────────────────────────────────────────────

const TABLE_CAP = 30
const AUTO_ROTATE_IDLE_MS = 3000

// ── Types ───────────────────────────────────────────────────────────────

interface SchemaOrb3DProps {
  tables: TableInfo[]
  selectedTables: string[]
  session: ERDiagramSession | null
  onTableClick?: (tableName: string) => void
}

interface TableNode {
  name: string
  group: string
  position: [number, number, number]
  columnCount: number
}

interface FKEdge {
  source: string
  target: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Group tables by schema prefix (text before first underscore, or full name). */
function getGroupName(tableName: string): string {
  const idx = tableName.indexOf('_')
  return idx > 0 ? tableName.substring(0, idx) : tableName
}

/** Extract FK edges from session mermaid syntax by parsing relationship lines. */
function extractFKEdges(session: ERDiagramSession | null): FKEdge[] {
  if (!session) return []

  const edges: FKEdge[] = []
  const seen = new Set<string>()

  // Parse mermaid ER relationship lines: `"table1" }|--|| "table2" : label`
  // or: table1 }|--|| table2 : label
  const mermaid = session.mermaidSyntax || ''
  const lineRegex = /^\s*"?([^"{}|]+)"?\s+[{}|o]+--[{}|o]+\s+"?([^"{}|:]+)"?\s*:/gm
  let match: RegExpExecArray | null
  while ((match = lineRegex.exec(mermaid)) !== null) {
    const src = match[1].trim()
    const tgt = match[2].trim()
    const key = `${src}:${tgt}`
    if (!seen.has(key)) {
      seen.add(key)
      edges.push({ source: src, target: tgt })
    }
  }

  // Also extract from inferredRelationships
  const inferred: InferredRelationship[] = session.inferredRelationships || []
  for (const rel of inferred) {
    const key = `${rel.sourceTable}:${rel.targetTable}`
    if (!seen.has(key)) {
      seen.add(key)
      edges.push({ source: rel.sourceTable, target: rel.targetTable })
    }
  }

  return edges
}

/** Compute radial layout: group clusters on XZ plane, tables within each group. */
function computeLayout(
  tableNames: string[],
  tables: TableInfo[]
): { nodes: TableNode[]; groups: Map<string, string[]> } {
  const capped = tableNames.slice(0, TABLE_CAP)

  // Build a column count map from tables array
  const tableInfoMap = new Map(tables.map((t) => [t.name, t]))

  // Group by prefix
  const groups = new Map<string, string[]>()
  for (const name of capped) {
    const g = getGroupName(name)
    const arr = groups.get(g) ?? []
    arr.push(name)
    groups.set(g, arr)
  }

  const groupNames = [...groups.keys()]
  const groupCount = groupNames.length
  const groupRadius = Math.max(12, groupCount * 4)

  const nodes: TableNode[] = []

  groupNames.forEach((groupName, gi) => {
    const groupAngle = (gi / groupCount) * Math.PI * 2
    const cx = Math.cos(groupAngle) * groupRadius
    const cz = Math.sin(groupAngle) * groupRadius

    const members = groups.get(groupName) ?? []
    const innerRadius = Math.max(4, members.length * 1.8)

    members.forEach((tableName, ti) => {
      const innerAngle = (ti / members.length) * Math.PI * 2
      const x = cx + Math.cos(innerAngle) * innerRadius
      const z = cz + Math.sin(innerAngle) * innerRadius
      const y = (Math.random() - 0.5) * 4

      const info = tableInfoMap.get(tableName)
      nodes.push({
        name: tableName,
        group: groupName,
        position: [x, y, z],
        columnCount: info?.estimatedRows != null ? 0 : 0 // Column count not in TableInfo; set to 0
      })
    })
  })

  return { nodes, groups }
}

// ── Inner 3D Scene ──────────────────────────────────────────────────────

interface InnerSceneProps {
  tableNodes: TableNode[]
  edges: FKEdge[]
  reducedMotion: boolean
  onTableClick?: (tableName: string) => void
}

function InnerScene({ tableNodes, edges, reducedMotion, onTableClick }: InnerSceneProps): React.JSX.Element {
  const controlsRef = useRef<{ autoRotate: boolean }>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hoveredTable, setHoveredTable] = useState<string | null>(null)

  // Build a position lookup for edge drawing
  const positionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    for (const node of tableNodes) {
      map.set(node.name, node.position)
    }
    return map
  }, [tableNodes])

  // Pause auto-rotate on hover, resume after idle
  const handlePointerOver = useCallback(
    (tableName: string) => {
      setHoveredTable(tableName)
      if (controlsRef.current && !reducedMotion) {
        controlsRef.current.autoRotate = false
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      }
    },
    [reducedMotion]
  )

  const handlePointerOut = useCallback(() => {
    setHoveredTable(null)
    if (controlsRef.current && !reducedMotion) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = true
      }, AUTO_ROTATE_IDLE_MS)
    }
  }, [reducedMotion])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <pointLight position={[30, 30, 30]} intensity={0.7} />
      <pointLight position={[-20, 20, -20]} intensity={0.3} />

      {/* FK relationship lines */}
      {edges.map((edge, i) => {
        const srcPos = positionMap.get(edge.source)
        const tgtPos = positionMap.get(edge.target)
        if (!srcPos || !tgtPos) return null

        const isHighlighted = hoveredTable === edge.source || hoveredTable === edge.target

        return (
          <Line
            key={`edge-${i}`}
            points={[srcPos, tgtPos]}
            color="#60a5fa"
            lineWidth={1.5}
            opacity={isHighlighted ? 0.8 : 0.3}
            transparent
          />
        )
      })}

      {/* Table planes */}
      {tableNodes.map((node) => {
        const isHovered = hoveredTable === node.name
        return (
          <mesh
            key={node.name}
            position={node.position}
            onClick={() => onTableClick?.(node.name)}
            onPointerOver={() => handlePointerOver(node.name)}
            onPointerOut={handlePointerOut}
          >
            <planeGeometry args={[4, 2.5]} />
            <meshStandardMaterial
              color="#1e293b"
              emissive="#3b82f6"
              emissiveIntensity={isHovered ? 0.4 : 0.1}
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
            />
            <Html center distanceFactor={60}>
              <div className="pointer-events-none whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                <span className="font-semibold">{node.name}</span>
                {isHovered && node.columnCount > 0 && (
                  <span className="ml-1 opacity-60">-- {node.columnCount} columns</span>
                )}
              </div>
            </Html>
          </mesh>
        )
      })}

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef as React.RefObject<never>}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.3}
        enablePan
        enableZoom
        enableRotate
        minDistance={10}
        maxDistance={80}
        makeDefault
      />
    </>
  )
}

// ── Exported Component ──────────────────────────────────────────────────

export default function SchemaOrb3D({
  tables,
  selectedTables,
  session,
  onTableClick
}: SchemaOrb3DProps): React.JSX.Element {
  const reducedMotion = usePrefersReducedMotion()

  const { nodes, edges } = useMemo(() => {
    const capped = selectedTables.slice(0, TABLE_CAP)
    const { nodes: layoutNodes } = computeLayout(capped, tables)
    const fkEdges = extractFKEdges(session)
    // Filter edges to only include visible tables
    const visibleSet = new Set(layoutNodes.map((n) => n.name))
    const filteredEdges = fkEdges.filter((e) => visibleSet.has(e.source) && visibleSet.has(e.target))
    return { nodes: layoutNodes, edges: filteredEdges }
  }, [selectedTables, tables, session])

  return (
    <div className="h-full w-full" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [30, 25, 30], fov: 50 }}
        style={{ background: 'transparent', touchAction: 'none' }}
        gl={{ antialias: true }}
      >
        <InnerScene
          tableNodes={nodes}
          edges={edges}
          reducedMotion={reducedMotion}
          onTableClick={onTableClick}
        />
      </Canvas>
    </div>
  )
}
