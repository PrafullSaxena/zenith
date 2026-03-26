# Architecture Research

**Domain:** UI Design System for Electron + React 19 + Tailwind v4 Desktop App
**Researched:** 2026-03-24
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Shell                            │
│  ┌──────────┐  ┌──────────────────────────────────────────────┐  │
│  │ Sidebar  │  │              Content Area                    │  │
│  │ (icons,  │  │  ┌────────────────────────────────────────┐  │  │
│  │  nav,    │  │  │         Plugin / Page View              │  │  │
│  │  reorder)│  │  │                                        │  │  │
│  └──────────┘  │  │  Uses: Glass Components + Motion + 3D  │  │  │
│                │  └────────────────────────────────────────┘  │  │
│                └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Design System Layer                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Component  │  │  Token     │  │  Motion    │  │   3D      │  │
│  │ Library    │  │  System    │  │  System    │  │  Layer    │  │
│  │ (Glass*)   │  │  (CSS vars │  │  (framer-  │  │  (R3F     │  │
│  │            │  │   + theme) │  │   motion)  │  │  + drei)  │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘  │
│        │               │               │               │         │
├────────┴───────────────┴───────────────┴───────────────┴─────────┤
│                       State Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ settings │  │ cortex   │  │ nebula   │  │  ...per  │         │
│  │ -store   │  │ -store   │  │ -store   │  │  plugin  │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
├─────────────────────────────────────────────────────────────────┤
│                    Electron / IPC Layer                           │
│  ┌──────────────────────┐  ┌──────────────────────┐              │
│  │  preload (bridge)    │  │  main (node, fs, db) │              │
│  └──────────────────────┘  └──────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Component Library** (`ui/`) | Shared Glass* primitives: GlassCard, GlassButton, GlassInput, GlassSelect, GlassTab, GlassBadge, GlassModal, GlassToast, GlassSkeleton, EmptyState | Token System (reads CSS vars), Motion System (embeds variants) |
| **Token System** (`main.css` + `@theme`) | CSS custom properties for color, typography, spacing, glass intensity. Theme switching via `[data-theme]` attribute on `<html>` | Settings Store (reads active theme), Component Library (provides variables) |
| **Motion System** (`lib/motion.ts`) | Shared framer-motion variant objects, transition presets, reduced-motion hooks. Centralizes all animation definitions | Component Library (components import variants), 3D Layer (shared easing curves) |
| **3D Layer** (per-visualization) | react-three-fiber Canvas wrappers with error boundaries and 2D fallbacks. Each 3D viz is a self-contained module | Component Library (GlassCard wraps Canvas), Token System (reads accent colors), State stores (reads data) |
| **Plugin Views** | Feature-specific screens consuming design system primitives | Component Library, Motion System, 3D Layer, own Zustand store |
| **Settings Store** | Theme selection, per-plugin config, persisted via Electron IPC | Token System (drives `data-theme`), App.tsx (applies attribute) |

## Recommended Project Structure

```
src/renderer/src/
├── ui/                          # DESIGN SYSTEM — shared components
│   ├── glass/                   # Glass morphism primitives
│   │   ├── GlassCard.tsx        # Card container (bg-white/[0.03] backdrop-blur-xl)
│   │   ├── GlassButton.tsx      # Button with press feedback (scale 0.97)
│   │   ├── GlassInput.tsx       # Input with focus glow
│   │   ├── GlassSelect.tsx      # Dropdown select
│   │   ├── GlassTab.tsx         # Tab with sliding underline
│   │   ├── GlassBadge.tsx       # Status/label badge
│   │   ├── GlassModal.tsx       # Modal overlay with backdrop blur
│   │   ├── GlassToast.tsx       # Toast notification
│   │   ├── GlassSkeleton.tsx    # Skeleton loading placeholder
│   │   └── index.ts             # Barrel export
│   ├── EmptyState.tsx           # Empty state with floating illustration
│   ├── ScrollShadow.tsx         # Scroll progress + edge shadows
│   └── index.ts                 # Barrel re-export of glass/* + extras
├── lib/                         # Utilities and shared logic
│   ├── motion.ts                # framer-motion variant presets
│   ├── use-reduced-motion.ts    # Hook: prefers-reduced-motion
│   ├── use-glass-style.ts       # Hook: computed glass classes from token values
│   └── theme-tokens.ts          # Theme metadata (names, previews for selector)
├── assets/
│   ├── main.css                 # @theme block, all [data-theme] overrides
│   ├── base.css                 # Resets
│   └── fonts/                   # woff2 files
├── components/                  # App shell + core pages (consume ui/)
│   ├── AppLayout.tsx
│   ├── Sidebar.tsx
│   ├── dashboard/
│   ├── settings/
│   ├── activity/
│   └── about/
├── plugins/                     # Feature plugins (consume ui/)
│   ├── cortex/
│   │   ├── CortexView.tsx
│   │   ├── cortex-theme.ts      # Plugin-specific tokens (KIND_COLORS etc.)
│   │   └── components/
│   │       ├── MindGraph3D.tsx   # 3D force graph (R3F Canvas)
│   │       └── ...
│   ├── nebula/
│   ├── launchpad/
│   ├── db-inspector/
│   ├── code-review-bot/
│   └── textcraft/
└── stores/                      # Zustand stores
```

### Structure Rationale

- **`ui/`:** New top-level directory for design system primitives. Separating from `components/` makes the boundary clear: `ui/` is reusable primitives with no business logic; `components/` and `plugins/` are consumers. This avoids the anti-pattern of mixing shared UI and feature code.
- **`ui/glass/`:** Glass components grouped together because they share a visual contract (backdrop-blur, white-alpha backgrounds, border-white-alpha). Barrel export means imports are clean: `import { GlassCard, GlassButton } from '@/ui'`.
- **`lib/motion.ts`:** Single file for all framer-motion variant objects. Components import specific variants, never define their own animation parameters inline. This replaces the current `cortex-theme.ts` approach where motion variants live inside a plugin-specific file.
- **Plugin-specific tokens stay in plugins:** `cortex-theme.ts` keeps KIND_COLORS and METHOD_COLORS because those are domain-specific (code entity types). The glass constants (GLASS_CARD, GLASS_SURFACE) migrate to `ui/glass/` since they are app-wide.

## Architectural Patterns

### Pattern 1: Compound Glass Components with Tailwind Class Composition

**What:** Glass components accept a `className` prop and merge it with their base glass classes using `clsx`/`cn`. They do NOT accept style objects for glass properties — the glass effect is their identity.
**When to use:** Every shared UI primitive in `ui/glass/`.
**Trade-offs:** Simple and predictable. Tailwind classes are the single styling mechanism (no CSS-in-JS split brain). Slight risk of class conflicts, mitigated by clear precedence rules.

**Example:**
```typescript
// ui/glass/GlassCard.tsx
import { cn } from '@/lib/utils'
import { forwardRef, type HTMLAttributes } from 'react'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'card' | 'surface' | 'elevated'
}

const VARIANTS = {
  card: 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl',
  surface: 'bg-surface-elevated/50 backdrop-blur-xl border-b border-border/40',
  elevated: 'bg-white/[0.05] backdrop-blur-2xl border border-white/[0.10] rounded-2xl shadow-xl',
} as const

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = 'card', className, children, ...props }, ref) => (
    <div ref={ref} className={cn(VARIANTS[variant], className)} {...props}>
      {children}
    </div>
  )
)
```

### Pattern 2: Motion Variant Registry with Reduced-Motion Awareness

**What:** All animation definitions live in `lib/motion.ts` as named variant objects. A `useMotionVariants()` hook returns either full or reduced variants based on `prefers-reduced-motion`. Components never define animation params inline.
**When to use:** Any component with framer-motion animations.
**Trade-offs:** Consistent animation language across the app. Slight indirection (must look up variant names), but prevents the current problem where each Cortex component defines its own slightly different animation timing.

**Example:**
```typescript
// lib/motion.ts
import type { Variants, Transition } from 'framer-motion'

// Shared easing
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

// Variant presets
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT_EXPO } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

export const scalePress: Variants = {
  idle: { scale: 1 },
  pressed: { scale: 0.97, transition: { duration: 0.1 } },
}

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export const slidePanel: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { x: '100%', transition: { duration: 0.2 } },
}

// Reduced-motion versions (instant, no spatial transforms)
export function getReducedVariant(v: Variants): Variants {
  const reduced: Variants = {}
  for (const [key, val] of Object.entries(v)) {
    if (typeof val === 'object' && val !== null) {
      const { x, y, scale, ...rest } = val as Record<string, unknown>
      reduced[key] = { ...rest, transition: { duration: 0.01 } }
    } else {
      reduced[key] = val
    }
  }
  return reduced
}
```

### Pattern 3: 3D Visualization as Self-Contained Modules with Error Boundaries

**What:** Each 3D visualization is a directory containing: the R3F Canvas component, a 2D fallback, and a wrapping ErrorBoundary. The wrapper auto-falls back on WebGL failure or when reduced motion is active. Parent components never import `Canvas` directly.
**When to use:** All four 3D visualizations (Dashboard Mesh, Nebula Graph, Launchpad Treemap, Schema Orb).
**Trade-offs:** More files per visualization, but guarantees the app never crashes from a WebGL issue. Lazy loading the Canvas means non-3D routes pay zero bundle cost.

**Example:**
```typescript
// plugins/cortex/components/MindGraph/index.tsx (wrapper)
import { lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { MindGraph2D } from './MindGraph2D'
import { GlassSkeleton } from '@/ui'

const MindGraph3D = lazy(() => import('./MindGraph3D'))

export function MindGraph(props: MindGraphProps) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) return <MindGraph2D {...props} />

  return (
    <ErrorBoundary fallback={<MindGraph2D {...props} />}>
      <Suspense fallback={<GlassSkeleton className="h-full w-full" />}>
        <MindGraph3D {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
```

### Pattern 4: CSS Variable Architecture for Multi-Theme Glass

**What:** Glass components use `white/[opacity]` for their glass effect (not theme-specific colors). The theme system only changes semantic tokens (`--color-background`, `--color-surface`, `--color-accent`, etc.) via `[data-theme]` selectors. Glass overlays on top of any theme background because `bg-white/[0.03]` is theme-agnostic.
**When to use:** All glass components across all 18 themes.
**Trade-offs:** Glass effect looks consistent across themes without per-theme glass tuning. The tradeoff is that glass intensity cannot vary per theme (by design decision — "medium glass" everywhere).

**Current token hierarchy (already in place, extend it):**
```
@theme block (Tailwind v4)           ← Default values
  └─ [data-theme="X"] override      ← Per-theme overrides
      └─ Component Tailwind classes  ← Consume tokens
          └─ Glass layers            ← white/[0.03] on top of surface colors
```

**New tokens to add for glass system:**
```css
@theme {
  /* Glass tokens — shared across all themes */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-bg-elevated: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.12);
  --glass-blur: 24px;
}
```

## Data Flow

### Theme Selection Flow

```
Settings UI (theme picker)
    ↓ setSetting('general.theme', 'obsidian')
Zustand settings-store
    ↓ persists via IPC
Electron main process (stores to disk)
    ↓ store updated
App.tsx useEffect reads theme
    ↓ document.documentElement.setAttribute('data-theme', 'obsidian')
CSS [data-theme="obsidian"] selector activates
    ↓ CSS custom properties override
All components re-render with new token values (automatic via Tailwind)
```

### Component Rendering Flow

```
Plugin View (e.g. CortexView)
    ↓ imports from ui/
Glass Component (e.g. GlassCard)
    ↓ reads: Tailwind utility classes → CSS custom properties
    ↓ reads: motion variants from lib/motion.ts
    ↓ reads: reducedMotion from useReducedMotion hook
framer-motion renders with selected variant
    ↓
DOM element with backdrop-filter, bg-white/alpha, border
```

### 3D Visualization Data Flow

```
Zustand store (e.g. cortex-store) holds raw data (entities, edges)
    ↓ selector
Wrapper component checks: reducedMotion? WebGL available?
    ↓ YES: lazy-load 3D component
    ↓ NO:  render 2D fallback
R3F Canvas receives data as props
    ↓ d3-force-3d computes layout (simulation in useEffect)
    ↓ three.js renders spheres, lines, labels via drei helpers
User interaction (click, hover, orbit)
    ↓ callbacks bubble to wrapper → update Zustand store
```

### Key Data Flows

1. **Theme propagation:** Settings store -> App.tsx effect -> `data-theme` attribute -> CSS variables -> all components. Uni-directional; no component reads the theme name directly for styling.
2. **Animation coordination:** `lib/motion.ts` exports -> components import specific variants -> framer-motion applies them. `useReducedMotion()` is checked once per component tree, not per animation.
3. **3D data pipeline:** Zustand store -> wrapper (decides 2D/3D) -> R3F Canvas -> d3-force simulation -> three.js meshes. Data flows down; user interactions flow up via callbacks.

## Build Order (Dependency Chain)

The design system has clear dependency layers. Build bottom-up:

| Phase | What | Why This Order |
|-------|------|----------------|
| **1. Token System** | Add glass tokens to `main.css` @theme block, add 6 new theme `[data-theme]` blocks, swap font-face declarations | Everything above depends on CSS variables existing. Zero risk — purely additive CSS. |
| **2. Motion System** | Create `lib/motion.ts` with all variant presets, `lib/use-reduced-motion.ts` hook | Glass components embed motion variants; must exist before components. |
| **3. Component Library** | Build `ui/glass/` primitives: GlassCard, GlassButton, GlassInput, GlassSelect, GlassTab, GlassBadge, GlassModal, GlassToast, GlassSkeleton, EmptyState, ScrollShadow | These are leaf nodes — they consume tokens and motion but have no upward dependencies. |
| **4. Core Page Migration** | Migrate AppLayout, Sidebar, Dashboard, Settings, Activity, About to use `ui/` components | Core pages are simpler (fewer custom components) — good first migration target to validate the design system works. |
| **5. Plugin Migration** | Migrate all 6 plugins to use `ui/` components, retire Cortex-specific GLASS_CARD/GLASS_SURFACE constants | Plugins are more complex; they benefit from patterns proven in phase 4. Cortex already has glass styling, so it is the easiest plugin to migrate (mostly import swaps). |
| **6. 3D Visualizations** | Build Dashboard Mesh, Nebula Graph, Launchpad Treemap, Schema Orb with error boundaries and 2D fallbacks | 3D is the highest-risk, lowest-dependency work. It consumes design system primitives (GlassCard wraps Canvas, accent colors for nodes) but does not block other migration. Can parallelize with phase 5. |
| **7. Polish + QA** | Sidebar micro-interactions, tab sliding underlines, button press feedback, scroll shadows, cross-theme visual QA across all 18 themes | Requires all components to be migrated first. This is refinement, not structure. |

**Critical dependency:** Phase 1 and 2 must complete before Phase 3 begins. Phases 4, 5, and 6 can partially overlap once enough components from Phase 3 exist.

## Anti-Patterns

### Anti-Pattern 1: Glass Styles Defined Per-Plugin

**What people do:** Each plugin defines its own glass class strings (like the current `GLASS_CARD` in `cortex-theme.ts`).
**Why it's wrong:** Glass intensity, border opacity, and blur values drift across plugins. Updating the glass formula means touching every plugin. This is Zenith's current state.
**Do this instead:** Single source of truth in `ui/glass/`. Plugins import `<GlassCard>`, never write `bg-white/[0.03] backdrop-blur-xl` directly. The cortex-theme.ts GLASS_CARD and GLASS_SURFACE constants should be deleted after migration and replaced with GlassCard component usage.

### Anti-Pattern 2: Inline framer-motion Variants

**What people do:** Define `variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}` inline in JSX.
**Why it's wrong:** Animation timing becomes inconsistent. Enter animations in Cortex use `[0.25, 0.46, 0.45, 0.94]` easing; a new component might use `ease-in-out`. Reduced motion must be handled per inline definition instead of once.
**Do this instead:** Import named variants from `lib/motion.ts`. The motion module handles reduced-motion branching internally.

### Anti-Pattern 3: R3F Canvas Without Error Boundary

**What people do:** Render `<Canvas>` directly in a component's JSX.
**Why it's wrong:** WebGL context loss, shader compilation failures, or GPU driver issues crash the entire React tree. On Electron, this can vary by OS and GPU.
**Do this instead:** Always wrap Canvas in ErrorBoundary + Suspense + lazy import. Always provide a 2D fallback. The current MindGraph3D has a fallback path in MindGraphTab — this pattern should be formalized into the wrapper pattern described above.

### Anti-Pattern 4: Theme-Specific Colors in Component Code

**What people do:** Hard-code hex values (`#34d399`) in component styling for decorative elements.
**Why it's wrong:** Those colors do not update when the theme changes. The component looks correct in Zenith default but wrong in Nord or Dracula.
**Do this instead:** Use CSS custom property references (`text-accent`, `bg-success`, `border-border`) for anything that should respond to theme changes. Hard-coded colors are only acceptable for domain-specific fixed palettes (like KIND_COLORS for code entity types, which are intentionally theme-invariant).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Electron main process | IPC via `window.api` (preload bridge) | Design system is purely renderer-side; no IPC changes needed for UI revamp |
| File system (fonts) | woff2 files in `assets/fonts/`, referenced by `@font-face` in `main.css` | Add Plus Jakarta Sans and Geist Mono woff2 files alongside existing fonts |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `ui/` -> `lib/motion.ts` | Direct import of variant objects | Glass components import specific motion presets they need |
| `ui/` -> `main.css` | Tailwind utility classes resolve to CSS custom properties | No runtime coupling; purely declarative via class names |
| `plugins/` -> `ui/` | Import shared components | One-way dependency; `ui/` never imports from `plugins/` |
| `plugins/` -> own theme file | Import domain-specific tokens (KIND_COLORS) | Plugin-specific palettes stay in plugin directories |
| `components/` -> `ui/` | Import shared components | Same one-way pattern as plugins |
| `stores/` -> `ui/` | None | Stores never import UI components; components import stores |
| 3D wrappers -> `ui/` | GlassCard wraps Canvas, GlassSkeleton for loading state | 3D modules are consumers of the design system, not part of it |
| Settings store -> App.tsx -> `<html data-theme>` | Zustand subscription in useEffect | Theme switching is already implemented; no architectural change needed |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (~81 components, 18 themes) | Monolithic `main.css` with all theme blocks is fine. Single `lib/motion.ts` is manageable. |
| 150+ components, 30+ themes | Consider splitting theme CSS into per-theme files loaded dynamically. Motion variants could split by category (page transitions, micro-interactions, 3D). |
| Plugin ecosystem (external plugins) | Would need to publish `ui/` as an internal package. Theme tokens would need a stable public API. Not in scope but architecture supports it. |

### Scaling Priorities

1. **First bottleneck:** `main.css` size with many themes. Each theme block is ~25 lines of CSS variable overrides. At 30+ themes this is ~750 lines of CSS — still trivial for browsers. Not a real concern until 100+ themes.
2. **Second bottleneck:** 3D visualization performance on low-end hardware. Already mitigated by node caps (50/200/20/30) and lazy loading. If more 3D views are added, consider a shared WebGL context pool.

## Sources

- Zenith codebase analysis: `src/renderer/src/assets/main.css` (theme token architecture), `src/renderer/src/plugins/cortex/cortex-theme.ts` (existing glass + motion patterns), `src/renderer/src/components/AppLayout.tsx` (shell structure), `src/renderer/src/App.tsx` (theme application flow) — HIGH confidence
- Tailwind v4 CSS-first configuration with `@theme` blocks — existing in codebase, HIGH confidence
- framer-motion Variants API pattern — established React ecosystem pattern, HIGH confidence
- react-three-fiber + drei integration — existing in codebase (`MindGraph3D.tsx`), HIGH confidence
- Error boundary + lazy loading pattern for R3F — standard React pattern documented in React docs, HIGH confidence

---
*Architecture research for: Zenith Obsidian Glass Design System*
*Researched: 2026-03-24*
