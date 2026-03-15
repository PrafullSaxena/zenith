# Cortex UI/UX Revamp — Design Spec

## Summary

Premium polish overhaul of the entire Cortex plugin — glass-morphism cards, bento grid layouts, spring animations, flowing particle edges, and a 3D force-directed MindGraph. The goal is "Premium Dev Tool with alive data visualizations" — Linear-quality polish on every surface, with the graph tabs being genuine wow moments.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visual direction | B+C: Premium Dev Tool + Data Observatory | Professional but delightful; data visualizations are the wow moments |
| Overview layout | A+C hybrid: Glass cards in bento grid | Glassmorphism premium feel with Apple-style information density |
| Graph/3D strategy | Hybrid: 3D for MindGraph, enhanced 2D for Flows/Diagrams | 3D where it adds value (force graph), React Flow interactivity preserved elsewhere |
| Microinteractions | Moderate | Hover glows, spring transitions, staggered reveals, skeleton loaders, animated counters. No ambient particles or ripples. |
| Tab priority | Tier 1: Overview, Flows, Diagrams, Graph, CortexView shell. Tier 2: APIs, Code, Repos. Tier 3: Ask, Architecture. | Focus energy on highest-impact surfaces first |

## New Dependencies

| Package | Purpose | Size (gzipped) |
|---------|---------|----------------|
| `three` | 3D rendering for MindGraph | ~150KB |
| `@react-three/fiber` | React bindings for three.js | ~40KB |
| `@react-three/drei` | Helpers (OrbitControls, etc.) | ~20KB (tree-shakeable) |
| `d3-force-3d` | 3D force simulation for MindGraph | ~8KB |

Existing deps used: `framer-motion` v12.5, `@xyflow/react` v12.10, `@dagrejs/dagre` v2.0, `react-force-graph-2d` v1.29 (kept as fallback).

## Shared Design Tokens

All Cortex components use these consistent patterns:

### Glass Card

```
bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl
shadow: 0 4px 20px rgba(0,0,0,0.15)
hover: border-white/[0.12], translateY(-1px), shadow increase
```

### Glass Surface (panels, toolbars)

```
bg-surface-elevated/50 backdrop-blur-xl border-b border-border/40
```

### Staggered Entrance Animation

```tsx
// framer-motion variant pattern used everywhere
const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
  })
}
```

### Tab Pill with Sliding Indicator

```tsx
// Shared layoutId for active tab background
<motion.div layoutId="cortex-tab-indicator" className="absolute inset-0 bg-accent/12 rounded-lg" />
```

### Kind Color Map (consistent across all tabs)

```ts
const KIND_COLORS = {
  controller: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#34d399', glow: 'rgba(16,185,129,0.15)' },
  service:    { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)', text: '#a78bfa', glow: 'rgba(139,92,246,0.15)' },
  repository: { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  text: '#60a5fa', glow: 'rgba(59,130,246,0.15)' },
  class:      { bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.25)',   text: '#22d3ee', glow: 'rgba(6,182,212,0.15)' },
  component:  { bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.25)',  text: '#f472b6', glow: 'rgba(236,72,153,0.15)' },
  function:   { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#94a3b8', glow: 'rgba(100,116,139,0.15)' },
  middleware: { bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.25)',    text: '#f87171', glow: 'rgba(239,68,68,0.15)' },
  dag:        { bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.25)',   text: '#fbbf24', glow: 'rgba(245,158,11,0.15)' },
  task:       { bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.25)',   text: '#fb923c', glow: 'rgba(251,146,60,0.15)' },
  method:     { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#94a3b8', glow: 'rgba(100,116,139,0.15)' },
  route:      { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)',  text: '#34d399', glow: 'rgba(16,185,129,0.15)' },
  decorator:  { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af', glow: 'rgba(107,114,128,0.15)' },
  default:    { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#94a3b8', glow: 'rgba(100,116,139,0.15)' },
}
// Note: KIND_COLORS are fixed across themes — entity kinds need consistent recognizable colors regardless of theme.
// These rgba values intentionally do NOT derive from OKLCh theme tokens.
```

### HTTP Method Colors

```ts
const METHOD_COLORS = {
  GET: { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  POST: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  PUT: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  DELETE: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  PATCH: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  ALL: { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
}
```

## Component-by-Component Spec

### 1. CortexView Shell

**File:** `CortexView.tsx`

**Changes:**
- Header: Glass surface bar. Repo name with subtle gradient text (`bg-gradient-to-r from-text-primary to-accent bg-clip-text`). Branch badge with status dot (green=ready, amber=stale, blue=analyzing, red=error) that pulses via CSS `status-pulse` animation.
- Tab bar: Pill-style tabs. Active tab gets `bg-accent/12 text-accent rounded-lg` background that slides between tabs using framer-motion `layoutId="cortex-main-tab"`. Inactive tabs: `text-text-secondary hover:text-text-primary hover:bg-white/[0.03]`.
- Tab content: `AnimatePresence mode="wait"` with `opacity` + `y:8` entrance, 200ms, `[0.25, 0.46, 0.45, 0.94]` easing.
- Status bar: Glass bottom bar. Animated status dot. File/entity/line counts use `AnimatedCounter`. Last analyzed timestamp with relative time.

**Insight sub-tabs (InsightsPanel.tsx):**
- Same pill pattern but `text-[10px]` size. Shared `layoutId="cortex-insight-tab"` for sliding indicator. Icons at 12px.

### 2. Overview Tab

**File:** `OverviewTab.tsx`

**Layout:** Single-column scroll with bento-style sections.

**Sections:**
1. **Header row:** "Overview" title + Enrich button (unchanged logic, glass pill styling).
2. **Stat cards:** 2x2 grid (or 4-col on wide screens). Glass cards with colored gradient top accent line (3px, kind color). Icon + label + `AnimatedCounter` value. Staggered entrance at 80ms intervals.
3. **Language breakdown:** Replace dual horizontal bars with:
   - SVG donut ring chart (animated clockwise on mount via `stroke-dashoffset` transition).
   - Segment hover: highlight segment + show tooltip with language name, line count, percentage.
   - Legend below as colored dot + label pairs.
4. **Entity breakdown:** Horizontal scrolling row of glass pill badges. Each pill: colored left border (4px), kind name, count badge. Click navigates to first entity. Hover lifts.
5. **Documentation:** Glass card. `MarkdownRenderer` inside. If empty, centered empty state with gradient-opacity `FileText` icon.
6. **Repository Markdown Files:** Accordion list. Glass card per file. `ChevronRight` rotates 90deg on expand (framer-motion `rotate`). Content slides down with `AnimatePresence`.
7. **Test Coverage:** SVG circular progress ring. Animated `stroke-dashoffset` on mount. Percentage in center with `AnimatedCounter`.

### 3. APIs Tab

**File:** `APIListTab.tsx`

**Layout:** Sticky filter bar + grouped endpoint list.

**Changes:**
1. **Filter bar:** Glass sticky top bar. HTTP method toggle pills (multi-select). Text search input with glass styling and accent focus ring. Results count badge.
2. **Controller groups:** Collapsible sections. Glass header with controller name (bold), base path (mono, muted), endpoint count badge. `ChevronDown` rotates on collapse.
3. **Endpoint cards:** Glass card per endpoint inside group. Left: method pill badge (colored per METHOD_COLORS). Center: full path in mono font. Right: handler name muted. Hover lifts.
4. **Staggered entrance:** Group endpoints appear 40ms apart on expand.
5. **Empty state:** Centered `Route` icon with gradient opacity + framework support message.

### 4. Flows Tab

**File:** `FlowsTab.tsx`, `FlowDiagram.tsx`, `FlowNode.tsx`, `FlowEdge.tsx`

**FlowNode changes:**
- Glass card with gradient left border (4px, kind color).
- Entity kind icon in top-left (from lucide).
- Name (bold) + kind badge (tiny pill) + method count if applicable.
- Hover: `scale: 1.02` + `boxShadow` glow matching kind color.
- Selected: brighter border + accent ring.

**FlowEdge changes:**
- Keep gradient stroke + flowing dot particle animation.
- Add SVG `feGaussianBlur` glow filter on edges.
- Edge styles by type: `inject` = animated dashed purple, `call` = solid with flowing dot, `inferred` = thin dotted gray.

**FlowDiagram changes:**
- Background: `variant="dots"` (not lines), dark color.
- Subtle radial gradient center glow via CSS on the container.
- Controls panel: glass styling.
- MiniMap: glass overlay with reduced opacity.
- Nodes entrance: fade-in with `scale: 0.9 -> 1.0`, 300ms spring on initial render.

**FlowsTab changes:**
- Flow type selector: pill tabs with sliding indicator.
- Endpoint selector: glass dropdown.
- Validate button: glass pill matching existing color logic.

### 5. Diagrams Tab

**File:** `DiagramsTab.tsx`

**Sub-tab bar:** Pill tabs with `layoutId="cortex-diagram-tab"` sliding indicator.

**Entity Graph:**
- Glass nodes with kind-colored gradient borders. Node size varies by method count (min 180px, max 260px width).
- Edges: flowing dot animation. Hover edge to highlight + show label.
- Tooltip on node hover: entity name, kind, file, method count.

**Layer Interaction:**
- Horizontal swim lanes. Glass header per layer (kind name, uppercase, kind color).
- Entity cards inside lanes as compact glass pills.
- Cross-lane edges: animated dashes with kind-to-kind gradient.

**Dependency Map:**
- Central project node: larger, gradient border with subtle rotation animation (`@keyframes border-rotate`).
- Kind nodes in radial layout: glass cards with count badges.
- Inter-kind edges: gradient strokes with animated dash.

**All diagrams:**
- Node/edge count badge in toolbar (glass pill).
- Same dark radial gradient background as Flows.

### 6. MindGraph Tab (3D)

**File:** `MindGraphTab.tsx` (rewrite)

**New implementation using react-three-fiber:**

**Scene setup:**
```tsx
<Canvas camera={{ position: [0, 0, 300], fov: 60 }}>
  <ambientLight intensity={0.3} />
  <pointLight position={[100, 100, 100]} intensity={0.5} />
  <OrbitControls autoRotate autoRotateSpeed={0.5} enableDamping dampingFactor={0.1} />
  <ForceGraph3D entities={entities} calls={calls} />
</Canvas>
```

**Nodes:**
- `<mesh>` with `<sphereGeometry>`. Size based on connection count (radius 2-8).
- Material: `<meshStandardMaterial>` with kind color, `emissive` matching kind glow, `emissiveIntensity: 0.3`.
- Hover: increase emissive intensity to 0.8, scale up 1.2x with spring.
- Click: focus camera on node (smooth lerp transition), show detail panel.

**Edges:**
- `<Line>` from drei. Color based on edge type.
- Injection edges: thicker, brighter.
- Animated particle along edge path using `useFrame` + position interpolation.

**Force simulation:**
- Use d3-force-3d for node positioning (forceLink, forceManyBody, forceCenter).
- Run simulation in `useFrame` loop for smooth animation.
- Stabilize after ~200 iterations, then switch to idle state.

**Background:**
- Dark clear color (`#020617`).
- Optional: tiny star-field points at large distance (subtle depth cue).

**Performance:**
- Cap at 200 nodes. If more, show "Showing top 200 entities by connectivity" badge.
- LOD: nodes far from camera render as simple points (no sphere geometry).
- Frustum culling enabled.

**Fallback:**
- Wrap `<Canvas>` in a React ErrorBoundary. On catch, render the 2D `react-force-graph-2d` fallback with a subtle info badge: "3D view unavailable — showing 2D fallback."
- `MindGraphTab` must remain lazily imported (`React.lazy`) as it already is. Three.js deps (`three`, `@react-three/fiber`, `@react-three/drei`) will be in a separate Vite chunk via dynamic import — no impact on initial bundle size.

**Controls overlay:**
- Glass panel in bottom-right: zoom slider, reset view button, auto-rotate toggle, node count.
- Search input in top-right: type entity name to focus camera on it.

### 7. Code Tab

**File:** `CodePanel.tsx`, `FileTree.tsx`, `CodeTabs.tsx`, `CodeViewer.tsx`

**FileTree:**
- Glass sidebar container.
- Tree indent lines (thin, `border-l border-border/30`).
- Folder/file icons colored by file type (ts=blue, java=amber, py=green, etc.).
- Smooth expand/collapse with `AnimatePresence` on folder children.
- Active file: accent left border (3px) + `bg-accent/8`.
- Hover: `bg-white/[0.03]`.

**CodeTabs:**
- Glass tab bar. Active tab: bottom accent line (2px). Close `X` appears on hover.
- Tab entrance: slide-in from right.

**CodeViewer:**
- Ensure CodeMirror theme matches Zenith dark tokens exactly.
- Click a line: subtle accent background highlight on that line.
- Smooth scroll-to-line animation when navigating from other tabs.

**Resize handle:**
- Thin vertical line (2px) with centered grip dots (3 dots, 4px apart).
- Hover: accent color highlight. Dragging: accent color persistent.

### 8. Repos Tab & RepoCard

**File:** `RepoManager.tsx`, `RepoCard.tsx`, `AddRepoDialog.tsx`, `AnalysisProgress.tsx`

**RepoCard:**
- Glass card with gradient top border (3px) by repo type color.
- Status dot: animated (CSS `status-pulse` for ready, `animate-spin` for analyzing, static for idle/error).
- Hover: lift (`translateY: -2px`) + shadow increase.
- Action buttons: glass pill style. Icon-only compact. "Run AI Analysis" button gets subtle background shimmer via CSS gradient animation.

**AnalysisProgress:**
- Segmented progress bar: each analysis phase gets a distinct colored segment.
- Phase label crossfades between states.
- Percentage with `AnimatedCounter`.

**AddRepoDialog:**
- Glass modal with `backdrop-blur-2xl` overlay.
- Input fields: glass style with accent focus ring (`ring-1 ring-accent/40`).
- Branch selector dropdown: glass dropdown.

**RepoManager grid:**
- Cards in responsive grid (1-3 columns).
- Staggered entrance at 80ms per card.

### 9. Ask Tab

**File:** `QAPanel.tsx`

**Changes:**
- User message: glass card with accent-tinted left border (3px).
- AI response: glass card with surface-elevated background.
- Message entrance: `slide-up` + `opacity` animation, 200ms.
- Source citation pills: glass pill style with `FileText` icon. Hover lifts. Click navigates to code.
- Input bar: glass bottom bar. Textarea with accent focus ring. Submit button: accent background, `active:scale-95`.
- Typing indicator: three dots with staggered bounce animation (`@keyframes typing-dot`).
- Empty state: centered message with gradient icon.

## CSS Additions to main.css

New keyframes needed:

```css
/* Required for animating custom property */
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes border-rotate {
  from { --angle: 0deg; }
  to { --angle: 360deg; }
}

@keyframes typing-dot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes donut-fill {
  from { stroke-dashoffset: var(--circumference); }
  to { stroke-dashoffset: var(--target-offset); }
}
```

## Accessibility

- All animations respect `prefers-reduced-motion` via existing `usePrefersReducedMotion` hook.
- When reduced motion: skip entrance animations, disable auto-rotate in 3D, disable flowing particles.
- All interactive elements maintain keyboard focus indicators.
- Color contrast ratios maintained at WCAG AA minimum.
- 3D graph includes 2D fallback for accessibility.

## Performance Considerations

- 3D MindGraph: cap at 200 nodes, LOD for distant nodes, frustum culling.
- `backdrop-filter: blur()` can be expensive — limit to visible surfaces, avoid on rapidly updating elements.
- Staggered animations use `will-change: transform, opacity` only during animation.
- React Flow: `proOptions={{ hideAttribution: true }}`, `minZoom: 0.3`, `maxZoom: 2`.
- Memoize graph data computation with `useMemo` keyed on `analysisResult`.
- No Zustand store changes needed — `cortex-store.ts` tab types remain `'insights' | 'code' | 'qa' | 'repos'`, insight sub-tabs remain the same. All new UI state (filter bar, 3D controls) is component-local `useState`.

## Files Modified

| File | Change Type |
|------|-------------|
| `CortexView.tsx` | Overhaul — glass header, pill tabs, sliding indicator, status bar |
| `InsightsPanel.tsx` | Polish — pill sub-tabs with sliding indicator |
| `OverviewTab.tsx` | Overhaul — bento glass grid, donut chart, pill badges, ring progress |
| `APIListTab.tsx` | Overhaul — grouped endpoints, filter bar, glass cards |
| `FlowsTab.tsx` | Polish — glass toolbar, pill selectors |
| `FlowDiagram.tsx` | Polish — glass controls, dot background, radial glow |
| `FlowNode.tsx` | Overhaul — glass cards, gradient borders, glow hover |
| `FlowEdge.tsx` | Polish — glow filter, type-based edge styles |
| `DiagramsTab.tsx` | Overhaul — pill sub-tabs, glass nodes, animated edges |
| `MindGraphTab.tsx` | Rewrite — react-three-fiber 3D force graph |
| `CodePanel.tsx` | Polish — glass sidebar, styled resize handle |
| `FileTree.tsx` | Polish — tree lines, colored icons, glass hover |
| `CodeTabs.tsx` | Polish — glass tab bar, accent indicator |
| `CodeViewer.tsx` | Polish — theme alignment, line highlight |
| `RepoCard.tsx` | Polish — glass card, gradient border, animated status dot |
| `RepoManager.tsx` | Polish — staggered grid, glass layout |
| `AddRepoDialog.tsx` | Polish — glass modal, styled inputs |
| `AnalysisProgress.tsx` | Polish — segmented bar, crossfade labels |
| `QAPanel.tsx` | Polish — glass messages, typing indicator, citation pills |
| `ArchitectureDashboard.tsx` | Light polish — glass panels, consistent tokens |
| `ValidationPanel.tsx` | Light polish — glass cards |
| `TestCoverageCard.tsx` | Overhaul — SVG ring progress |
| `DesignDocTab.tsx` | Light polish — glass card container, consistent tokens |
| `InsightCard.tsx` | Deprecated — replaced by inline glass cards in bento grid |
| `ExportDialog.tsx` | Light polish — glass modal styling |
| `main.css` | Add new keyframes + utility classes |
| `package.json` | Add three, @react-three/fiber, @react-three/drei, d3-force-3d |

## Implementation Order

**Wave 1 — Foundation (no visual dependencies):**
1. Install three.js deps + add CSS keyframes to main.css
2. Create shared `cortex-theme.ts` with KIND_COLORS, METHOD_COLORS, glass utility classes
3. CortexView shell + InsightsPanel (pill tabs, sliding indicator, glass header)

**Wave 2 — Tier 1 surfaces (parallel):**
4. OverviewTab (bento glass grid, donut chart, animated counters)
5. DiagramsTab (glass nodes, animated edges, pill sub-tabs)
6. FlowsTab + FlowNode + FlowEdge (glass nodes, glow edges, dot background)
7. MindGraphTab 3D rewrite (react-three-fiber, force simulation, controls)

**Wave 3 — Tier 2 surfaces (parallel):**
8. APIListTab (grouped endpoints, filter bar, glass cards)
9. CodePanel + FileTree + CodeTabs + CodeViewer (glass sidebar, tree lines, theme)
10. RepoCard + RepoManager + AddRepoDialog + AnalysisProgress (glass cards, animations)

**Wave 4 — Tier 3 + polish:**
11. QAPanel (glass messages, typing indicator)
12. ArchitectureDashboard + ValidationPanel (light polish)
13. TestCoverageCard (SVG ring)
14. Cross-component consistency pass + reduced-motion verification
