# Stack Research

**Domain:** Electron desktop app — unified glass morphism design system with 3D components, animation system, and theme engine
**Researched:** 2026-03-24
**Confidence:** HIGH (all recommended technologies already in project deps; patterns verified against official docs and current community practices)

## Context

Zenith already has every required npm dependency installed. This research focuses on **how to use them correctly** for a unified design system — not what to install. The constraint "no new npm packages" (from PROJECT.md) is respected throughout.

## Recommended Stack

### Core Technologies (Already Installed)

| Technology | Version (in project) | Purpose | Why Recommended |
|------------|---------------------|---------|-----------------|
| Tailwind CSS v4 | ^4.0.12 | CSS-first design tokens, glass utilities, theme engine | OKLch-native `@theme` blocks eliminate JS config; tree-shakes unused styles; microsecond incremental rebuilds via Oxide engine. Already powers all 12 themes. **Confidence: HIGH** |
| framer-motion | ^12.5.0 (latest: 12.38.0) | Declarative animation system, page transitions, micro-interactions | De-facto standard for React animation in 2026. v12 has zero breaking changes from v11. Supports layout animations, scroll-linked effects, `useReducedMotion`. Already partially used in Cortex. **Confidence: HIGH** |
| @react-three/fiber | ^9.5.0 | React renderer for Three.js — 3D visualizations | Pairs with React 19 (confirmed). Component model makes 3D scenes declarative/composable. Already powers MindGraph3D. **Confidence: HIGH** |
| @react-three/drei | ^10.7.7 | Pre-built R3F helpers (OrbitControls, Html, Line, etc.) | Eliminates boilerplate for common 3D patterns (camera controls, labels, LOD). Already in use. **Confidence: HIGH** |
| three.js | ^0.183.2 | 3D rendering engine | Stable WebGL renderer with WebGPU fallback path for future. Current version is production-ready. **Confidence: HIGH** |
| Zustand | ^5.0.3 | Per-plugin state management, theme state | Minimal API, no providers, selector-based rerenders. Already manages all plugin stores. **Confidence: HIGH** |
| tw-animate-css | ^1.2.5 | Tailwind v4 CSS animation utilities | Pure CSS replacement for tailwindcss-animate. Provides `animate-in`, `animate-out`, fade/zoom/slide utilities. Already imported. **Confidence: HIGH** |
| d3-force-3d | ^3.0.6 | 3D force-directed graph layout | Powers MindGraph node positioning. No TS declarations (use `@ts-expect-error`). **Confidence: HIGH** |

### Supporting Libraries (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.475.0 | Icon system | All UI icons — consistent stroke-based icon set across all plugins |
| react-resizable-panels | ^4.7.2 | Resizable panel layouts | Plugin panels with drag-to-resize (DbInspector, Cortex split views) |
| @tanstack/react-virtual | ^3.13.22 | Virtualized lists | Long scrollable lists (activity log, API lists) — prevents DOM bloat |
| react-force-graph-2d | ^1.29.1 | 2D fallback graph rendering | Fallback when WebGL unavailable or `prefers-reduced-motion` active |

### New Assets Required (Not npm — font files only)

| Asset | Source | Purpose | Notes |
|-------|--------|---------|-------|
| Plus Jakarta Sans Variable (woff2) | Google Fonts / Fontsource | Primary UI font replacing Inter | Download 2 files: Regular (variable) and Italic (variable). SIL OFL licensed. |
| Geist Mono (woff2) | github.com/vercel/geist-font/releases | Code font replacing JetBrains Mono | Download from v1.3.0 release. 2 weights: Regular + Bold. SIL OFL licensed. |

## Glass Morphism Implementation Pattern

**Confidence: HIGH** (verified against Tailwind v4 docs and existing Cortex implementation)

### Core Glass Recipe (Tailwind v4 utilities only)

```
bg-white/[0.03]          -- translucent white fill (3% opacity)
backdrop-blur-xl         -- frosted glass blur (24px)
border border-white/[0.08] -- subtle edge definition
rounded-2xl              -- soft corners
shadow-lg shadow-black/20 -- depth separation from canvas
```

### Design System Tokens (add to @theme block)

```css
@theme {
  /* Glass tokens */
  --glass-bg: oklch(100% 0 0 / 0.03);
  --glass-bg-elevated: oklch(100% 0 0 / 0.06);
  --glass-border: oklch(100% 0 0 / 0.08);
  --glass-border-bright: oklch(100% 0 0 / 0.15);
  --glass-blur: 24px;          /* backdrop-blur-xl */
  --glass-blur-subtle: 12px;   /* backdrop-blur-md */
}
```

### Why This Pattern

- `bg-white/[0.03]` (not `bg-surface-elevated/50`) gives true glass transparency that reveals background content. This matches the existing `GLASS_CARD` constant in `cortex-theme.ts`.
- `backdrop-blur-xl` (24px) is the sweet spot — visible frosting without becoming opaque. Smaller values (blur-sm, blur-md) look cheap; larger (blur-3xl) kills readability.
- On dark backgrounds, white-tinted glass reads better than black-tinted glass. The existing Cortex pattern confirms this.
- `border-white/[0.08]` provides edge definition without harsh lines. This is critical — without borders, glass cards visually bleed into each other.

### Performance Constraint

Backdrop-filter is GPU-accelerated but expensive when stacked. **Do not nest glass components** (a glass card inside a glass modal). Instead, inner elements should use `bg-white/[0.02]` without `backdrop-blur` to avoid compounding blur passes.

## Animation System Architecture

**Confidence: HIGH** (framer-motion v12 API verified, patterns match existing Cortex usage)

### Shared Motion Variants Module

Build a single `motion-variants.ts` exporting all shared animation presets. The existing `cardVariants` in `cortex-theme.ts` is the right pattern — extend it app-wide.

| Variant Set | Use Case | Key Properties |
|------------|----------|----------------|
| `cardEntrance` | Staggered card/list item reveal | `opacity 0->1, y 16->0, scale 0.96->1, stagger 0.08s` |
| `pageTransition` | Route/tab changes | `opacity + x slide, duration 0.3s, ease [0.25, 0.46, 0.45, 0.94]` |
| `modalOverlay` | Modal backdrop + content | `backdrop: opacity 0->1; content: scale 0.95->1 + opacity` |
| `hoverLift` | Interactive card hover | `y: -2, scale: 1.01, shadow increase, duration 0.2s` |
| `slidePanel` | Sidebar/drawer open-close | `x: -100%->0, duration 0.3s, spring stiffness 300` |
| `pressScale` | Button/interactive press | `scale: 0.97, duration 0.1s` |
| `tabUnderline` | Tab bar sliding indicator | `layoutId shared, spring transition` |

### Reduced Motion Strategy

```typescript
// Every animation consumer must respect this
const prefersReducedMotion = useReducedMotion()
const variants = prefersReducedMotion ? instantVariants : fullVariants
```

All variant sets must export a "reduced" version that uses `opacity` only (no transforms, no springs). The existing `useCardVariants(reducedMotion)` in `cortex-theme.ts` is the correct pattern.

### framer-motion Import Path

The project currently imports from `framer-motion`. This is fine — the `framer-motion` npm package is maintained alongside the new `motion` package and v12 has no breaking changes. **Do not migrate to `motion/react` imports** during this effort; it would be a separate refactor with no functional benefit.

## 3D Component Patterns

**Confidence: HIGH** (verified against R3F v9 + drei v10 docs and existing MindGraph3D implementation)

### Architecture Pattern: Lazy Canvas with Error Boundary + 2D Fallback

Every 3D component follows this structure:

```
<ErrorBoundary fallback={<2DFallback />}>
  <Suspense fallback={<GlassSkeleton />}>
    <Canvas>
      <Scene3D />
    </Canvas>
  </Suspense>
</ErrorBoundary>
```

### Performance Rules (from PROJECT.md constraints)

| 3D Component | Node Cap | Rationale |
|-------------|----------|-----------|
| Dashboard Activity Mesh | 50 | First paint — must be instant |
| MindGraph / Nebula Knowledge Graph | 200 | Complex interaction — budget for OrbitControls |
| Launchpad Cost Treemap | 20 | Simple hierarchy — few large blocks |
| DbInspector Schema Orb | 30 | Schema tables — moderate count |

### R3F Best Practices (2026)

1. **Mutate in useFrame, not React state**: Use `useRef` + direct Three.js mutations for per-frame updates. Never call `setState` in animation loops.
2. **Drei helpers over raw Three.js**: Use `<OrbitControls>`, `<Html>`, `<Line>`, `<Detailed>` from drei rather than writing imperative equivalents.
3. **Dispose on unmount**: R3F auto-disposes geometries/materials, but manually dispose textures and render targets in `useEffect` cleanup.
4. **Instanced rendering**: For node-heavy scenes (MindGraph), use `<InstancedMesh>` — one draw call for all nodes of the same geometry.
5. **WebGPU**: Do NOT adopt WebGPURenderer yet. R3F v9 uses WebGLRenderer. WebGPU support comes in R3F v10 (currently alpha). Wait for stable release.

## Theme Engine Architecture

**Confidence: HIGH** (existing pattern is industry-standard; extending it is straightforward)

### Current Architecture (preserve exactly)

```
[data-theme="name"] {
  --color-background: oklch(...);
  --color-surface: oklch(...);
  --color-accent: oklch(...);
  /* ... 16 tokens total */
}
```

Tailwind v4's `@theme` block maps these to utility classes (`bg-background`, `text-accent`, etc.). Theme switching sets `data-theme` attribute on root element. **This is the correct 2026 pattern** — CSS custom properties + `@theme` + `data-theme` selector.

### Extension for Glass Tokens

Add glass-specific tokens to `@theme` (global defaults) and override per-theme only if needed:

```css
@theme {
  --glass-bg: oklch(100% 0 0 / 0.03);
  --glass-border: oklch(100% 0 0 / 0.08);
}

/* Override for high-chroma themes where white glass washes out the accent */
[data-theme="midnight-bloom"] {
  --glass-bg: oklch(100% 0 0 / 0.04);
  --glass-border: oklch(100% 0 0 / 0.10);
}
```

### Theme Store (Zustand)

The theme store should expose:
- `theme: string` — current data-theme value
- `setTheme(name)` — updates attribute + persists to electron-store
- `accentColor: string` — computed from current theme's `--color-accent`

**Do not store CSS variable values in JS**. Read them via `getComputedStyle` only when 3D components need color values (for Three.js materials).

### OKLch Color Space

OKLch is the correct choice for perceptually uniform dark themes. All new themes must use OKLch (not hex or rgb). The existing themes already mix hex (older ones like `portfolio`) and OKLch (newer ones like `nord`, `rose-pine`). During migration, convert legacy hex themes to OKLch for consistency.

## Font Loading in Electron

**Confidence: HIGH** (existing pattern verified; extension is mechanical)

### Current Pattern (correct — keep it)

```css
@font-face {
  font-family: "JetBrains Mono";
  src: url("./fonts/JetBrainsMono-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### Extension for New Fonts

1. Download woff2 files into `src/renderer/src/assets/fonts/`:
   - `PlusJakartaSans-Variable.woff2` (variable font, all weights)
   - `PlusJakartaSans-Italic-Variable.woff2`
   - `GeistMono-Regular.woff2`
   - `GeistMono-Bold.woff2`

2. Add `@font-face` declarations in `main.css` (before `@theme`).

3. Update `@theme` block:
   ```css
   --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
   --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, monospace;
   ```

4. Update `base.css` body `font-family` to reference the new `--font-sans` token.

### Why woff2 in Electron

Electron bundles the renderer as a Chromium-based browser. Local `@font-face` with `woff2` format is the most reliable approach — no network requests, no FOUT, instant availability. `font-display: swap` is still recommended as a safety net for async CSS loading during dev.

### Why NOT Google Fonts / Fontsource npm

The project is an offline-capable desktop app. Fetching fonts from a CDN adds a network dependency and potential FOUT. Self-hosted woff2 files eliminate both.

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Tailwind v4 `@theme` for design tokens | CSS-in-JS (styled-components, Emotion) | Already using Tailwind; CSS-in-JS adds runtime overhead and a second styling paradigm |
| framer-motion for all animations | CSS @keyframes only | Complex orchestration (stagger, layout, gesture) needs JS; CSS alone cannot handle shared `layoutId` or spring physics |
| framer-motion for all animations | react-spring | framer-motion already in deps, used in Cortex; react-spring would add a second animation paradigm |
| framer-motion for all animations | GSAP | GSAP has restrictive licensing for commercial use; framer-motion is MIT and already integrated |
| @react-three/fiber for 3D | raw Three.js imperative | R3F integrates with React lifecycle, props, Suspense. Imperative Three.js fights React's model |
| OKLch color space | HSL | OKLch is perceptually uniform — a 10% lightness change looks the same across hues. HSL is not. Critical for multi-theme consistency |
| Self-hosted woff2 fonts | @fontsource npm packages | Self-hosted is simpler for Electron — no node_modules font resolution path issues, direct file:// access |
| tw-animate-css | tailwindcss-animate | tailwindcss-animate uses legacy JS plugin API incompatible with Tailwind v4's CSS-first architecture |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `motion` npm package (new name) | Would require changing all imports from `framer-motion` for zero functional benefit during a UI revamp | Keep `framer-motion` imports as-is |
| Three.js WebGPURenderer | R3F v9 does not support it. R3F v10 (alpha) does, but is not stable. Electron's Chromium supports WebGPU but the R3F ecosystem is not ready | Stick with WebGLRenderer (default) |
| CSS `backdrop-filter` nesting | Stacking multiple blur layers compounds GPU cost and creates visual mudiness | Only outermost container gets `backdrop-blur`; inner elements use opaque `bg-white/[0.02]` |
| `next-themes` | Designed for Next.js SSR hydration timing. Zenith is an Electron SPA with no SSR | Direct `data-theme` attribute manipulation via Zustand store |
| shadcn/ui component library | PROJECT.md explicitly excludes it. Would replace hand-crafted glass components with opinionated defaults | Custom glass component library |
| React.memo on 3D scene components | R3F manages its own reconciliation. React.memo on Canvas children can prevent necessary updates | Use R3F's `invalidate` and `useFrame` patterns instead |
| `animate` prop with inline objects | Creates new object references every render, causing unnecessary animation recalculations | Use named `variants` objects defined outside components |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @react-three/fiber@^9.5.0 | react@^19.2.1, three@^0.183.2 | R3F v9 specifically targets React 19. Confirmed working. |
| @react-three/drei@^10.7.7 | @react-three/fiber@^9.5.0 | Drei 10 pairs with R3F 9. Do NOT install Drei 11 (alpha, for R3F 10). |
| framer-motion@^12.5.0 | react@^19.2.1 | v12 fully supports React 19 concurrent features. |
| tailwindcss@^4.0.12 | @tailwindcss/vite@^4.0.12 | Must match major+minor versions. Already aligned. |
| tw-animate-css@^1.2.5 | tailwindcss@^4.x | Pure CSS — no plugin API dependency. |
| three@^0.183.2 | @types/three@^0.183.1 | Types must match three.js minor version. Already aligned. |

## Installation

```bash
# No npm installs needed — all dependencies already present.

# Font files only — manually download and place in src/renderer/src/assets/fonts/:
# 1. Plus Jakarta Sans Variable:
#    https://fonts.google.com/specimen/Plus+Jakarta+Sans (Download Family -> extract woff2)
#    OR: https://gwfh.mranftl.com/fonts/plus-jakarta-sans?subsets=latin
#
# 2. Geist Mono:
#    https://github.com/vercel/geist-font/releases/tag/1.3.0 (download zip -> extract woff2)
```

## Sources

- [framer-motion on npm](https://www.npmjs.com/package/framer-motion) — version 12.38.0 latest, confirmed v12 has no breaking changes
- [Motion documentation](https://motion.dev/docs) — API reference, upgrade guide
- [Motion changelog](https://motion.dev/changelog) — v12.36.0 features (Mar 2026)
- [@react-three/fiber on npm](https://www.npmjs.com/package/@react-three/fiber) — v9.5.0, confirmed React 19 compatibility
- [@react-three/drei on npm](https://www.npmjs.com/package/@react-three/drei) — v10.7.7 latest
- [R3F documentation](https://r3f.docs.pmnd.rs/getting-started/introduction) — performance patterns, useFrame best practices
- [Tailwind CSS backdrop-blur docs](https://tailwindcss.com/docs/backdrop-filter-blur) — utility classes for glass morphism
- [Epic Web Dev — Glassmorphism with Tailwind](https://www.epicweb.dev/tips/creating-glassmorphism-effects-with-tailwind-css) — glass recipe patterns
- [tw-animate-css on GitHub](https://github.com/Wombosvideo/tw-animate-css) — Tailwind v4 compatible animation utilities
- [Vercel Geist Font](https://vercel.com/font) — Geist Mono download, SIL OFL license
- [Plus Jakarta Sans on Google Fonts](https://fonts.google.com/specimen/Plus%2BJakarta%2BSans) — woff2 download
- [Three.js WebGPU migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide) — why to wait for R3F v10
- [LogRocket — Tailwind CSS guide 2026](https://blog.logrocket.com/tailwind-css-guide/) — @theme directive, OKLch patterns
- [web.dev — Color themes with Baseline CSS](https://web.dev/articles/baseline-in-action-color-theme) — CSS custom properties theme architecture

---
*Stack research for: Zenith Obsidian Glass design system*
*Researched: 2026-03-24*
