# Cortex UI/UX Revamp Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Cortex plugin from a utilitarian data dashboard into a premium, engaging dev tool with glass-morphism cards, bento grid layouts, spring animations, flowing particle edges, and a 3D force-directed MindGraph.

**Architecture:** Visual-only changes across 25+ component files. No backend/store logic changes. New shared theme file (`cortex-theme.ts`) provides consistent design tokens. Three.js added only for MindGraph tab (lazy-loaded, separate chunk). All other tabs enhanced with glass-morphism + framer-motion spring animations using existing deps.

**Tech Stack:** React 19, TypeScript, framer-motion v12.5, @xyflow/react v12.10, three.js + @react-three/fiber + @react-three/drei (new), d3-force-3d (new), Tailwind CSS with OKLCh design tokens.

**Spec:** `docs/superpowers/specs/2026-03-16-cortex-ux-revamp-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/renderer/src/plugins/cortex/cortex-theme.ts` | Shared KIND_COLORS, METHOD_COLORS, glass CSS class constants, animation variants |
| `src/renderer/src/plugins/cortex/components/MindGraph3D.tsx` | Three.js 3D force graph (loaded inside MindGraphTab) |
| `src/renderer/src/plugins/cortex/components/DonutChart.tsx` | SVG donut/ring chart for language breakdown |
| `src/renderer/src/plugins/cortex/components/RingProgress.tsx` | SVG circular progress ring for test coverage |

### Modified Files (by wave)
| Wave | File | Change Scope |
|------|------|-------------|
| 1 | `package.json` | Add 4 new deps |
| 1 | `src/renderer/src/assets/main.css` | Add keyframes + utility classes |
| 1 | `cortex-theme.ts` | Create shared tokens |
| 1 | `CortexView.tsx` (254 lines) | Glass header, pill tabs, sliding indicator |
| 1 | `InsightsPanel.tsx` (130 lines) | Pill sub-tabs with sliding indicator |
| 2 | `OverviewTab.tsx` (435 lines) | Bento glass grid, donut chart, pill badges |
| 2 | `DonutChart.tsx` | New — SVG donut with animation |
| 2 | `RingProgress.tsx` | New — SVG ring with animation |
| 2 | `TestCoverageCard.tsx` (162 lines) | Use RingProgress instead of flat display |
| 2 | `DiagramsTab.tsx` (388 lines) | Glass nodes, animated edges, pill sub-tabs |
| 2 | `FlowNode.tsx` (266 lines) | Glass card, gradient borders, glow hover |
| 2 | `FlowEdge.tsx` (113 lines) | Glow filter, type-based styles |
| 2 | `FlowDiagram.tsx` (113 lines) | Glass controls, dot background, radial glow |
| 2 | `FlowsTab.tsx` (303 lines) | Glass toolbar, pill selectors |
| 2 | `MindGraphTab.tsx` (520 lines) | 3D rewrite with fallback |
| 2 | `MindGraph3D.tsx` | New — Three.js force graph |
| 3 | `APIListTab.tsx` (259 lines) | Grouped endpoints, filter bar, glass cards |
| 3 | `CodePanel.tsx` (95 lines) | Glass sidebar, styled resize handle |
| 3 | `FileTree.tsx` (443 lines) | Tree lines, colored icons, glass hover |
| 3 | `CodeTabs.tsx` | Glass tab bar, accent indicator |
| 3 | `CodeViewer.tsx` | Theme alignment |
| 3 | `RepoCard.tsx` (221 lines) | Glass card, gradient border, animations |
| 3 | `RepoManager.tsx` | Staggered grid entrance |
| 3 | `AddRepoDialog.tsx` | Glass modal |
| 3 | `AnalysisProgress.tsx` | Segmented bar |
| 4 | `QAPanel.tsx` (413 lines) | Glass messages, typing indicator |
| 4 | `ArchitectureDashboard.tsx` | Light glass polish |
| 4 | `ValidationPanel.tsx` | Light glass polish |
| 4 | `DesignDocTab.tsx` | Light glass polish |
| 4 | `ExportDialog.tsx` | Glass modal styling |

---

## Chunk 1: Foundation — Dependencies, CSS, Theme, Shell

### Task 1: Install New Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install three.js ecosystem and d3-force-3d**

```bash
cd /Users/prafullsaxena/Desktop/Development/zenith
npm install three @react-three/fiber @react-three/drei d3-force-3d
npm install -D @types/three
```

- [ ] **Step 2: Verify installation**

```bash
npx electron-vite build 2>&1 | tail -3
```
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add three.js, react-three-fiber, drei, d3-force-3d for Cortex 3D graph"
```

---

### Task 2: Add CSS Keyframes and Utility Classes

**Files:**
- Modify: `src/renderer/src/assets/main.css`

- [ ] **Step 1: Add new keyframes after existing keyframe block**

Find the last `@keyframes` block in main.css (around line 900+) and append these new keyframes and the `@property` declaration:

```css
/* Cortex UI/UX revamp — new keyframes */

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

@keyframes ring-progress {
  from { stroke-dashoffset: var(--ring-circumference); }
  to { stroke-dashoffset: var(--ring-target); }
}
```

- [ ] **Step 2: Verify build**

```bash
npx electron-vite build 2>&1 | tail -3
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/assets/main.css
git commit -m "style: add Cortex revamp keyframes (border-rotate, typing-dot, shimmer, donut-fill, ring-progress)"
```

---

### Task 3: Create Shared Cortex Theme File

**Files:**
- Create: `src/renderer/src/plugins/cortex/cortex-theme.ts`

- [ ] **Step 1: Create the theme file with all shared tokens**

```typescript
/**
 * cortex-theme.ts — Shared design tokens for the Cortex plugin.
 * KIND_COLORS are fixed across themes for entity recognition consistency.
 */

export interface KindColorSet {
  bg: string
  border: string
  text: string
  glow: string
}

export const KIND_COLORS: Record<string, KindColorSet> = {
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

export function getKindColor(kind: string): KindColorSet {
  return KIND_COLORS[kind] ?? KIND_COLORS.default
}

export interface MethodColorSet {
  bg: string
  text: string
  border: string
}

export const METHOD_COLORS: Record<string, MethodColorSet> = {
  GET:    { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  POST:   { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  PUT:    { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  DELETE: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  PATCH:  { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  ALL:    { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
}

export function getMethodColor(method: string): MethodColorSet {
  return METHOD_COLORS[method] ?? METHOD_COLORS.ALL
}

/** Glass card class string — use on any surface card */
export const GLASS_CARD = 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl'

/** Glass surface class string — use on panels, toolbars */
export const GLASS_SURFACE = 'bg-surface-elevated/50 backdrop-blur-xl border-b border-border/40'

/** Staggered card entrance variants for framer-motion */
export const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  })
}

/** Reduced-motion-aware card variants */
export function useCardVariants(reducedMotion: boolean): typeof cardVariants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 0, y: 0, scale: 1 },
      visible: () => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.15 }
      })
    }
  }
  return cardVariants
}

/** Repo type gradient colors for card top borders */
export const REPO_TYPE_GRADIENTS: Record<string, string> = {
  backend: 'from-blue-500 to-cyan-400',
  frontend: 'from-purple-500 to-pink-400',
  'data-engineering': 'from-amber-500 to-orange-400',
  fullstack: 'from-green-500 to-emerald-400',
  unknown: 'from-gray-500 to-slate-400',
}
```

- [ ] **Step 2: Verify build**

```bash
npx electron-vite build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/plugins/cortex/cortex-theme.ts
git commit -m "feat(cortex): add shared theme tokens (KIND_COLORS, METHOD_COLORS, glass classes, animation variants)"
```

---

### Task 4: Revamp CortexView Shell

**Files:**
- Modify: `src/renderer/src/plugins/cortex/CortexView.tsx` (254 lines)

- [ ] **Step 1: Read the current file**

Read `src/renderer/src/plugins/cortex/CortexView.tsx` fully to understand the current structure.

- [ ] **Step 2: Update imports**

Add the cortex-theme import and ensure `motion` is imported from framer-motion. Add `AnimatePresence` if not already imported.

```typescript
import { GLASS_SURFACE } from './cortex-theme'
```

- [ ] **Step 3: Refactor the header section**

Replace the current header div with a glass surface bar:
- Background: `GLASS_SURFACE` class
- Repo name: add `bg-gradient-to-r from-text-primary to-accent bg-clip-text text-transparent` for gradient text effect
- Branch badge: add a small status dot before the branch text that uses CSS `status-pulse` animation when status is `ready`, `animate-spin` for `analyzing`

- [ ] **Step 4: Refactor the tab bar to pill-style with sliding indicator**

Replace the current tab buttons with pill-style tabs using framer-motion `layoutId`:

```tsx
{TABS.map((tab) => {
  const Icon = tab.icon
  const isActive = activeTab === tab.id
  return (
    <button
      key={tab.id}
      type="button"
      onClick={() => setActiveTab(tab.id)}
      className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="cortex-main-tab"
          className="absolute inset-0 rounded-lg bg-accent/12"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        <Icon size={14} />
        {tab.label}
      </span>
    </button>
  )
})}
```

- [ ] **Step 5: Ensure tab content uses AnimatePresence with consistent animation**

Wrap the tab content switch in `AnimatePresence mode="wait"`:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="flex-1 overflow-hidden"
  >
    {/* tab content */}
  </motion.div>
</AnimatePresence>
```

- [ ] **Step 6: Polish the status bar**

Update the bottom status bar with glass styling, use `AnimatedCounter` for numeric values, and add the pulsing status dot.

- [ ] **Step 7: Verify build**

```bash
npx electron-vite build 2>&1 | tail -3
```

- [ ] **Step 8: Commit**

```bash
git add src/renderer/src/plugins/cortex/CortexView.tsx
git commit -m "feat(cortex): revamp shell — glass header, pill tabs with sliding indicator, polished status bar"
```

---

### Task 5: Revamp InsightsPanel Sub-Tabs

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/InsightsPanel.tsx` (130 lines)

- [ ] **Step 1: Read the current file**

Read `InsightsPanel.tsx` to understand the current sub-tab structure.

- [ ] **Step 2: Apply pill-style sub-tabs with sliding indicator**

Same pattern as CortexView but with `text-[10px]` size and `layoutId="cortex-insight-tab"`:

```tsx
{SUB_TABS.map((tab) => {
  const Icon = tab.icon
  const isActive = activeSubTab === tab.id
  return (
    <button
      key={tab.id}
      type="button"
      onClick={() => setActiveSubTab(tab.id)}
      className={`relative flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors ${
        isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="cortex-insight-tab"
          className="absolute inset-0 rounded-lg bg-accent/12"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1">
        <Icon size={12} />
        {tab.label}
      </span>
    </button>
  )
})}
```

- [ ] **Step 3: Wrap sub-tab content in AnimatePresence**

Same `AnimatePresence mode="wait"` pattern with `opacity + y:6` animation.

- [ ] **Step 4: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/InsightsPanel.tsx
git commit -m "feat(cortex): revamp insight sub-tabs — pill style with sliding indicator"
```

---

## Chunk 2: Tier 1 Surfaces — Overview, Diagrams, Flows

### Task 6: Create DonutChart Component

**Files:**
- Create: `src/renderer/src/plugins/cortex/components/DonutChart.tsx`

- [ ] **Step 1: Create the SVG donut chart component**

```tsx
/**
 * DonutChart — Animated SVG donut/ring chart for language breakdown.
 */
import { useMemo } from 'react'

interface Segment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: Segment[]
  size?: number
  strokeWidth?: number
  className?: string
}

export default function DonutChart({ segments, size = 120, strokeWidth = 14, className = '' }: Props): React.JSX.Element {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const arcs = useMemo(() => {
    let offset = 0
    return segments
      .filter((s) => total > 0 && (s.value / total) * 100 >= 0.5)
      .map((s) => {
        const pct = s.value / total
        const dashLength = pct * circumference
        const arc = { ...s, pct, dashLength, offset }
        offset += dashLength
        return arc
      })
  }, [segments, total, circumference])

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              animation: 'donut-fill 0.8s ease-out forwards',
              ['--circumference' as string]: circumference,
              ['--target-offset' as string]: -arc.offset
            }}
          >
            <title>{`${arc.label}: ${(arc.pct * 100).toFixed(1)}%`}</title>
          </circle>
        ))}
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-text-primary">{segments.length}</span>
        <span className="text-[8px] uppercase tracking-wide text-text-secondary">langs</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/DonutChart.tsx
git commit -m "feat(cortex): add animated SVG DonutChart component for language breakdown"
```

---

### Task 7: Create RingProgress Component

**Files:**
- Create: `src/renderer/src/plugins/cortex/components/RingProgress.tsx`

- [ ] **Step 1: Create the SVG ring progress component**

```tsx
/**
 * RingProgress — Animated circular progress ring for test coverage etc.
 */
import AnimatedCounter from './AnimatedCounter'

interface Props {
  value: number      // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  className?: string
}

export default function RingProgress({ value, size = 80, strokeWidth = 6, color = '#34d399', label, className = '' }: Props): React.JSX.Element {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            animation: 'ring-progress 1s ease-out forwards',
            ['--ring-circumference' as string]: circumference,
            ['--ring-target' as string]: offset
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedCounter value={Math.round(value)} className="text-sm font-bold text-text-primary" />
        <span className="text-[7px] uppercase tracking-wide text-text-secondary">{label ?? '%'}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/RingProgress.tsx
git commit -m "feat(cortex): add animated SVG RingProgress component"
```

---

### Task 8: Revamp OverviewTab — Bento Glass Grid

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/OverviewTab.tsx` (435 lines)

- [ ] **Step 1: Read the current file fully**

Read `OverviewTab.tsx` to understand all sections: stats cards, language breakdown, documentation, markdown files, entity breakdown, test coverage.

- [ ] **Step 2: Update imports**

Add imports for new components and theme:
```typescript
import { GLASS_CARD, getKindColor, useCardVariants } from '../cortex-theme'
import DonutChart from './DonutChart'
import RingProgress from './RingProgress'
```

- [ ] **Step 3: Replace useCardVariants with the shared version**

Remove the local `useCardVariants` function and use the one from cortex-theme:
```typescript
const reducedMotion = usePrefersReducedMotion()
const variants = useCardVariants(reducedMotion)
```

- [ ] **Step 4: Revamp stat cards with glass styling**

Replace existing stat card divs with glass cards that have a colored gradient accent line at top:

```tsx
<motion.div
  key={card.label}
  custom={i}
  initial="hidden"
  animate="visible"
  variants={variants}
  className={`${GLASS_CARD} relative overflow-hidden p-4`}
>
  {/* Gradient accent line */}
  <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${card.accentFrom}, ${card.accentTo})` }} />
  <div className="flex items-center gap-2">
    <Icon size={14} className={card.color} />
    <span className="text-[10px] uppercase tracking-wide text-text-secondary">{card.label}</span>
  </div>
  <p className="mt-2 text-2xl font-bold text-text-primary">
    <AnimatedCounter value={card.value} />
  </p>
</motion.div>
```

- [ ] **Step 5: Replace language bars with DonutChart**

Replace the horizontal bar charts with the DonutChart component:

```tsx
<DonutChart
  segments={sourceLanguages.map((l) => ({
    label: l.language,
    value: l.lineCount,
    color: LANGUAGE_COLORS[l.language] ?? LANGUAGE_COLORS.Other
  }))}
  size={120}
  strokeWidth={14}
/>
```

Keep the legend dots below the donut.

- [ ] **Step 6: Revamp entity breakdown with glass pill badges**

Replace the grid of boxes with a horizontal flex-wrap row of glass pills:

```tsx
<div className="flex flex-wrap gap-2">
  {stats.entityCount.map((entity) => {
    const colors = getKindColor(entity.kind)
    return (
      <motion.button
        key={entity.kind}
        whileHover={{ y: -1 }}
        onClick={/* navigate to first entity */}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5"
        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
      >
        <span className="text-sm font-bold" style={{ color: colors.text }}>{entity.count}</span>
        <span className="text-[10px] capitalize" style={{ color: colors.text, opacity: 0.7 }}>
          {entity.kind === 'dag' ? 'DAGs' : `${entity.kind}s`}
        </span>
      </motion.button>
    )
  })}
</div>
```

- [ ] **Step 7: Update documentation and markdown file sections with glass cards**

Apply `GLASS_CARD` class to the documentation container and each markdown file accordion item. Ensure the expand/collapse uses `AnimatePresence` with smooth height transition.

- [ ] **Step 8: Replace TestCoverageCard with RingProgress**

In the test coverage section, update `TestCoverageCard` to accept and use `RingProgress` (this will be done in Task 9 below — for now just ensure the section uses `GLASS_CARD` styling).

- [ ] **Step 9: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/OverviewTab.tsx
git commit -m "feat(cortex): revamp OverviewTab — bento glass grid, donut chart, pill entity badges"
```

---

### Task 9: Revamp TestCoverageCard with RingProgress

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/TestCoverageCard.tsx` (162 lines)

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Add RingProgress import and refactor**

Replace the flat percentage display with `RingProgress`:
```typescript
import RingProgress from './RingProgress'
import { GLASS_CARD } from '../cortex-theme'
```

Use `RingProgress` for the main coverage percentage and apply `GLASS_CARD` to the card container.

- [ ] **Step 3: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/TestCoverageCard.tsx
git commit -m "feat(cortex): revamp TestCoverageCard with SVG ring progress"
```

---

### Task 10: Revamp DiagramsTab — Glass Nodes, Animated Edges

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/DiagramsTab.tsx` (388 lines)

- [ ] **Step 1: Read the current file fully**

- [ ] **Step 2: Update imports**

```typescript
import { getKindColor, GLASS_SURFACE } from '../cortex-theme'
```

- [ ] **Step 3: Refactor sub-tab bar to pill style with sliding indicator**

Same pill pattern as InsightsPanel but with `layoutId="cortex-diagram-tab"`.

- [ ] **Step 4: Update buildEntityGraph node styles to glass**

Replace the inline `style` objects on nodes with glass-morphism styling:

```typescript
style: {
  background: color.bg,
  border: `1px solid ${color.border}`,
  borderRadius: 14,
  padding: '10px 16px',
  fontSize: 11,
  color: '#e2e8f0',
  fontWeight: 600,
  whiteSpace: 'pre-line',
  backdropFilter: 'blur(8px)',
  boxShadow: `0 4px 20px ${color.glow}`
}
```

Where `color = getKindColor(e.kind)`.

- [ ] **Step 5: Update buildLayerGraph with glass swim-lane headers**

Apply glass styling to layer header nodes (dashed border, kind color text, smaller size) and glass cards for member nodes.

- [ ] **Step 6: Update buildDependencyGraph — glass nodes, rotating center border**

Apply glass styling to the central project node. Add `animation: 'border-rotate 4s linear infinite'` to the center node's style for the rotating border effect.

- [ ] **Step 7: Update edge styles with glow and animation**

Add `filter: 'url(#glow)'` or enhanced `style` with thicker strokes and dash animations for edges.

- [ ] **Step 8: Update ReactFlow container**

Change `Background` to `variant="dots"`. Add a radial gradient glow to the container div:
```tsx
<div className="flex-1 overflow-hidden relative">
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.03)_0%,transparent_70%)]" />
  <ReactFlow ...>
    <Background gap={20} size={1} color="#1e293b" variant="dots" />
    ...
  </ReactFlow>
</div>
```

- [ ] **Step 9: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/DiagramsTab.tsx
git commit -m "feat(cortex): revamp DiagramsTab — glass nodes, animated edges, pill sub-tabs, radial glow"
```

---

### Task 11: Revamp FlowNode — Glass Card with Glow

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/FlowNode.tsx` (266 lines)

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Update imports**

```typescript
import { getKindColor } from '../cortex-theme'
```

- [ ] **Step 3: Replace the node card styling**

Replace the current card div with glass-morphism styling. Use `getKindColor(data.kind)` for consistent colors:

- Glass background with `backdrop-blur-xl`
- Gradient left border (4px) matching kind color
- Entity kind icon in top-left corner
- Name (bold) + kind badge (tiny pill) + method count line
- Hover: `whileHover={{ scale: 1.02 }}` + boxShadow glow

- [ ] **Step 4: Update the tooltip overlay**

Glass-style tooltip with kind badge, summary text, and file path.

- [ ] **Step 5: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/FlowNode.tsx
git commit -m "feat(cortex): revamp FlowNode — glass card with kind-colored gradient border and glow hover"
```

---

### Task 12: Revamp FlowEdge — Glow Filter, Type-Based Styles

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/FlowEdge.tsx` (113 lines)

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Add SVG glow filter and type-based styling**

Add an SVG `<defs>` section with a `<filter id="edge-glow">` containing `feGaussianBlur`. Apply different styles per edge type:

- `inject`: animated dashed purple (`#8b5cf6`), thicker stroke (2px)
- `call`: solid with existing flowing dot, gradient stroke
- `inferred`: thin dotted gray (`#475569`), 1px stroke
- `import`: dashed blue, 1px stroke

- [ ] **Step 3: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/FlowEdge.tsx
git commit -m "feat(cortex): revamp FlowEdge — glow filter, type-based edge styles"
```

---

### Task 13: Revamp FlowDiagram — Glass Controls, Dot Background

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/FlowDiagram.tsx` (113 lines)

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Update Background to dots variant and add radial glow**

Same pattern as DiagramsTab: `variant="dots"` background, radial gradient glow overlay on the container.

- [ ] **Step 3: Style the Controls panel with glass**

```tsx
<Controls
  showInteractive={false}
  className="!bg-white/[0.03] !backdrop-blur-xl !border-white/[0.08] !rounded-xl [&>button]:!bg-transparent [&>button]:!border-white/[0.06] [&>button]:!text-text-secondary"
/>
```

- [ ] **Step 4: Style MiniMap with glass overlay**

```tsx
<MiniMap
  nodeColor={(n) => n.style?.borderColor ?? '#475569'}
  className="!bg-white/[0.03] !backdrop-blur-xl !border-white/[0.08] !rounded-xl"
/>
```

- [ ] **Step 5: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/FlowDiagram.tsx
git commit -m "feat(cortex): revamp FlowDiagram — dot background, radial glow, glass controls"
```

---

### Task 14: Revamp FlowsTab — Glass Toolbar

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/FlowsTab.tsx` (303 lines)

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Apply glass styling to top toolbar bar**

Replace border-b bar with `GLASS_SURFACE` class.

- [ ] **Step 3: Apply pill-style to FlowTypeSelector buttons**

Same sliding indicator pattern with `layoutId="cortex-flow-tab"`.

- [ ] **Step 4: Style endpoint selector dropdown with glass**

Apply glass background, border, accent focus ring to the `<select>`.

- [ ] **Step 5: Style validate button with glass pill**

- [ ] **Step 6: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/FlowsTab.tsx
git commit -m "feat(cortex): revamp FlowsTab — glass toolbar, pill flow-type selector"
```

---

## Chunk 3: MindGraph 3D Rewrite

### Task 15: Create MindGraph3D Component

**Files:**
- Create: `src/renderer/src/plugins/cortex/components/MindGraph3D.tsx`

- [ ] **Step 1: Create the 3D force graph component**

This is the largest new component. It uses react-three-fiber + d3-force-3d:

```tsx
/**
 * MindGraph3D — 3D force-directed graph using react-three-fiber.
 * Shows entities as glowing spheres connected by animated edges.
 */
import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import {
  forceSimulation as forceSimulation3d,
  forceManyBody as forceManyBody3d,
  forceLink as forceLink3d,
  forceCenter as forceCenter3d
} from 'd3-force-3d'
import * as THREE from 'three'
import { getKindColor } from '../cortex-theme'
import type { CodeEntity, CallEdge } from '../../../../types/cortex'

interface Props {
  entities: CodeEntity[]
  calls: CallEdge[]
  onNodeClick?: (entityId: string) => void
}

// ... (full implementation with ForceGraph3DScene, Node3D, Edge3D components)
// The component should:
// 1. Filter to top 200 entities by connection count
// 2. Run d3-force-3d simulation in useFrame
// 3. Render spheres with emissive materials colored by kind
// 4. Render Line edges between connected nodes
// 5. OrbitControls with auto-rotate when idle
// 6. Hover: highlight node + neighbors, dim others
// 7. Click: focus camera with smooth lerp
```

The full implementation should include:
- `ForceGraph3DScene` inner component (runs inside Canvas)
- Node mesh with `<sphereGeometry>` and `<meshStandardMaterial>` with emissive
- Edge lines using `<Line>` from drei
- `useFrame` loop for simulation tick and camera lerp
- Hover state with `onPointerOver`/`onPointerOut`
- Click handler to focus camera
- Node cap at 200 with "Showing top N" badge

- [ ] **Step 2: Verify build**

```bash
npx electron-vite build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/plugins/cortex/components/MindGraph3D.tsx
git commit -m "feat(cortex): add MindGraph3D — 3D force-directed graph with react-three-fiber"
```

---

### Task 16: Rewrite MindGraphTab with 3D + Fallback

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/MindGraphTab.tsx` (520 lines)

- [ ] **Step 1: Read the current file fully**

- [ ] **Step 2: Add ErrorBoundary for 3D fallback**

Create a local ErrorBoundary class component that catches Three.js errors and renders the 2D fallback:

```tsx
class Graph3DErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
```

- [ ] **Step 3: Lazy-import MindGraph3D**

```typescript
const MindGraph3D = React.lazy(() => import('./MindGraph3D'))
```

- [ ] **Step 4: Restructure render to try 3D first, fallback to 2D**

```tsx
<Graph3DErrorBoundary fallback={<FallbackGraph2D entities={entities} calls={calls} />}>
  <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-text-secondary">Loading 3D graph...</div>}>
    <MindGraph3D entities={entities} calls={calls} onNodeClick={handleNodeClick} />
  </Suspense>
</Graph3DErrorBoundary>
```

Where `FallbackGraph2D` is the existing react-force-graph-2d implementation, refactored into a sub-component with glass styling applied.

- [ ] **Step 5: Add glass controls overlay**

Glass panel in bottom-right with: node count badge, auto-rotate toggle, reset view button, "3D" / "2D" indicator.

- [ ] **Step 6: Add search input overlay**

Glass input in top-right for searching entity names.

- [ ] **Step 7: Keep existing 2D code as fallback, apply glass container**

Don't delete the existing force-graph-2d code — wrap it as the fallback component.

- [ ] **Step 8: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/MindGraphTab.tsx
git commit -m "feat(cortex): rewrite MindGraphTab — 3D force graph with 2D fallback"
```

---

## Chunk 4: Tier 2 Surfaces — APIs, Code, Repos

### Task 17: Revamp APIListTab — Grouped Endpoints, Filter Bar

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/APIListTab.tsx` (259 lines)

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Add imports**

```typescript
import { GLASS_CARD, GLASS_SURFACE, getMethodColor } from '../cortex-theme'
import { AnimatePresence } from 'framer-motion'
```

- [ ] **Step 3: Add filter state**

```typescript
const [methodFilter, setMethodFilter] = useState<Set<string>>(new Set())
const [searchQuery, setSearchQuery] = useState('')
```

- [ ] **Step 4: Add sticky filter bar**

Glass surface bar at top with:
- HTTP method toggle pills (GET, POST, PUT, DELETE, PATCH) — multi-select, clicking toggles filter
- Text search input with glass styling
- Results count badge

- [ ] **Step 5: Group endpoints by controller**

```typescript
const grouped = useMemo(() => {
  const groups = new Map<string, RouteInfo[]>()
  for (const route of filteredRoutes) {
    const key = route.controllerName || 'Ungrouped'
    const list = groups.get(key) ?? []
    list.push(route)
    groups.set(key, list)
  }
  return groups
}, [filteredRoutes])
```

- [ ] **Step 6: Render collapsible controller groups with glass cards per endpoint**

Each group: glass header with controller name, collapsible with `AnimatePresence`. Endpoints inside as glass card rows with method pill badge, path in mono, handler name muted.

- [ ] **Step 7: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/APIListTab.tsx
git commit -m "feat(cortex): revamp APIListTab — grouped by controller, filter bar, glass endpoint cards"
```

---

### Task 18: Revamp CodePanel + FileTree + CodeTabs

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/CodePanel.tsx` (95 lines)
- Modify: `src/renderer/src/plugins/cortex/components/FileTree.tsx` (443 lines)
- Modify: `src/renderer/src/plugins/cortex/components/CodeTabs.tsx`

- [ ] **Step 1: Read all three files**

- [ ] **Step 2: CodePanel — glass sidebar + styled resize handle**

Apply glass container to the sidebar div. Style the resize handle:
```tsx
<div
  className="flex w-2 cursor-col-resize items-center justify-center hover:bg-accent/10 transition-colors"
  onMouseDown={handleMouseDown}
>
  <div className="flex flex-col gap-1">
    <div className="h-1 w-1 rounded-full bg-text-secondary/30" />
    <div className="h-1 w-1 rounded-full bg-text-secondary/30" />
    <div className="h-1 w-1 rounded-full bg-text-secondary/30" />
  </div>
</div>
```

- [ ] **Step 3: FileTree — glass hover, colored icons, tree lines, active file accent**

- Add tree indent lines: `border-l border-border/30` on nested items
- Color file icons by extension (ts=`text-blue-400`, java=`text-amber-400`, py=`text-green-400`, etc.)
- Active file: `border-l-[3px] border-accent bg-accent/[0.06]`
- Hover: `hover:bg-white/[0.03]`

- [ ] **Step 4: CodeTabs — glass tab bar with accent bottom line**

Active tab: `border-b-2 border-accent`. Close X appears on hover with `opacity-0 group-hover:opacity-100`.

- [ ] **Step 5: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/CodePanel.tsx src/renderer/src/plugins/cortex/components/FileTree.tsx src/renderer/src/plugins/cortex/components/CodeTabs.tsx
git commit -m "feat(cortex): revamp Code tab — glass sidebar, tree lines, colored icons, styled resize handle"
```

---

### Task 19: Revamp RepoCard + RepoManager + AddRepoDialog + AnalysisProgress

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/RepoCard.tsx` (221 lines)
- Modify: `src/renderer/src/plugins/cortex/components/RepoManager.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/AddRepoDialog.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/AnalysisProgress.tsx`

- [ ] **Step 1: Read all four files**

- [ ] **Step 2: RepoCard — glass card with gradient top border**

Replace existing card styling with:
- `GLASS_CARD` base
- 3px gradient top border using `REPO_TYPE_GRADIENTS[repo.repoType]`
- Status dot with `status-pulse` CSS animation for ready state
- Hover: `whileHover={{ y: -2 }}` with shadow increase
- "Run AI Analysis" button: add shimmer background animation

```tsx
className="... bg-[length:400%_100%] animate-[shimmer_3s_infinite]"
style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.05), transparent)' }}
```

- [ ] **Step 3: RepoManager — staggered grid entrance**

Wrap the card grid in staggered animation with `cardVariants` from cortex-theme.

- [ ] **Step 4: AddRepoDialog — glass modal**

Apply `backdrop-blur-2xl` to overlay. Glass card for modal body. Accent focus ring on inputs.

- [ ] **Step 5: AnalysisProgress — segmented bar**

Replace single progress bar with segmented bar where each analysis phase gets a distinct colored segment. Phase label crossfades.

- [ ] **Step 6: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/RepoCard.tsx src/renderer/src/plugins/cortex/components/RepoManager.tsx src/renderer/src/plugins/cortex/components/AddRepoDialog.tsx src/renderer/src/plugins/cortex/components/AnalysisProgress.tsx
git commit -m "feat(cortex): revamp Repos tab — glass cards, gradient borders, shimmer button, segmented progress"
```

---

## Chunk 5: Tier 3 + Polish

### Task 20: Revamp QAPanel — Glass Messages, Typing Indicator

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/QAPanel.tsx` (413 lines)

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Style message bubbles**

- User messages: `GLASS_CARD` + `border-l-[3px] border-accent/40`
- AI responses: glass card with surface-elevated background
- Message entrance: `initial={{ opacity: 0, y: 8 }}` with 200ms animation

- [ ] **Step 3: Add typing indicator**

When AI is streaming, show three animated dots:
```tsx
<div className="flex items-center gap-1 px-4 py-2">
  {[0, 1, 2].map((i) => (
    <div
      key={i}
      className="h-1.5 w-1.5 rounded-full bg-accent"
      style={{ animation: `typing-dot 1.2s infinite ${i * 0.2}s` }}
    />
  ))}
</div>
```

- [ ] **Step 4: Style source citation pills**

Glass pill style with `FileText` icon, hover lifts.

- [ ] **Step 5: Style input bar**

Glass bottom bar. Accent focus ring on textarea. Submit button: `active:scale-95`.

- [ ] **Step 6: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/QAPanel.tsx
git commit -m "feat(cortex): revamp QAPanel — glass messages, typing indicator, styled citations"
```

---

### Task 21: Light Polish — ArchitectureDashboard, ValidationPanel, DesignDocTab, ExportDialog

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/ValidationPanel.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/DesignDocTab.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/ExportDialog.tsx`

- [ ] **Step 1: Read all four files**

- [ ] **Step 2: Apply glass styling to each**

For each file:
- Import `GLASS_CARD` and/or `GLASS_SURFACE` from cortex-theme
- Replace existing card/panel borders with glass classes
- Ensure consistent border-radius (rounded-2xl), text colors, and spacing

This is a light pass — no structural changes, just applying the glass token system.

- [ ] **Step 3: Verify build and commit**

```bash
npx electron-vite build 2>&1 | tail -3
git add src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx src/renderer/src/plugins/cortex/components/ValidationPanel.tsx src/renderer/src/plugins/cortex/components/DesignDocTab.tsx src/renderer/src/plugins/cortex/components/ExportDialog.tsx
git commit -m "feat(cortex): light polish — glass styling on Architecture, Validation, DesignDoc, Export"
```

---

### Task 22: Final Consistency Pass + Reduced Motion Verification

**Files:**
- All Cortex component files

- [ ] **Step 1: Full build verification**

```bash
npx electron-vite build 2>&1 | tail -5
```

- [ ] **Step 2: Grep for inconsistent color references**

Search for any remaining hardcoded `KIND_COLORS` or `REPO_TYPE_COLORS` definitions in component files that should now use the shared theme:

```bash
# Find any local KIND_COLORS still defined in components
grep -r "KIND_COLORS" src/renderer/src/plugins/cortex/components/ --include="*.tsx" -l
```

Replace any local definitions with imports from cortex-theme.

- [ ] **Step 3: Verify reduced motion support**

Grep for animation usage and ensure `usePrefersReducedMotion` is respected:
- All `motion.div` with `initial/animate` should use the shared `useCardVariants`
- MindGraph3D auto-rotate should respect reduced motion
- DonutChart/RingProgress animations should be skipped when reduced motion is on

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(cortex): final consistency pass — unified theme tokens, reduced motion verification"
```
