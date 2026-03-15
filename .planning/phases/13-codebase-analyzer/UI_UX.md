# Codebase Analyzer Plugin - UI/UX Research

**Researched:** 2026-03-14
**Domain:** UI/UX patterns for code visualization, documentation display, and interactive flow graphs
**Confidence:** HIGH (based on existing Zenith patterns + verified library docs)

## Summary

The Codebase Analyzer plugin requires a two-section layout (Insights + Code) with visually impressive animations. The Zenith project already has a mature design system (Tailwind v4 with oklch tokens, framer-motion, react-resizable-panels, CodeMirror 6, lucide-react icons) that MUST be followed. The main new dependency is `@xyflow/react` (React Flow v12) for the interactive node graph, with `dagre` for automatic hierarchical layout.

The plugin should follow the same patterns as DbInspector: a top-level view component with tabbed sections, collapsible side panels, and consistent use of the existing color tokens (`bg-surface`, `bg-surface-elevated`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-accent`). All animations should use framer-motion (already installed at ^12.5.0) for entrance/exit transitions, with CSS keyframe animations reserved for continuous effects (pulses, shimmers).

**Primary recommendation:** Use `@xyflow/react` v12 + `dagre` for the code flow graph, build file tree from scratch (lightweight recursive component matching Zenith style), and leverage framer-motion `AnimatePresence` + `motion.div` for all page/tab/card transitions.

## Standard Stack

### Core (New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@xyflow/react` | ^12.10 | Interactive node-graph for API flow visualization | Industry standard for React node-based UIs; 20k+ GitHub stars; actively maintained; supports React 19 + Tailwind v4 |
| `dagre` | ^0.8.5 | Automatic hierarchical graph layout | Recommended by React Flow docs for tree layouts; simple API; fast |
| `@types/dagre` | ^0.7 | TypeScript definitions for dagre | Required for TypeScript projects |

### Already Available in Zenith (DO NOT add again)

| Library | Purpose | How to Use |
|---------|---------|------------|
| `framer-motion` ^12.5.0 | Page transitions, card entrances, tab switches, node animations | `motion.div`, `AnimatePresence`, `Reorder` |
| `react-resizable-panels` ^4.7.2 | Resizable split layout (sidebar + content) | `PanelGroup`, `Panel`, `PanelResizeHandle` |
| `@codemirror/*` (v6 suite) | Syntax-highlighted code viewer with line numbers | Already configured with one-dark theme |
| `lucide-react` ^0.475.0 | All iconography | Consistent icon style across Zenith |
| `highlight.js` ^11.11.1 | Code highlighting in markdown/static contexts | Used by existing `MarkdownRenderer` |
| `react-router-dom` ^7.13.1 | Routing (plugin is lazy-loaded via registry) | Plugin registers in `registry.ts` |
| `zustand` ^5.0.3 | State management | Follow existing store pattern |
| `@tanstack/react-query` ^5.69.0 | Async data fetching/caching | For repo analysis API calls |
| `pdfmake` ^0.3.5 | PDF export | Already available for export feature |
| `mermaid` ^11.12.3 | Diagram rendering (if needed for generated docs) | Already integrated with MermaidRenderer |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@xyflow/react` | `react-force-graph-2d` (already installed) | Force-graph is for network/relationship graphs, NOT hierarchical flow; wrong paradigm for controller->service->repo->DB |
| `dagre` | `elkjs` | ELK is far more configurable but massive bundle size (~500KB) and complex API; dagre is sufficient for linear pipeline flows |
| `react-arborist` | Custom file tree | react-arborist adds 30KB+ for features we don't need (drag-drop, rename); a simple recursive `<FileTreeNode>` component is ~100 lines and matches Zenith style perfectly |
| Separate markdown library | Existing `MarkdownRenderer` | Zenith already has a battle-tested markdown renderer; reuse it for generated documentation display |

### Installation

```bash
npm install @xyflow/react dagre @types/dagre
```

## Architecture Patterns

### Recommended Plugin Structure

```
src/renderer/src/plugins/codebase-analyzer/
  CodebaseAnalyzerView.tsx     # Main view (like DbInspectorView.tsx)
  components/
    insights/
      InsightsPanel.tsx         # Dashboard cards layout
      OverviewCard.tsx          # Project overview doc card
      APIListCard.tsx           # API endpoints card
      DesignDocCard.tsx         # Architecture design doc card
      DocViewer.tsx             # Full-screen doc viewer (reuses MarkdownRenderer)
    code/
      CodeFlowGraph.tsx         # React Flow graph wrapper
      FlowNode.tsx              # Custom node component (stage card)
      FlowEdge.tsx              # Custom animated edge
      CodeViewer.tsx            # CodeMirror-based code panel
      CodeTabs.tsx              # Tab bar for opened code files
      FileTree.tsx              # Recursive file tree sidebar
      FileTreeNode.tsx          # Single tree node (file/folder)
    repo/
      RepoManager.tsx           # Add/list repositories
      RepoCard.tsx              # Single repo status card
      AnalysisProgress.tsx      # Progress indicator during analysis
    qa/
      QAPanel.tsx               # Natural language Q&A interface
      QAMessage.tsx             # Single Q&A message bubble
    export/
      ExportDialog.tsx          # Export format selector + preview
  stores/
    codebase-store.ts           # Zustand store for analyzer state
  types/
    codebase.ts                 # TypeScript interfaces
```

### Pattern 1: Plugin View with Tab Navigation (Follow DbInspector)

**What:** Top-level view with horizontal tab bar switching between major sections
**When to use:** The main CodebaseAnalyzerView

```typescript
// Follow the exact same pattern as DbInspectorView.tsx
const TABS = [
  { id: 'insights', label: 'Insights', icon: LayoutDashboard },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'qa', label: 'Ask', icon: MessageSquare },
  { id: 'repos', label: 'Repos', icon: FolderGit2 },
] as const

// Tab bar uses the same Zenith styling:
<button
  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
    activeTab === tab.id
      ? 'bg-accent/15 text-accent'
      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
  }`}
>
```

### Pattern 2: Dashboard Cards Layout (Insights Section)

**What:** Grid of cards showing different insight types with expand-to-full-view
**When to use:** Insights section showing overview, API list, design doc

```typescript
// Use the same card pattern as PluginCard.tsx and StatsCards.tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="hover-lift group rounded-xl border border-border/60 bg-surface-elevated/70 p-5
               transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/[0.03]"
  >
    {/* Card header with icon */}
    <div className="flex items-center gap-3 mb-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
        <FileText size={16} className="text-blue-400" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary">Project Overview</h3>
    </div>
    {/* Card preview content */}
    <p className="text-xs text-text-secondary line-clamp-3">{preview}</p>
    {/* Expand button */}
    <button className="mt-3 text-[10px] font-medium text-accent/70 hover:text-accent">
      View full document →
    </button>
  </motion.div>
</div>
```

### Pattern 3: React Flow Code Flow Graph

**What:** Horizontal node graph: Controller → Service → Repository → DB
**When to use:** Code section, visualizing API flow stages

```typescript
import { ReactFlow, Controls, Background, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'

// Stage type color mapping (oklch-compatible)
const STAGE_COLORS = {
  controller: { bg: 'oklch(70% 0.15 250 / 0.15)', border: 'oklch(70% 0.15 250)', text: 'text-blue-400' },
  service:    { bg: 'oklch(72% 0.17 142 / 0.15)', border: 'oklch(72% 0.17 142)', text: 'text-green-400' },
  repository: { bg: 'oklch(75% 0.15 85 / 0.15)',  border: 'oklch(75% 0.15 85)',  text: 'text-amber-400' },
  database:   { bg: 'oklch(65% 0.2 25 / 0.15)',   border: 'oklch(65% 0.2 25)',   text: 'text-red-400' },
} as const

// Custom node component
function FlowStageNode({ data }: { data: StageData }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className="rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm cursor-pointer"
      style={{
        backgroundColor: STAGE_COLORS[data.type].bg,
        borderColor: STAGE_COLORS[data.type].border,
      }}
    >
      <div className="flex items-center gap-2">
        <data.icon size={14} className={STAGE_COLORS[data.type].text} />
        <span className="text-xs font-semibold text-text-primary">{data.label}</span>
      </div>
      <p className="mt-1 text-[10px] text-text-secondary line-clamp-2">{data.summary}</p>
    </motion.div>
  )
}

// Dagre layout helper
function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'LR') {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 120 })
  nodes.forEach((node) => g.setNode(node.id, { width: 200, height: 80 }))
  edges.forEach((edge) => g.setEdge(edge.source, edge.target))
  dagre.layout(g)
  return {
    nodes: nodes.map((node) => {
      const pos = g.node(node.id)
      return { ...node, position: { x: pos.x - 100, y: pos.y - 40 } }
    }),
    edges,
  }
}
```

### Pattern 4: Animated Edge with Flow Direction

**What:** SVG circle animating along edge path to show data flow direction
**When to use:** Edges between flow nodes

```typescript
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

function AnimatedFlowEdge(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX, sourceY: props.sourceY,
    targetX: props.targetX, targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  })

  return (
    <>
      <BaseEdge id={props.id} path={edgePath} style={{ stroke: 'oklch(72% 0.15 195 / 0.4)' }} />
      <circle r="4" fill="oklch(72% 0.15 195)">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  )
}
```

### Pattern 5: File Tree (Custom, Lightweight)

**What:** Recursive collapsible tree matching Zenith dark theme
**When to use:** Code section sidebar for browsing analyzed codebase files

```typescript
// NO external dependency needed - build custom to match Zenith style
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

function FileTreeNode({ node, depth, onSelect, selectedPath }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isSelected = selectedPath === node.path
  const isDir = node.type === 'directory'

  return (
    <div>
      <button
        onClick={() => isDir ? setIsOpen(!isOpen) : onSelect(node.path)}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors
          ${isSelected ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <ChevronRight size={12} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        ) : (
          <FileCode size={12} />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && isOpen && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
          {node.children?.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1}
              onSelect={onSelect} selectedPath={selectedPath} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Adding a UI component library (shadcn, MUI, Ant Design):** Zenith uses custom Tailwind components everywhere. Introducing a component library would break visual consistency.
- **Using light/white backgrounds on cards or panels:** The entire app is dark-only. Always use `bg-surface`, `bg-surface-elevated`, or `bg-background`.
- **Hard-coding colors instead of using CSS variables:** Always use `var(--color-accent)`, `var(--color-border)`, etc., or the Tailwind tokens (`text-accent`, `bg-surface`, `border-border`). This ensures theme compatibility across all 12 themes.
- **Using `react-force-graph-2d` for the flow graph:** It is already installed but is designed for force-directed network layouts, not hierarchical pipeline flows. Use `@xyflow/react` instead.
- **Fat third-party file tree libraries:** Libraries like react-arborist add unnecessary weight and styling conflicts. A custom recursive component is simpler and consistent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Node graph rendering | Custom SVG/Canvas graph | `@xyflow/react` | Panning, zooming, node dragging, edge routing, minimap, controls are extremely hard to build correctly |
| Graph layout algorithm | Manual node positioning | `dagre` | Computing non-overlapping hierarchical positions is a well-studied graph theory problem |
| Syntax highlighting | Custom tokenizer | `highlight.js` (already available) or CodeMirror 6 extensions | Hundreds of language grammars maintained by community |
| Markdown rendering | Custom parser | Existing `MarkdownRenderer.tsx` | Already handles fences, headers, lists, tables, mermaid diagrams |
| PDF export | Custom PDF generation | `pdfmake` (already available) | Complex page layout, fonts, images in PDFs |
| Resizable panels | Custom drag handlers | `react-resizable-panels` (already available) | Handles resize constraints, persistence, accessibility |
| Icon system | Custom SVGs | `lucide-react` (already available) | 1000+ icons, consistent style, tree-shakeable |

## Common Pitfalls

### Pitfall 1: React Flow CSS Import Missing

**What goes wrong:** Graph renders but nodes overlap, controls invisible, no styling
**Why it happens:** React Flow v12 requires its CSS to be imported explicitly
**How to avoid:** Import `@xyflow/react/dist/style.css` at the top of the graph component. Override React Flow's default light-theme colors with Zenith's dark tokens.
**Warning signs:** Nodes stacked at (0,0), white backgrounds on controls

### Pitfall 2: React Flow Container Height

**What goes wrong:** Graph is invisible (0px height)
**Why it happens:** ReactFlow component requires a parent with explicit height; `height: 100%` only works if parent chain has height
**How to avoid:** Wrap ReactFlow in a div with `className="h-full w-full"` and ensure every parent up to the plugin view has `h-full` or explicit height set.
**Warning signs:** Component mounts but nothing visible; no errors in console

### Pitfall 3: Old Package Name (`reactflow` vs `@xyflow/react`)

**What goes wrong:** Installing `reactflow` gets you v11 (2 years old), which doesn't support React 19
**Why it happens:** Package was renamed in v12
**How to avoid:** Always use `npm install @xyflow/react` (NOT `npm install reactflow`)
**Warning signs:** TypeScript errors about incompatible React types

### Pitfall 4: Framer Motion + React Flow Conflict

**What goes wrong:** Wrapping ReactFlow nodes in motion.div causes layout issues
**Why it happens:** React Flow manages node positions via CSS transforms; framer-motion also applies transforms
**How to avoid:** Use framer-motion only for the CONTENT inside custom nodes, not for the node wrapper itself. Apply `whileHover` to an inner container, not the `<Handle>` or node root.
**Warning signs:** Nodes jump to wrong positions on hover, handles disconnect

### Pitfall 5: Theme Mismatch with React Flow Default Styles

**What goes wrong:** React Flow controls/background appear with light theme colors on Zenith's dark background
**Why it happens:** React Flow ships with light theme defaults
**How to avoid:** Override CSS variables:
```css
.react-flow {
  --xy-background-color: var(--color-background);
  --xy-node-border: var(--color-border);
  --xy-minimap-background: var(--color-surface);
  --xy-controls-button-background: var(--color-surface-elevated);
  --xy-controls-button-color: var(--color-text-primary);
}
```
**Warning signs:** White/light-gray elements appearing in the graph area

### Pitfall 6: Skeleton Loader Animation Performance

**What goes wrong:** Multiple skeleton loaders cause jank
**Why it happens:** CSS `animate-pulse` on many elements simultaneously
**How to avoid:** Use a single shimmer gradient animation with CSS `background-position` animation instead of opacity pulse. Limit skeleton elements to 3-5 placeholder shapes.
**Warning signs:** Dropped frames during loading states

### Pitfall 7: CodeMirror in Multiple Tabs

**What goes wrong:** Only the first tab's CodeMirror instance works; others have scroll/focus issues
**Why it happens:** CodeMirror instances that are invisible (display:none) when created don't calculate dimensions
**How to avoid:** Use conditional rendering (mount/unmount) rather than show/hide for CodeMirror tabs, OR call `view.requestMeasure()` when a tab becomes visible. The existing QueryTab.tsx in DbInspector already solves this -- follow that pattern.
**Warning signs:** Empty or mis-sized editor after switching tabs

## Code Examples

### React Flow Dark Theme Integration

```typescript
// Source: React Flow docs + Zenith theme system
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

function CodeFlowGraph({ nodes, edges }: GraphProps) {
  return (
    <div className="h-full w-full rounded-xl border border-border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="[--xy-background-color:var(--color-background)]"
      >
        <Background
          color="oklch(20% 0 0)"
          gap={20}
          size={1}
        />
        <Controls
          className="[&_button]:!bg-surface-elevated [&_button]:!border-border [&_button]:!text-text-primary [&_button:hover]:!bg-surface"
        />
        <MiniMap
          style={{ background: 'var(--color-surface)' }}
          maskColor="oklch(10% 0 0 / 0.7)"
          nodeColor="oklch(72% 0.15 195 / 0.5)"
        />
      </ReactFlow>
    </div>
  )
}
```

### Staggered Card Entrance Animation (Insights Dashboard)

```typescript
// Source: Zenith pattern (StatsCards + PluginCard) + framer-motion
import { motion } from 'framer-motion'

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
  }),
}

function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight, i) => (
        <motion.div
          key={insight.id}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={i}
          className="hover-lift rounded-xl border border-border/60 bg-surface-elevated/70 p-5"
        >
          {/* ... card content ... */}
        </motion.div>
      ))}
    </div>
  )
}
```

### Tab Transition with AnimatePresence

```typescript
// Source: framer-motion docs + Zenith animate-tab-enter pattern
import { AnimatePresence, motion } from 'framer-motion'

function TabContent({ activeTab }: { activeTab: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full"
      >
        {activeTab === 'insights' && <InsightsPanel />}
        {activeTab === 'code' && <CodePanel />}
        {activeTab === 'qa' && <QAPanel />}
        {activeTab === 'repos' && <RepoManager />}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Skeleton Loading State

```typescript
// Source: Tailwind animate-pulse pattern, matching Zenith dark theme
function InsightCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-surface-elevated/50 p-5 animate-pulse">
      {/* Icon placeholder */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg bg-surface" />
        <div className="h-4 w-32 rounded bg-surface" />
      </div>
      {/* Text lines */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-surface" />
        <div className="h-3 w-4/5 rounded bg-surface" />
        <div className="h-3 w-3/5 rounded bg-surface" />
      </div>
    </div>
  )
}

// Usage: show 6 skeletons while loading
function InsightsPanel({ isLoading, insights }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <InsightCardSkeleton key={i} />)}
      </div>
    )
  }
  return /* ... real content ... */
}
```

### Repository Card with Status

```typescript
function RepoCard({ repo }: { repo: Repository }) {
  const statusStyles = {
    analyzing: 'border-warning/30 bg-warning-muted',
    ready: 'border-success/30 bg-success-muted',
    error: 'border-error/30 bg-error-muted',
    idle: 'border-border/60 bg-surface-elevated/70',
  }

  return (
    <motion.div
      layout
      className={`rounded-xl border p-4 transition-colors ${statusStyles[repo.status]}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderGit2 size={16} className="text-accent" />
          <div>
            <h4 className="text-sm font-semibold text-text-primary">{repo.name}</h4>
            <p className="text-[10px] text-text-secondary">{repo.branch}</p>
          </div>
        </div>
        {repo.status === 'analyzing' && (
          <Loader2 size={14} className="animate-spin text-warning" />
        )}
        {repo.status === 'ready' && (
          <CheckCircle size={14} className="text-success" />
        )}
        {repo.status === 'error' && (
          <AlertCircle size={14} className="text-error" />
        )}
      </div>
      {repo.status === 'analyzing' && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-surface">
            <motion.div
              className="h-full rounded-full bg-warning"
              initial={{ width: '0%' }}
              animate={{ width: `${repo.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-1 text-[10px] text-text-secondary">{repo.progressLabel}</p>
        </div>
      )}
    </motion.div>
  )
}
```

### Q&A Chat Interface

```typescript
function QAPanel() {
  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-accent/15 text-text-primary'
                : 'border border-border/60 bg-surface-elevated text-text-primary'
            }`}>
              {msg.role === 'assistant' ? (
                <MarkdownRenderer text={msg.content} />
              ) : (
                msg.content
              )}
              {/* Source file citations */}
              {msg.sources?.map((src) => (
                <button key={src.path}
                  className="mt-2 flex items-center gap-1 text-[10px] text-accent/70 hover:text-accent">
                  <FileCode size={10} /> {src.path}:{src.line}
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      {/* Input area */}
      <div className="border-t border-border bg-surface p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2">
          <Search size={14} className="text-text-secondary" />
          <input
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
            placeholder="Ask about the codebase..."
          />
          <button className="rounded-md bg-accent/15 p-1.5 text-accent hover:bg-accent/25">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Export Dialog

```typescript
function ExportDialog({ sections, onExport, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<'md' | 'pdf' | 'txt'>('md')
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(sections.map(s => s.id)))

  const formats = [
    { id: 'md', label: 'Markdown', icon: FileText },
    { id: 'pdf', label: 'PDF', icon: FileDown },
    { id: 'txt', label: 'Plain Text', icon: AlignLeft },
  ] as const

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="w-[480px] rounded-xl border border-border bg-surface p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-text-primary">Export Documentation</h2>

        {/* Format selector */}
        <div className="mt-4 flex gap-2">
          {formats.map(({ id, label, icon: Icon }) => (
            <button key={id}
              onClick={() => setFormat(id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                format === id
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:border-accent/20'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Section checkboxes */}
        <div className="mt-4 space-y-2">
          {sections.map((section) => (
            <label key={section.id} className="flex items-center gap-2 text-sm text-text-primary">
              <input type="checkbox" checked={selectedSections.has(section.id)}
                onChange={(e) => { /* toggle logic */ }}
                className="rounded border-border accent-accent"
              />
              {section.title}
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs text-text-secondary hover:text-text-primary">
            Cancel
          </button>
          <button onClick={() => onExport(format, selectedSections)}
            className="rounded-lg bg-accent/15 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/25">
            Export
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
```

## Animations Specification

### 1. Page Transitions (Insights <-> Code)

Use `AnimatePresence mode="wait"` with framer-motion:
- Exit: fade out + slide up 4px (200ms)
- Enter: fade in + slide down 6px (250ms, ease-out)
- Matches existing `animate-page-enter` CSS animation pattern

### 2. Node Graph Entrance

When flow graph first renders:
- Nodes: staggered fade-in with scale (0.8 -> 1.0), 60ms delay between nodes
- Edges: after all nodes visible, edges draw in using SVG `stroke-dashoffset` animation (300ms per edge)
- Flow dots: start animating along edges after edge draw completes

```css
/* Edge draw-in animation */
.react-flow__edge-path {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: edge-draw 0.5s ease-out forwards;
}
@keyframes edge-draw {
  to { stroke-dashoffset: 0; }
}
```

### 3. Progress Animation (Repo Analysis)

- Indeterminate: shimmer gradient moving left-to-right on a bar
- Determinate: smooth width transition with framer-motion `animate={{ width }}`
- Status text fades between stages

### 4. Hover Effects on Flow Nodes

- Scale to 1.05 on hover (framer-motion `whileHover`)
- Show tooltip with summary text (use existing Zenith tooltip pattern from Sidebar.tsx)
- Subtle glow: `box-shadow: 0 0 12px var(--color-accent-glow)`

### 5. Skeleton Loading

- Use `animate-pulse` from Tailwind for simple skeletons
- For the graph area: show a stylized placeholder with faded node shapes and connecting lines

## Layout Architecture

### Main View Layout

```
+------------------------------------------------------+
| [Insights] [Code] [Ask] [Repos]  tab bar             |
+------------------------------------------------------+
|                                                      |
|  [Active Tab Content - full height]                  |
|                                                      |
+------------------------------------------------------+
```

### Insights Tab Layout

```
+------------------------------------------------------+
| Insights Dashboard                          [Export]  |
+-------------------+------------------+---------------+
| Overview Card     | API List Card    | Design Doc    |
| (click=expand)    | (click=expand)   | (click=expand)|
+-------------------+------------------+---------------+
| Dependencies Card | Architecture     | Stats Card    |
|                   | Card             |               |
+-------------------+------------------+---------------+
```

### Code Tab Layout (Resizable Panels)

```
+----------+-------------------------------------------+
| File Tree| Code Flow Graph (React Flow)              |
| (left    |  [Controller] -> [Service] -> [Repo] -> [DB]
| sidebar) |                                           |
|          +-------------------------------------------+
|          | [tab1.ts] [tab2.ts] [tab3.ts]   code tabs |
|          +-------------------------------------------+
|          | CodeMirror 6 Viewer                        |
|          | (read-only, syntax highlighted)            |
+----------+-------------------------------------------+
```

Use `react-resizable-panels` for:
- File tree sidebar (left) vs main content (right): `PanelGroup direction="horizontal"`
- Graph (top) vs code viewer (bottom) in main content: `PanelGroup direction="vertical"`

## Reference Design Inspiration

| Reference | What to Borrow | What to Avoid |
|-----------|---------------|---------------|
| GitHub Dependency Graph | Node connection visual style, hover cards showing package info | Light theme, static rendering (no animations) |
| Sourcegraph Code Intelligence | "Find references" panel, file-path breadcrumbs, code highlighting | Complex search UI (overkill for this plugin) |
| VS Code Call Hierarchy | Hierarchical tree for call chains, peek-definition inline view | Native OS styling (doesn't apply to web) |
| Mermaid Live Editor | Split panel (source left, preview right) for documentation editing | Plain white background, no animations |

## Sources

### Primary (HIGH confidence)
- [React Flow Official Docs](https://reactflow.dev) - Package name, version, CSS import requirements, custom nodes, animated edges
- [React Flow Layout Examples](https://reactflow.dev/examples/layout/dagre) - Dagre integration pattern
- [React Flow Edge Animation](https://reactflow.dev/examples/edges/animating-edges) - SVG animateMotion technique
- [@xyflow/react on npm](https://www.npmjs.com/package/@xyflow/react) - v12.10.1 latest
- Zenith codebase (local files) - Design system, existing patterns, available dependencies

### Secondary (MEDIUM confidence)
- [Motion (framer-motion) docs](https://motion.dev/docs/react-animation) - AnimatePresence, variants, layout animations
- [react-arborist](https://github.com/brimdata/react-arborist) - Evaluated and rejected in favor of custom component

### Design Decisions (HIGH confidence - from codebase analysis)
- Zenith uses oklch color tokens exclusively (12 themes)
- All plugins follow the same registration pattern via `registry.ts`
- Tabs use the `bg-accent/15 text-accent` active pattern
- Cards use `hover-lift` class + `rounded-xl border border-border/60 bg-surface-elevated/70`
- Framer-motion is used for Reorder in Sidebar, motion animations in Nebula plugin
- CodeMirror 6 with one-dark theme is the standard code editor
- MarkdownRenderer handles all generated documentation display

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - React Flow is the clear leader; dagre recommended by their docs
- Architecture: HIGH - Follows proven patterns from existing Zenith plugins
- Animations: HIGH - framer-motion already in use; React Flow edge animations documented
- Pitfalls: HIGH - Based on known issues from React Flow docs and local codebase patterns

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (30 days - stable ecosystem)
