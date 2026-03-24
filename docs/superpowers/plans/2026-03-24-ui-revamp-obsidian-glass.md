# Zenith UI Revamp — "Obsidian Glass" Design System

**Date**: 2026-03-24
**Scope**: Full application UI overhaul across all 6 plugins + 4 core pages (~81 components)
**Aesthetic**: Frosted glass surfaces, luminous accent lighting, purposeful motion, 3D depth
**Mode**: Dark-only (all themes remain dark)

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Font Upgrade](#font-upgrade)
3. [Theme System — Old & New](#theme-system)
4. [Motion & Animation System](#motion-system)
5. [Glass Component Library](#glass-component-library)
6. [Micro-Interactions Catalog](#micro-interactions)
7. [3D Components](#3d-components)
8. [Per-Plugin Screen Upgrades](#per-plugin-upgrades)
9. [Phase Breakdown](#phase-breakdown)

---

## 1. Design Principles <a id="design-principles"></a>

| Principle | Rule |
|-----------|------|
| **Depth over flatness** | Every surface has a z-layer. Cards float above panels. Panels float above backgrounds. Use `backdrop-blur`, subtle shadows, and border opacity to convey depth. |
| **Light is information** | Accent glow = interactive. Dim = disabled. Pulse = processing. Flash = success. Color communicates state, not decoration. |
| **Motion is purposeful** | Every animation answers "why did that move?" — entrance (new content), feedback (user action acknowledged), state change (something happened). No gratuitous motion. |
| **Consistency is trust** | Same component = same look everywhere. A card in Cortex looks like a card in Launchpad. Glass surface in DbInspector matches glass surface in Nebula. |
| **Progressive disclosure** | Show the essential, reveal the rest on interaction. Hover shows actions. Click expands detail. Scroll reveals more. Never overwhelm. |

---

## 2. Font Upgrade <a id="font-upgrade"></a>

### Current
- UI: Inter Variable (generic, overused)
- Mono: JetBrains Mono (solid but common)

### New
- **UI**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) — warm geometric sans with distinctive character. Variable font (200-800 weights). More personality than Inter while maintaining excellent readability at all sizes.
- **Mono**: [Geist Mono](https://vercel.com/font) — clean, modern monospace from Vercel. Tighter letter-spacing than JetBrains Mono, excellent at small sizes, pairs beautifully with geometric sans fonts.
- **Display** (headings, hero text): Plus Jakarta Sans at weight 700-800 with slight letter-spacing (-0.02em). No separate display font needed — the heavier weights of Plus Jakarta have enough presence.

### Implementation
1. Download Plus Jakarta Sans Variable woff2 from Google Fonts
2. Download Geist Mono woff2 from Vercel
3. Add `@font-face` declarations in `main.css`
4. Update CSS variables:
   ```css
   --font-sans: 'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif;
   --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
   ```
5. Keep JetBrains Mono as fallback (already bundled)
6. Remove Inter font references

### Typography Scale
```
Hero/Display:  2.25rem (36px)  weight 800  tracking -0.02em
H1:            1.75rem (28px)  weight 700  tracking -0.015em
H2:            1.25rem (20px)  weight 600  tracking -0.01em
H3:            1rem    (16px)  weight 600  tracking normal
Body:          0.875rem (14px) weight 400  tracking normal
Small/Caption: 0.75rem (12px)  weight 400  tracking 0.01em
Mono:          0.82rem (13px)  weight 400  tracking normal
```

---

## 3. Theme System <a id="theme-system"></a>

### Old Themes (12 — existing, preserved as-is)

| # | Name | Accent | Vibe |
|---|------|--------|------|
| 1 | Zenith (Default) | Neon cyan | Sci-fi terminal |
| 2 | Portfolio | Amber | Warm professional |
| 3 | Nord Aurora | Frost blue | Arctic calm |
| 4 | Rosé Pine | Dusty rose | Cozy warmth |
| 5 | Dracula | Purple | Classic dev |
| 6 | Gruvbox | Warm orange | Earthy retro |
| 7 | Tokyo Night | Indigo | Neon city |
| 8 | Synthwave '84 | Hot pink | Retro-futuristic |
| 9 | Catppuccin Mocha | Lavender | Soft pastel |
| 10 | Emerald Matrix | Green | Hacker terminal |
| 11 | Solarized Dark | Teal | Blue-green calm |
| 12 | Crimson Night | Red | Bold dramatic |

### New Themes (6 — fresh additions)

| # | Name | Background | Accent | Vibe | Surface Stack |
|---|------|-----------|--------|------|---------------|
| 13 | **Midnight Bloom** | `oklch(12% 0.02 280)` deep violet-black | `oklch(72% 0.18 310)` magenta-orchid | Luxurious, floral, moody | Surfaces shift from cool violet to warm magenta |
| 14 | **Copper Forge** | `oklch(13% 0.015 55)` warm charcoal-brown | `oklch(68% 0.14 55)` burnished copper | Industrial, warm metallic | Amber-tinged surfaces, copper borders |
| 15 | **Ocean Depth** | `oklch(11% 0.02 220)` abyssal blue-black | `oklch(70% 0.12 195)` aquamarine | Deep sea, bioluminescent | Blue-tinted surfaces, teal glow |
| 16 | **Nebula Dust** | `oklch(12% 0.01 320)` deep space purple | `oklch(75% 0.15 340)` stellar pink-coral | Cosmic, ethereal, warm | Pink-shifted accents on purple-black |
| 17 | **Obsidian** | `oklch(10% 0 0)` true near-black | `oklch(65% 0 0)` pure white/silver | Monochrome, premium, editorial | Zero saturation, pure grayscale with sharp contrast |
| 18 | **Jade Temple** | `oklch(12% 0.015 160)` dark forest green | `oklch(72% 0.13 160)` jade green | Natural, zen, serene | Green-tinged surfaces, bamboo calm |

### Theme Selector UI Enhancement
- **Current**: Plain dropdown in Settings
- **New**: Grid of theme preview cards (3 columns)
  - Each card shows: theme name, 4 color dots (bg, surface, accent, text), mini preview strip
  - Click to apply instantly
  - Divided into "Classic" (old 12) and "New Collection" (new 6) sections
  - Active theme has accent border glow

### CSS Variable Structure (unchanged, just new values)
Each new theme defines the same 22 CSS custom properties as existing themes.

---

## 4. Motion & Animation System <a id="motion-system"></a>

### Timing Tokens
```css
--duration-instant:  100ms   /* Hover states, opacity toggles */
--duration-fast:     150ms   /* Button press, icon swap */
--duration-normal:   250ms   /* Panel toggle, tab switch */
--duration-slow:     400ms   /* Page transition, card entrance */
--duration-slower:   600ms   /* 3D camera moves, celebrations */
```

### Easing Tokens
```css
--ease-out:        cubic-bezier(0.25, 0.46, 0.45, 0.94)  /* Standard deceleration */
--ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1)     /* Bouncy overshoot */
--ease-smooth:     cubic-bezier(0.4, 0, 0.2, 1)          /* Material-style */
```

### Framer Motion Shared Variants

Create a `src/renderer/src/lib/motion-variants.ts` shared module:

```typescript
// Staggered card grid entrance
export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } }
}

export const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

// Page/tab content transition
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } }
}

// Modal/dialog entrance
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.12 } }
}

// Slide panel (sidebar expand/collapse)
export const slidePanelVariants = {
  collapsed: { width: 0, opacity: 0 },
  expanded: (w: number) => ({ width: w, opacity: 1, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } })
}

// Hover lift for cards
export const hoverLift = {
  rest: { y: 0, boxShadow: '0 0 0 rgba(0,0,0,0)' },
  hover: { y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', transition: { duration: 0.2 } }
}
```

### Skeleton Loader System
Replace all bare `<Loader2 className="animate-spin" />` with contextual skeleton loaders:
- **Card skeleton**: Rounded rect with shimmer gradient
- **Table skeleton**: Row placeholders with shimmer
- **Text skeleton**: Line-width varying blocks with shimmer
- **Chart skeleton**: Axis + placeholder bars with shimmer

Shimmer animation (already in main.css as `@keyframes shimmer`):
```css
.skeleton {
  background: linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-elevated) 50%, var(--color-surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius);
}
```

### Reduced Motion
All motion variants must check `usePrefersReducedMotion()` (already exists). When enabled:
- Duration → 0
- Transforms → none
- Only opacity transitions remain (instant)

---

## 5. Glass Component Library <a id="glass-component-library"></a>

Create shared glass-styled primitives in `src/renderer/src/components/ui/`:

### GlassCard
```
- bg: white/[0.03] with backdrop-blur-xl
- border: white/[0.08] with 1px solid
- border-radius: 12px (--radius-lg)
- hover: border white/[0.12], subtle y-lift
- variants: default, interactive (cursor pointer + hover lift), selected (accent border glow)
```

### GlassSurface
```
- bg: surface-elevated/50 with backdrop-blur-xl
- border-bottom: border/40
- Used for: headers, toolbars, panel backgrounds
```

### GlassButton
```
- bg: white/[0.05]
- border: white/[0.1]
- hover: white/[0.1] with accent glow
- active: scale(0.97) with 100ms
- variants: default, primary (accent bg/20), danger (error bg/20), ghost (no bg, no border)
- sizes: sm (28px), md (32px), lg (40px)
```

### GlassInput
```
- bg: white/[0.03]
- border: white/[0.08]
- focus: accent border + accent glow shadow (0 0 0 2px accent/20)
- transition: border-color 150ms, box-shadow 150ms
```

### GlassSelect (dropdown)
```
- Trigger: same as GlassButton
- Dropdown: GlassSurface with shadow-2xl
- Options: hover bg white/[0.06]
- Selected: accent text + left accent bar
```

### GlassTab
```
- Tab bar: GlassSurface bottom border
- Inactive: text-secondary, no bg
- Active: accent text, accent underline (2px) with spring animation
- Hover: text-primary, bg white/[0.03]
```

### GlassBadge
```
- Inline pill shape
- bg: color/15
- text: color
- border: color/20
- variants: success, error, warning, info, accent, neutral
```

### GlassModal
```
- Backdrop: black/60 with backdrop-blur-sm
- Container: GlassCard with shadow-2xl
- Entrance: scale 0.95 → 1, opacity 0 → 1 (200ms)
- Exit: scale 1 → 0.97, opacity 1 → 0 (120ms)
```

### GlassToast
```
- Position: bottom-right stack
- bg: GlassCard styling
- Left accent bar (color by type)
- Entrance: slide from right + opacity
- Auto-dismiss: thin progress bar at bottom
- Variants: success (green), error (red), info (accent), warning (amber)
```

### GlassSkeleton
```
- bg: shimmer gradient on surface colors
- border-radius: matches target component
- Variants: text (variable width lines), card (full rectangle), circle (avatar), table (rows)
```

### Usage Pattern
All plugins import from `@/components/ui/` and use these primitives. No more inline glass classes scattered across 81 files.

---

## 6. Micro-Interactions Catalog <a id="micro-interactions"></a>

### Sidebar
| Element | Interaction | Effect |
|---------|------------|--------|
| Icon | Hover | Gentle scale(1.08) + accent glow ring (box-shadow) |
| Icon | Active | Left accent bar slides in (height animation) |
| Icon | Click | Brief scale(0.92) → 1 spring |
| Tooltip | Appear | Delay 400ms, then fade + translateX(4px) from left |
| Drag handle | Dragging | Card lifts with shadow, others shift with spring |

### Buttons (all GlassButtons)
| Interaction | Effect |
|-------------|--------|
| Hover | bg brightens, border brightens |
| Press | scale(0.97) for 100ms |
| Click (copy) | Icon morphs Copy → Check (spring), revert after 2s |
| Click (delete) | Brief shake if confirmation needed |
| Disabled | opacity 0.4, cursor not-allowed |

### Cards (all GlassCards)
| Interaction | Effect |
|-------------|--------|
| Hover | y: -2px, shadow deepens, border brightens |
| Click (interactive) | Brief scale(0.98) → 1 spring |
| Entrance | Stagger fade-up from bottom (per staggerItem variant) |
| Loading | Skeleton shimmer placeholder |

### Inputs
| Interaction | Effect |
|-------------|--------|
| Focus | Border transitions to accent, glow shadow appears |
| Blur | Border returns to default, glow fades |
| Error | Border pulses red, shake animation |
| Valid | Subtle green check fade-in (where applicable) |

### Tabs
| Interaction | Effect |
|-------------|--------|
| Switch | Active underline slides to new tab (layout animation) |
| Content | Crossfade with subtle vertical shift |
| Hover (inactive) | Text brightens, subtle bg appears |

### Status Indicators
| State Change | Effect |
|-------------|--------|
| Idle → Processing | Color pulse animation (accent glow expands/contracts) |
| Processing → Success | Flash green, check icon springs in |
| Processing → Error | Flash red, brief shake |
| New data arrives | Subtle highlight flash on row/card |

### Scroll
| Element | Effect |
|---------|--------|
| Long list | Thin accent progress bar at container top |
| Scroll shadow | Top/bottom fade shadows when content overflows |

### Panels (collapsible)
| Interaction | Effect |
|-------------|--------|
| Expand | Width animates from 0 to target (250ms ease-smooth) |
| Collapse | Width animates to collapsed size, content fades out first |
| Resize handle | Cursor changes, visual highlight on drag |

### Empty States
| Element | Effect |
|---------|--------|
| Illustration | Subtle float animation (y: ±4px, 3s ease-in-out infinite) |
| Mouse move | Gentle parallax shift on illustration (±8px based on cursor position) |
| CTA button | Slightly larger, accent-colored, gentle pulse border |

---

## 7. 3D Components <a id="3d-components"></a>

All 3D components use `@react-three/fiber` + `@react-three/drei` (already in deps).

### 7.1 Dashboard Hero — Activity Mesh
**Location**: Mission Control (`/dashboard`)
**Replaces**: Static greeting header

**Design**:
- Floating 3D mesh/wireframe sphere in the hero area (right side)
- Nodes on the sphere represent recent activity events
- Nodes glow with their plugin's accent color
- Sphere slowly auto-rotates
- On hover over a node: tooltip shows activity detail
- Mesh density increases with more activity (busier = denser mesh)
- Falls back to a 2D radial gradient animation if WebGL unavailable

**Size**: ~300×300px, positioned in hero header right side
**Performance**: Max 50 nodes, simple MeshBasicMaterial, no shadows

### 7.2 Nebula Knowledge Graph — 3D Upgrade
**Location**: Nebula → Knowledge tab
**Replaces**: Current 2D react-force-graph-2d

**Design**:
- Reuse MindGraph3D architecture (already built for Cortex)
- Nodes = notes (colored by tag/category)
- Edges = tag relationships / backlinks
- Same interaction: orbit, zoom, click-to-focus with camera lerp
- Node size based on connection count
- Html labels on hover showing note title
- Toggle between 2D/3D (same as MindGraphTab pattern)

### 7.3 Launchpad Cost Visualizer — 3D Treemap
**Location**: Launchpad → Estimator tab (alongside or replacing flat summary)
**New addition**: Visual cost breakdown

**Design**:
- 3D extruded blocks representing cost categories
- Block height = monthly cost proportion
- Block color = service category (compute=blue, storage=green, network=purple, etc.)
- Hover: block lifts + tooltip with service name and cost
- Click: drills into service detail
- Auto-rotates slowly, orbit controls
- Camera angle: isometric (45° tilt)

**Size**: ~400×300px, positioned in the estimation summary area
**Performance**: Max 20 blocks, simple geometry

### 7.4 DbInspector Schema Orb
**Location**: DbInspector → ER Diagram tab (optional 3D view)
**New addition**: Alternative schema visualization

**Design**:
- Tables as floating labeled planes arranged in 3D space
- Foreign key relationships as glowing lines between planes
- Clustered by schema/namespace
- Orbit + zoom controls
- Click table to see columns
- Toggle between current 2D mermaid view and 3D orb view

**Size**: Full panel width, ~500px height
**Performance**: Max 30 tables, instanced rendering

### 3D Error Handling
- All 3D components wrapped in error boundary
- Fallback to 2D equivalent (already pattern exists in MindGraphTab)
- `<Suspense>` with skeleton loader while canvas initializes
- Respect `usePrefersReducedMotion` — disable auto-rotate, reduce particle count

---

## 8. Per-Plugin Screen Upgrades <a id="per-plugin-upgrades"></a>

### 8.1 Mission Control Dashboard

| Element | Current | Revamped |
|---------|---------|----------|
| Hero header | Text greeting + date | Glass surface with 3D activity mesh on right, greeting + stats on left |
| Stats cards | Static cards | GlassCard with AnimatedCounter (already in Cortex, reuse), staggered entrance |
| TokenChart | Basic chart | Glass-wrapped chart with subtle grid lines, hover tooltip glass-styled |
| HealthPanel | Basic panel | GlassCard with ring progress animations |
| Plugin cards | Static grid | GlassCard interactive variant, staggered entrance, hover lift |
| Activity feed | Plain list | Glass list items with left accent bars, stagger entrance |

### 8.2 Cortex (already closest to target — polish only)

| Element | Current | Revamped |
|---------|---------|----------|
| Tab bar | Custom tabs | GlassTab component for consistency |
| RepoCard | Has motion | Ensure uses shared staggerItem variant |
| InsightCard | Has motion | Ensure uses shared staggerItem variant |
| Status bar | Plain bar | GlassSurface with subtle gradient |
| QAPanel messages | Has motion | Add typing indicator dots animation |
| MindGraphTab toolbar | Glass already | Ensure matches GlassSurface spec |
| ExportDialog | Modal | GlassModal with entrance animation |
| Empty states | Plain text | Floating illustration + CTA |

### 8.3 CodeReviewBot

| Element | Current | Revamped |
|---------|---------|----------|
| Header bar | Plain | GlassSurface with connection status badge (GlassBadge) |
| PR list | Plain cards | GlassCard with staggered entrance, hover lift |
| Diff viewer | Static | Glass-wrapped with line highlight transitions |
| Review comments | Plain list | GlassCard per comment, severity badge (GlassBadge), stagger entrance |
| Tab bar | Plain | GlassTab with sliding underline |
| Settings panel | Plain | GlassCard sections with GlassInput/GlassSelect |
| Loading state | Spinner | Skeleton loaders matching PR card shape |
| Empty states | Text | Illustration + guided CTA |

### 8.4 DbInspector

| Element | Current | Revamped |
|---------|---------|----------|
| Connection manager | Dropdown | GlassSelect with connection status dot |
| Schema explorer | Tree view | Glass-wrapped tree with indent lines, hover highlight |
| Query console | CodeMirror | Glass-wrapped editor, results table with striped rows |
| Ask AI chat | Plain messages | Glass message bubbles (like QAPanel pattern) |
| Query optimizer | Plain sections | GlassCard per section (suggestions, tradeoffs, insights) |
| ER diagram | Mermaid only | Add 3D Schema Orb toggle alongside mermaid |
| Tab bar | Plain | GlassTab with sliding underline |
| History | Plain list | GlassCard entries with stagger entrance |

### 8.5 Launchpad

| Element | Current | Revamped |
|---------|---------|----------|
| Provider selector | Static cards | GlassCard interactive, hover glow with provider brand color |
| Service catalog | Plain list | Glass list with search input (GlassInput), hover highlight |
| Resource configurator | Plain form | GlassInput/GlassSelect for all fields, section dividers |
| Estimation summary | Static panel | GlassCard with 3D cost treemap, AnimatedCounter for totals |
| AI advisor chat | Plain messages | Glass message bubbles, streaming shimmer |
| Tab bar | Plain | GlassTab with sliding underline |
| History | Plain list | GlassCard entries |
| Compare view | Side-by-side | Glass columns with diff highlighting (green cheaper, red more expensive) |

### 8.6 Nebula

| Element | Current | Revamped |
|---------|---------|----------|
| Note list sidebar | Plain cards | GlassCard with hover lift, active accent border |
| Note editor | Tiptap | Glass-wrapped editor area, improved code block NodeView (done) |
| Drawing panel | tldraw | Glass-wrapped with smooth expand/collapse animation |
| Knowledge graph | 2D force graph | 3D upgrade with MindGraph3D architecture |
| Search | Plain results | GlassInput + GlassCard result items with highlight |
| Voice recorder FAB | Basic circle | Glass circle with equalizer animation on recording |
| Tab bar | Plain | GlassTab with sliding underline |
| Tags | Plain chips | GlassBadge styled tags |

### 8.7 TextCraft

| Element | Current | Revamped |
|---------|---------|----------|
| Input panel | Plain textarea | GlassCard wrapped, GlassInput styling on textarea |
| Controls panel | Plain form | GlassCard with GlassSelect dropdowns, glass slider |
| Output panel | Plain output | GlassCard with markdown rendered content |
| Refine button | Plain button | GlassButton primary, loading state with shimmer |
| Tab bar | Plain tabs | GlassTab with sliding underline |
| History | Plain list | GlassCard entries with stagger entrance |
| Copy/download buttons | Icon buttons | GlassButton ghost variant, icon morph on click |

### 8.8 Settings

| Element | Current | Revamped |
|---------|---------|----------|
| Tab navigation | Plain tabs | GlassTab vertical sidebar |
| Theme selector | Dropdown | Theme preview grid (3 cols) with mini color swatches, "Classic" and "New Collection" section headers |
| Agent settings | Plain form | GlassCard per agent, GlassInput/GlassSelect |
| MCP settings | Plain form | GlassCard per server, status badges |
| Connection editor | Plain list | GlassCard entries with inline edit |

### 8.9 Activity Log

| Element | Current | Revamped |
|---------|---------|----------|
| Filter bar | Dropdowns | GlassSurface toolbar with GlassSelect filters |
| Activity entries | Plain list | GlassCard entries with left accent bar (plugin color), stagger entrance |
| Status badges | Text | GlassBadge with color coding |
| Empty state | Plain text | Illustration + message |

### 8.10 About View

| Element | Current | Revamped |
|---------|---------|----------|
| App header | Static | Animated logo with subtle glow, version badge |
| Capability cards | Grid | GlassCard with icon, stagger entrance, hover lift |
| Getting started | Numbered list | Glass timeline with step indicators |
| Author section | Plain | GlassCard with avatar and social link GlassButtons |

---

## 9. Phase Breakdown <a id="phase-breakdown"></a>

### Phase 1: Design System Foundation
**Goal**: Establish the shared component library, motion system, and font upgrade that everything else builds on.

**Tasks**:
1. Download and install Plus Jakarta Sans + Geist Mono font files (woff2)
2. Update `@font-face` declarations and CSS variables (`--font-sans`, `--font-mono`)
3. Create typography scale CSS classes
4. Create `src/renderer/src/lib/motion-variants.ts` with all shared framer-motion variants
5. Add timing and easing CSS custom properties to `:root`
6. Create `src/renderer/src/components/ui/` directory with glass primitives:
   - `GlassCard.tsx`
   - `GlassSurface.tsx`
   - `GlassButton.tsx`
   - `GlassInput.tsx`
   - `GlassSelect.tsx`
   - `GlassTab.tsx`
   - `GlassBadge.tsx`
   - `GlassModal.tsx`
   - `GlassToast.tsx`
   - `GlassSkeleton.tsx`
7. Add skeleton shimmer CSS to main.css
8. Create shared `EmptyState` component (illustration + CTA + float animation)
9. Verify all glass components render correctly with existing Zenith theme

**Deliverable**: A working component library that all subsequent phases import from.

---

### Phase 2: Theme Expansion
**Goal**: Add 6 new themes and build the visual theme selector.

**Tasks**:
1. Define CSS variables for all 6 new themes in `main.css`:
   - Midnight Bloom
   - Copper Forge
   - Ocean Depth
   - Nebula Dust
   - Obsidian
   - Jade Temple
2. Test each theme against glass components from Phase 1
3. Replace Settings theme dropdown with theme preview grid UI:
   - "Classic Themes" section (existing 12)
   - "New Collection" section (new 6)
   - Each card: theme name + 4 color dots + mini preview strip
   - Active theme: accent border glow
   - Click to apply instantly
4. Ensure all glass components look correct across all 18 themes
5. Update hljs-zenith.css to work well with new theme accent colors

**Deliverable**: 18 total themes with a beautiful visual selector.

---

### Phase 3: Core App & Plugin Migration — Motion & Glass
**Goal**: Migrate all plugin screens from flat/plain components to glass components with micro-interactions.

**Sub-phase 3a: Core App Pages**
1. Mission Control Dashboard — apply GlassCards, stagger entrance, AnimatedCounter
2. Activity Log — GlassCard entries, GlassSurface toolbar, GlassBadge
3. About View — GlassCards, stagger entrance, glass timeline
4. Settings — GlassTab sidebar, theme grid, GlassCard sections
5. Sidebar — hover scale + glow, active bar slide, tooltip animation

**Sub-phase 3b: Cortex (polish)**
6. Unify Cortex's existing glass patterns to use shared GlassCard/GlassTab
7. Ensure all motion uses shared variants from motion-variants.ts
8. Add skeleton loaders for loading states

**Sub-phase 3c: CodeReviewBot**
9. PR list → GlassCard with stagger
10. Review comments → GlassCard with severity GlassBadge
11. Tab bar → GlassTab
12. Settings panel → GlassCard + GlassInput
13. Add skeleton loaders

**Sub-phase 3d: DbInspector**
14. Connection manager → GlassSelect
15. Schema explorer → glass tree with indent lines
16. Query console → glass-wrapped, striped results table
17. Ask AI → glass message bubbles
18. Query optimizer → GlassCard sections
19. Tab bar → GlassTab
20. History → GlassCard entries

**Sub-phase 3e: Launchpad**
21. Provider selector → GlassCard interactive with brand glow
22. Service catalog → glass list with GlassInput search
23. Resource configurator → GlassInput/GlassSelect
24. Estimation summary → GlassCard + AnimatedCounter
25. AI advisor → glass messages
26. Tab bar → GlassTab
27. History/Compare → GlassCard

**Sub-phase 3f: Nebula**
28. Note list → GlassCard with active accent border
29. Editor wrapper → GlassSurface
30. Search → GlassInput + GlassCard results
31. Voice recorder FAB → glass circle
32. Tab bar → GlassTab
33. Tags → GlassBadge

**Sub-phase 3g: TextCraft**
34. Input/output panels → GlassCard wrapped
35. Controls → GlassCard + GlassSelect
36. Tab bar → GlassTab
37. History → GlassCard entries

**Deliverable**: Every screen in the app uses the glass design system with consistent motion.

---

### Phase 4: 3D Components & Advanced Interactions
**Goal**: Add 3D visualizations and polish micro-interactions.

**Tasks**:
1. **Dashboard Activity Mesh**: 3D wireframe sphere with activity nodes in Mission Control hero
2. **Nebula 3D Knowledge Graph**: Port MindGraph3D architecture to Nebula's Knowledge tab (replace 2D)
3. **Launchpad 3D Cost Treemap**: Extruded blocks for cost visualization in Estimator
4. **DbInspector Schema Orb**: 3D table relationship view (toggle alongside mermaid ER)
5. Error boundaries + 2D fallbacks for all 3D components
6. **Scroll progress bars**: Thin accent bar at top of scrollable containers
7. **Scroll shadows**: Top/bottom fade when content overflows
8. **Empty state illustrations**: SVG floating illustrations with parallax mouse effect for all empty states
9. **Button press feedback**: Ensure all GlassButtons have scale(0.97) on press
10. **Success celebrations**: Brief confetti/sparkle effect on significant actions (export complete, analysis done)
11. Performance audit: Ensure all 3D components respect node caps, lazy load, and reduced motion
12. Final cross-theme visual QA across all 18 themes

**Deliverable**: Fully polished app with 3D components, micro-interactions, and visual consistency across all themes.

---

## File Impact Summary

| Directory | Files Affected | Nature |
|-----------|---------------|--------|
| `src/renderer/src/components/ui/` | ~10 new files | New glass component library |
| `src/renderer/src/lib/` | 1 new file | motion-variants.ts |
| `src/renderer/src/assets/main.css` | 1 modified | 6 new themes, timing tokens, skeleton CSS |
| `src/renderer/src/assets/fonts/` | 4 new files | Plus Jakarta Sans + Geist Mono woff2 |
| `src/renderer/src/components/` | ~8 modified | Dashboard, Activity, About, Settings, Sidebar |
| `src/renderer/src/plugins/cortex/` | ~6 modified | Migrate to shared glass + motion |
| `src/renderer/src/plugins/code-review-bot/` | ~6 modified | Full glass migration |
| `src/renderer/src/plugins/db-inspector/` | ~8 modified | Full glass migration + 3D schema orb |
| `src/renderer/src/plugins/launchpad/` | ~7 modified | Full glass migration + 3D cost viz |
| `src/renderer/src/plugins/nebula/` | ~8 modified | Full glass migration + 3D knowledge graph |
| `src/renderer/src/plugins/textcraft/` | ~5 modified | Full glass migration |
| `src/renderer/src/components/settings/` | ~4 modified | Theme grid selector |

**Total**: ~10 new files, ~52 modified files, 0 deleted files

---

## Dependencies

No new npm packages required. Everything builds on existing deps:
- `framer-motion` (animations)
- `@react-three/fiber` + `@react-three/drei` + `three` (3D)
- `d3-force-3d` (3D graph physics)
- `lucide-react` (icons)
- Tailwind CSS (styling)

Only new assets: 4 font files (woff2).

---

## Success Criteria

1. Every screen uses GlassCard/GlassTab/GlassButton — zero flat/unstyled components
2. All card grids have staggered entrance animations
3. All tab bars have sliding underline animation
4. All loading states show contextual skeleton loaders (no bare spinners)
5. 4 new 3D components render correctly with error boundaries
6. 18 themes all look correct (visual QA checklist)
7. `usePrefersReducedMotion` respected everywhere
8. No performance regression (Lighthouse, frame rate during animations)
9. Fonts load correctly with fallback chain
