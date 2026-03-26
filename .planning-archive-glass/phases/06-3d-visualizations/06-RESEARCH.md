# Phase 6: 3D Visualizations - Research

**Researched:** 2026-03-25
**Domain:** WebGL / react-three-fiber 3D scene rendering in Electron
**Confidence:** HIGH

## Summary

This phase adds four 3D visualization scenes to existing plugin views: Dashboard Activity Mesh, Nebula 3D Knowledge Graph, Launchpad Cost Treemap, and DbInspector Schema Orb. The project already has a mature reference implementation in `MindGraph3D.tsx` (Cortex plugin) that demonstrates the exact pattern — lazy Canvas, d3-force-3d simulation, OrbitControls, Html tooltips, and error boundary with 2D fallback. All required libraries are already installed: `@react-three/fiber@^9.5.0`, `@react-three/drei@^10.7.7`, `three@^0.183.2`, and `d3-force-3d@^3.0.6`.

The primary technical challenge is not learning the stack (it is proven in this codebase) but rather creating four distinct scene geometries while reusing the shared infrastructure patterns (error boundary, reduced motion, WebGL cleanup). The Cortex MindGraphTab provides the exact ErrorBoundary + Suspense + lazy + 2D fallback + 3D/2D toggle blueprint to replicate.

**Primary recommendation:** Extract a shared `Scene3DWrapper` component encapsulating ErrorBoundary + Suspense + lazy loading + 2D fallback, then build each scene as an independent inner component following the MindGraph3D pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Dashboard Activity Mesh**: Plugin accent colors per node, right side of hero ~250x250px, last 50 activity events, max 50 nodes, pulse on new activity
- **Nebula 3D Knowledge Graph**: Port MindGraph3D architecture from Cortex, notes colored by tag/category, tag/backlink edges, 2D/3D toggle, click opens note
- **Launchpad Cost Treemap**: 3D extruded blocks, height = monthly cost, service category colors, hover lift + tooltip, click drills to detail, max 20 blocks, isometric 45-degree camera
- **DbInspector Schema Orb**: Tables as floating labeled planes, FK glowing connections, group by schema/namespace, click shows columns, max 30 tables, toggle alongside mermaid view
- **Shared 3D patterns**: Auto-rotate ~0.3 rad/s pauses on hover resumes after 3s, glass Html tooltips, scroll-wheel zoom only, standard orbit controls
- **2D Fallback**: ErrorBoundary catches WebGL failures, automatic, all scenes wrapped in ErrorBoundary + Suspense + lazy
- **Reduced Motion**: usePrefersReducedMotion hook disables auto-rotate and particle/pulse animations, manual orbit still works

### Claude's Discretion
- Exact 3D geometry choices (sphere type, block geometry, plane dimensions)
- Material properties (emissive intensity, opacity, roughness)
- Lighting setup per scene
- Camera default position and FOV
- d3-force-3d simulation parameters (charge, link distance, alpha decay)
- Whether scenes share a common 3D wrapper component or are fully independent
- Performance optimization techniques (instancing, LOD, frustum culling)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| 3D-01 | Dashboard Activity Mesh — 3D wireframe sphere with activity nodes, auto-rotate, hover tooltips, max 50 nodes | Activity store provides `entries` (ActivityEntry[]) with pluginId for color mapping. MindGraph3D pattern provides sphere geometry + Html tooltip + OrbitControls auto-rotate |
| 3D-02 | Nebula 3D Knowledge Graph — port MindGraph3D architecture, notes as nodes, tag edges, orbit controls, 2D/3D toggle | Nebula store has `graphData` (GraphData with nodes/links). MindGraphTab provides 2D/3D toggle + ErrorBoundary pattern to replicate exactly |
| 3D-03 | Launchpad Cost Treemap — 3D extruded blocks, height = cost, hover lift + tooltip, max 20 blocks | Launchpad store has `selectedServices` with `ServiceCostResult.monthly` for height mapping. BoxGeometry with variable height for extrusion |
| 3D-04 | DbInspector Schema Orb — floating table planes, FK lines, orbit controls, toggle alongside mermaid, max 30 tables | ERDiagram component has `tables: TableInfo[]` and FK data. PlaneGeometry for table cards, Line for FK connections |
| 3D-05 | Error boundaries + Suspense + lazy Canvas + 2D fallback for all 4 new 3D components | Graph3DErrorBoundary class in MindGraphTab is the exact pattern. Extract and reuse |
| 3D-06 | All 3D components respect usePrefersReducedMotion (disable auto-rotate, reduce particles) | `usePrefersReducedMotion` hook at `src/renderer/src/lib/useReducedMotion.ts`. Pass boolean to OrbitControls `autoRotate` prop |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-three/fiber | ^9.5.0 | React renderer for Three.js — declarative 3D scenes | Already installed, used by MindGraph3D |
| @react-three/drei | ^10.7.7 | Helpers: OrbitControls, Html, Line, Text | Already installed, used by MindGraph3D |
| three | ^0.183.2 | WebGL 3D engine underneath R3F | Already installed |
| d3-force-3d | ^3.0.6 | 3D force simulation for graph layouts (Nebula, Dashboard) | Already installed, used by MindGraph3D |
| react-force-graph-2d | (existing) | 2D fallback rendering for graph scenes | Already used by MindGraphTab and KnowledgeGraph |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | (existing) | Entrance animations for 2D fallbacks and toggle UI | Already used project-wide |
| lucide-react | (existing) | Icons for 2D/3D toggle buttons (Box, Grid3X3) | Already used in MindGraphTab toggle |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| d3-force-3d for treemap layout | Manual grid placement | Treemap is a grid, not force-directed — use manual placement for cost blocks |
| d3-force-3d for schema orb | Manual radial/cluster placement | Could use force for organic layout, but schema grouping benefits from explicit clustering |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/
├── components/
│   └── ui/
│       └── Scene3DWrapper.tsx     # NEW: Shared ErrorBoundary + Suspense + lazy wrapper
├── plugins/
│   ├── nebula/
│   │   ├── KnowledgeGraph.tsx      # MODIFY: Add 2D/3D toggle
│   │   └── KnowledgeGraph3D.tsx    # NEW: 3D force-directed graph
│   ├── launchpad/
│   │   └── CostTreemap3D.tsx       # NEW: 3D extruded cost blocks
│   └── db-inspector/
│       ├── ERDiagram.tsx            # MODIFY: Add 3D toggle alongside mermaid
│       └── SchemaOrb3D.tsx          # NEW: 3D floating table planes
├── components/
│   └── dashboard/
│       ├── MissionControl.tsx       # MODIFY: Add Activity Mesh to hero
│       └── ActivityMesh3D.tsx       # NEW: 3D activity visualization
└── lib/
    └── useReducedMotion.ts          # EXISTING: Already has usePrefersReducedMotion
```

### Pattern 1: Shared 3D Scene Wrapper (ErrorBoundary + Suspense + lazy)
**What:** Extract the Graph3DErrorBoundary + Suspense + React.lazy pattern from MindGraphTab into a reusable component
**When to use:** Every 3D scene in the app
**Example:**
```typescript
// Scene3DWrapper.tsx
interface Scene3DWrapperProps {
  fallback: React.ReactNode        // 2D fallback component
  children: React.ReactNode        // lazy-loaded 3D scene
  loadingMessage?: string
}

class Scene3DErrorBoundary extends React.Component<...> {
  // Same as Graph3DErrorBoundary in MindGraphTab
}

export function Scene3DWrapper({ fallback, children, loadingMessage }: Scene3DWrapperProps) {
  return (
    <Scene3DErrorBoundary fallback={fallback}>
      <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
        {children}
      </Suspense>
    </Scene3DErrorBoundary>
  )
}
```

### Pattern 2: Inner 3D Scene Component (inside Canvas)
**What:** The actual Three.js scene with useFrame, geometry, materials, and OrbitControls
**When to use:** Each 3D visualization
**Example (from existing MindGraph3D):**
```typescript
function InnerScene({ data, onNodeClick }: Props) {
  const reducedMotion = usePrefersReducedMotion()

  useFrame(() => {
    // tick simulation, update positions
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[100, 100, 100]} intensity={0.8} />
      {/* geometry nodes */}
      <OrbitControls
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.3}
        enablePan enableZoom enableRotate
      />
    </>
  )
}

export default function Scene3D(props: Props) {
  return (
    <Canvas camera={{ position: [...], fov: 55 }} gl={{ antialias: true }}>
      <InnerScene {...props} />
    </Canvas>
  )
}
```

### Pattern 3: Auto-Rotate Pause on Hover
**What:** OrbitControls auto-rotate pauses when user hovers/interacts, resumes after 3s idle
**When to use:** All four scenes
**Example:**
```typescript
const controlsRef = useRef<any>(null)
const idleTimer = useRef<ReturnType<typeof setTimeout>>()

const pauseAutoRotate = useCallback(() => {
  if (controlsRef.current) controlsRef.current.autoRotate = false
  clearTimeout(idleTimer.current)
  idleTimer.current = setTimeout(() => {
    if (controlsRef.current && !reducedMotion) controlsRef.current.autoRotate = true
  }, 3000)
}, [reducedMotion])

// On mesh hover/click: call pauseAutoRotate()
// OrbitControls ref={controlsRef} autoRotate={!reducedMotion}
```

### Pattern 4: 2D/3D Toggle Pill
**What:** A toggle button pair (Box/Grid3X3 icons) to switch between 3D and 2D views
**When to use:** Nebula KnowledgeGraph, DbInspector ERDiagram
**Example (from existing MindGraphTab):**
```typescript
<div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
  <button onClick={() => setUse3D(true)}
    className={`... ${use3D ? 'bg-accent/15 text-accent' : 'text-text-secondary'}`}>
    <Box size={11} /> 3D
  </button>
  <button onClick={() => setUse3D(false)}
    className={`... ${!use3D ? 'bg-accent/15 text-accent' : 'text-text-secondary'}`}>
    <Grid3X3 size={11} /> 2D
  </button>
</div>
```

### Anti-Patterns to Avoid
- **Creating Canvas per re-render:** Canvas must be stable. Never conditionally create/destroy Canvas on state changes — use a single Canvas and swap scene contents.
- **Calling setPositions every frame without batching:** The existing MindGraph3D calls `setPositions(new Float32Array(...))` every frame which triggers React re-renders. For new scenes, prefer refs over state for positions updated via useFrame.
- **Forgetting `touchAction: 'none'`:** The Canvas container and Canvas element both need `touchAction: 'none'` to prevent browser scroll interference.
- **Disposing Three.js objects in React land:** Let R3F handle disposal. Do not manually call `.dispose()` on geometries/materials unless managing raw Three.js objects outside the scene graph.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Orbit camera controls | Custom mouse/wheel handlers | `OrbitControls` from @react-three/drei | Handles touch, inertia, damping, zoom limits |
| HTML labels in 3D | Custom CSS overlay positioned via projection math | `Html` from @react-three/drei | Handles occlusion, distance factor, center prop |
| 3D line rendering | Raw BufferGeometry line segments | `Line` from @react-three/drei | Supports lineWidth, opacity, colors natively |
| Force-directed layout | Custom spring physics | `d3-force-3d` simulation | Proven charge/link/center forces with 3D support |
| Responsive canvas sizing | Manual resize listeners | R3F Canvas auto-resizes to parent container | Built into @react-three/fiber |
| WebGL context detection | Manual WebGL capability check | ErrorBoundary catch | Catches all failures including context loss, OOM |

**Key insight:** @react-three/drei abstracts away 80% of raw Three.js boilerplate. The existing MindGraph3D is proof this stack works in the Zenith Electron app without issues.

## Common Pitfalls

### Pitfall 1: WebGL Context Limit
**What goes wrong:** Chrome/Electron allows ~16 active WebGL contexts. Creating Canvas instances for each scene tab without cleanup exhausts the limit.
**Why it happens:** React.lazy loads a Canvas, user navigates away, Canvas stays mounted in background.
**How to avoid:** Ensure Canvas unmounts when not visible (route/tab change). React.lazy + Suspense handles this if the 3D component is conditionally rendered (not hidden with CSS display:none).
**Warning signs:** Black rectangles, "Too many active WebGL contexts" console warning.

### Pitfall 2: useFrame State Updates Causing Re-Renders
**What goes wrong:** Calling React setState inside useFrame (60fps) triggers 60 re-renders/sec of the entire component tree.
**Why it happens:** The existing MindGraph3D does `setPositions(...)` in useFrame. This works for small graphs but is expensive.
**How to avoid:** Use refs for per-frame data. Only use state for user-visible changes (hover state). For positions, update mesh.position directly via refs.
**Warning signs:** React DevTools showing frequent re-renders of the Canvas tree, low FPS.

### Pitfall 3: Memory Leaks on Navigation
**What goes wrong:** Three.js geometries/materials not cleaned up when component unmounts.
**Why it happens:** R3F handles scene graph disposal, but raw Three.js objects (created outside JSX) need manual cleanup.
**How to avoid:** Use R3F declarative JSX for all geometries. For d3-force-3d simulation, call `sim.stop()` in useEffect cleanup (MindGraph3D already does this correctly).
**Warning signs:** Increasing memory in DevTools Heap snapshot after navigating between tabs multiple times.

### Pitfall 4: OrbitControls Conflicting with Page Scroll
**What goes wrong:** Scroll wheel on the 3D scene also scrolls the parent container.
**Why it happens:** Default browser scroll event propagation.
**How to avoid:** Set `touchAction: 'none'` on the Canvas container div and `overscrollBehavior: 'none'` on the parent. MindGraphTab already does this correctly.
**Warning signs:** Page scrolls when trying to zoom the 3D scene.

### Pitfall 5: Large Node Counts Killing Frame Rate
**What goes wrong:** Rendering 100+ individual mesh objects drops below 30fps.
**Why it happens:** Each mesh is a separate draw call.
**How to avoid:** Enforce node caps (50 for Dashboard, 20 for Launchpad, 30 for DbInspector). For graphs with many nodes, consider InstancedMesh from drei for batched rendering.
**Warning signs:** FPS drops below 30 when looking at a busy scene.

### Pitfall 6: d3-force-3d TypeScript Declarations
**What goes wrong:** TypeScript errors on import because d3-force-3d has no TS declarations.
**Why it happens:** The library ships JS-only.
**How to avoid:** Use `// @ts-expect-error — d3-force-3d has no TS declarations` on the import line (existing pattern in MindGraph3D).
**Warning signs:** Build failures on import.

## Code Examples

### Activity Mesh Node Color Mapping
```typescript
// Map ActivityEntry.pluginId to plugin accent colors
const PLUGIN_COLORS: Record<string, string> = {
  'cortex': '#06b6d4',     // cyan
  'db-inspector': '#3b82f6', // blue
  'nebula': '#ec4899',      // pink
  'launchpad': '#f59e0b',   // amber
  'code-review-bot': '#10b981', // emerald
  'textcraft': '#8b5cf6'    // violet
}

function getNodeColor(pluginId: string): string {
  return PLUGIN_COLORS[pluginId] ?? '#94a3b8' // slate fallback
}
```

### Cost Treemap Block Height Calculation
```typescript
// Map monthly cost to block height (normalized to max)
function getBlockHeight(monthlyCost: number, maxCost: number): number {
  const MIN_HEIGHT = 0.5
  const MAX_HEIGHT = 5.0
  if (maxCost <= 0) return MIN_HEIGHT
  return MIN_HEIGHT + (monthlyCost / maxCost) * (MAX_HEIGHT - MIN_HEIGHT)
}
```

### Isometric Camera Setup (Launchpad Treemap)
```typescript
// 45-degree isometric angle
<Canvas
  camera={{
    position: [10, 10, 10],
    fov: 45,
    near: 0.1,
    far: 1000
  }}
  gl={{ antialias: true }}
>
```

### Schema Orb Table Plane with Label
```typescript
// Floating labeled plane for a database table
<mesh position={[x, y, z]}>
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
    <div className="whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
      {tableName}
    </div>
  </Html>
</mesh>
```

### Canvas Cleanup Pattern
```typescript
// Ensure d3-force simulation stops on unmount
useEffect(() => {
  const sim = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(-60))
    .force('link', forceLink(links).id(d => d.id).distance(25))
    .force('center', forceCenter())
  simRef.current = sim
  return () => { sim.stop() }  // CRITICAL: stop simulation
}, [nodes, links])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Three.js imperative scenes | @react-three/fiber declarative JSX | R3F v8+ (2022) | React-idiomatic 3D, automatic disposal |
| Manual orbit camera code | drei OrbitControls component | drei v9+ | Declarative camera controls |
| Custom HTML overlay projection | drei Html component | drei v9+ | Auto-positioned HTML in 3D space |
| ForceGraph3D library | d3-force-3d + custom rendering | Project choice | More control over visual style |

**Deprecated/outdated:**
- `@react-three/fiber` v8 (project uses v9) — v9 improved reconciler and pointer events
- `drei` v9 (project uses v10) — v10 added improved TypeScript types

## Open Questions

1. **Shared Scene3DWrapper as UI component vs inline pattern**
   - What we know: MindGraphTab has ErrorBoundary + Suspense inline. 4 new scenes need the same pattern.
   - What's unclear: Whether extracting to a shared component is worthwhile or if copy-paste of the ~20 line pattern is simpler.
   - Recommendation: Extract to `Scene3DWrapper` in components/ui/ — reduces duplication across 5 total scenes (including existing Cortex).

2. **Dashboard Activity Mesh placement within hero GlassSurface**
   - What we know: User wants it right side of hero area, ~250x250px. Current hero has greeting left, nothing right.
   - What's unclear: Whether the mesh should be inside the existing GlassSurface or a separate card.
   - Recommendation: Place inside the existing hero GlassSurface, positioned with flexbox to the right of the greeting text. Use a fixed-size container div.

3. **Launchpad data availability for treemap**
   - What we know: `launchpad-store` has `selectedServices` with cost data. `EstimationSummary` computes totals.
   - What's unclear: Whether the treemap should show the current estimation or a saved estimation entry.
   - Recommendation: Show the current active estimation's selectedServices with their computed monthly costs.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `MindGraph3D.tsx` — proven R3F + d3-force-3d pattern in Zenith
- Existing codebase: `MindGraphTab.tsx` — proven ErrorBoundary + Suspense + lazy + 2D/3D toggle
- Existing codebase: `KnowledgeGraph.tsx` — current 2D graph to upgrade with 3D toggle
- Existing codebase: `package.json` — all dependencies already installed with versions confirmed

### Secondary (MEDIUM confidence)
- @react-three/fiber v9 APIs — verified against installed version and working MindGraph3D usage
- @react-three/drei v10 APIs (OrbitControls, Html, Line) — verified against working MindGraph3D usage

### Tertiary (LOW confidence)
- WebGL context limit (16 contexts) — well-known Chrome limitation, specific number may vary by platform/GPU

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and proven in codebase
- Architecture: HIGH — MindGraph3D + MindGraphTab provide exact blueprints to follow
- Pitfalls: HIGH — derived from actual codebase patterns and known WebGL constraints

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable — no library upgrades expected)
