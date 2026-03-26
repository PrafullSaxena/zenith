# Phase 6: 3D Visualizations - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build 4 new 3D visualization scenes using react-three-fiber (already in deps), with error boundaries, Suspense lazy loading, 2D fallbacks, and reduced-motion support. Each scene is an independent deliverable. No plugin functionality changes — these are visual enhancements to existing data.

Scenes: Dashboard Activity Mesh, Nebula 3D Knowledge Graph, Launchpad Cost Treemap, DbInspector Schema Orb.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Activity Mesh
- **Shape**: Claude's discretion — wireframe sphere, particle cloud, or other striking shape that fits the Obsidian Glass aesthetic
- **Node colors**: Plugin accent colors — each node colored by its source plugin (Cortex=cyan, DbInspector=blue, Nebula=pink, etc.)
- **Size & position**: Right side of hero area, ~250x250px. Complements the greeting text, doesn't dominate.
- **Data source**: Recent activity events (last 50). More activity = denser mesh. Pulse animation when new activity arrives.
- **Node cap**: Max 50 nodes for performance

### Nebula 3D Knowledge Graph
- **Architecture**: Port MindGraph3D architecture from Cortex — same orbit controls, camera lerp, node selection
- **Nodes**: Notes colored by tag/category
- **Edges**: Tag relationships and backlinks
- **Toggle**: 2D/3D toggle (same pattern as MindGraphTab)
- **Click**: Opens the note

### Launchpad Cost Treemap
- **Shape**: 3D extruded blocks — height proportional to monthly cost
- **Colors**: Service category based (compute=blue, storage=green, network=purple, etc.)
- **Hover**: Block lifts + tooltip with service name and cost
- **Click**: Drills into service detail
- **Node cap**: Max 20 blocks
- **Camera**: Isometric angle (45° tilt)

### DbInspector Schema Orb
- **Shape**: Tables as floating labeled planes in 3D space
- **Relationships**: Foreign key lines as glowing connections between planes
- **Clustering**: Group by schema/namespace
- **Click**: Shows table columns
- **Node cap**: Max 30 tables
- **Toggle**: Alongside existing mermaid ER diagram view

### Shared 3D Interaction Patterns (all 4 scenes)
- **Auto-rotate**: Slow (~0.3 rad/s), pauses on hover/interaction, resumes after 3s idle
- **Hover**: Glass-styled Html tooltip label showing node details (matches MindGraph3D pattern)
- **Click**: Context-specific navigation — Dashboard→plugin, Nebula→note, DbInspector→table columns, Launchpad→service detail
- **Zoom**: Scroll wheel only, no visible zoom buttons. Clean, uncluttered.
- **Orbit controls**: Standard orbit (drag to rotate, scroll to zoom, right-click to pan)

### 2D Fallback
- **Style**: Simplified 2D canvas force-directed graph (like MindGraphTab's existing fallback). Same data, flat rendering.
- **Trigger**: React error boundary catches WebGL failures. Automatic, no user action needed.
- **All scenes**: Wrapped in ErrorBoundary + Suspense + lazy(() => import(...))

### Reduced Motion (prefers-reduced-motion)
- **Behavior**: 3D scene renders but auto-rotate and particle/pulse animations are disabled. User can still orbit manually.
- **usePrefersReducedMotion**: Hook already in lib/useReducedMotion.ts — all scenes must check it.

### Claude's Discretion
- Exact 3D geometry choices (sphere type, block geometry, plane dimensions)
- Material properties (emissive intensity, opacity, roughness)
- Lighting setup per scene
- Camera default position and FOV
- d3-force-3d simulation parameters (charge, link distance, alpha decay)
- Whether scenes share a common 3D wrapper component or are fully independent
- Performance optimization techniques (instancing, LOD, frustum culling)

</decisions>

<specifics>
## Specific Ideas

- The Dashboard Activity Mesh should feel like a living heartbeat of the app — pulsing with recent activity
- The existing MindGraph3D in Cortex is the gold standard for the 3D pattern — reuse its architecture (lazy Canvas, error boundary, orbit controls, camera lerp, Html tooltips)
- All 3D scenes should feel premium but lightweight — no framerate drops on typical hardware
- The Obsidian theme (monochrome) should make 3D scenes look especially striking — white wireframes on near-black

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-3d-visualizations*
*Context gathered: 2026-03-25*
