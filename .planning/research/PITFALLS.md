# Pitfalls Research

**Domain:** Electron + React desktop app UI design system overhaul (glass morphism, 3D, animation, multi-theme)
**Researched:** 2026-03-24
**Confidence:** HIGH (based on codebase analysis + domain expertise)

## Critical Pitfalls

### Pitfall 1: Glass Morphism Opacity Wars Across 18 Themes

**What goes wrong:**
Glass components use semi-transparent backgrounds (`bg-white/[0.03]`) and `backdrop-blur-xl`. These values are tuned against the current Cortex dark backgrounds. When applied across 18 themes with different background lightness (Zenith ranges from oklch(10%) to oklch(16%)), the glass effect either disappears (too subtle on lighter surfaces) or creates muddy, unreadable overlaps (on saturated themes like Synthwave or Rose Pine). Cards stacked on glass panels create compounding opacity that kills text contrast.

**Why it happens:**
Developers tune glass on one theme (usually the default) and assume it transfers. It does not. A `bg-white/[0.03]` that looks crisp on oklch(10%) background is invisible on oklch(16%). The existing `GLASS_CARD` constant in `cortex-theme.ts` is a single hardcoded string — no theme awareness.

**How to avoid:**
- Define glass tokens as CSS custom properties per theme: `--glass-bg`, `--glass-border`, `--glass-blur-intensity`. Each of the 18 `[data-theme]` blocks in `main.css` gets its own glass tuning.
- Build a visual QA matrix: render GlassCard on every theme, screenshot, compare. Automate with Playwright if possible.
- Test stacking: glass-on-glass (modal over card over panel) must remain readable on all 18 themes.

**Warning signs:**
- Text contrast dipping below 4.5:1 on any theme
- Glass cards becoming invisible (no visual separation from background)
- Developers adding theme-specific `!important` overrides or inline styles to "fix" individual themes

**Phase to address:**
Phase 1 (Design System Foundation) — glass tokens must be theme-aware from day one, not patched later.

---

### Pitfall 2: Backdrop-Blur Performance Cliff in Electron's Chromium

**What goes wrong:**
`backdrop-blur` triggers GPU compositing for every element that uses it. Electron's Chromium compositor handles a few blurred layers fine, but the plan calls for glass on nearly every surface: cards, buttons, inputs, selects, tabs, modals, toasts, skeletons. On a page like Cortex OverviewTab with 10+ cards, each with `backdrop-blur-xl`, the compositor stalls. Frame drops below 30fps on integrated GPUs (Intel Iris, Apple M-series under load). The 3D Canvas components running simultaneously make this worse — they compete for the same GPU pipeline.

**Why it happens:**
Each `backdrop-blur` element creates a separate compositing layer that must sample and blur the pixels behind it every frame. Unlike `box-shadow` or `border`, blur cost scales with element count AND blur radius. Developers test on powerful machines and never see the problem.

**How to avoid:**
- Limit `backdrop-blur` to surfaces that actually overlap content: modals, dropdowns, floating panels, the sidebar. Static cards sitting on a solid background do NOT need blur — use a solid semi-transparent color instead (`bg-surface-elevated/50` without blur).
- Create two glass tiers: `GlassCard` (no blur, translucent bg only) and `GlassOverlay` (blur + translucent, for floating elements only).
- Profile with Chrome DevTools Layers panel — if you see more than 5-6 blur layers simultaneously visible, refactor.
- Use `will-change: transform` sparingly and never on blur elements (it forces persistent compositing layers).

**Warning signs:**
- DevTools shows >8 compositing layers with blur
- GPU memory usage >300MB in Electron's task manager
- Scroll jank or animation stutter appearing only on pages with many glass elements
- Users with integrated GPUs reporting slowness

**Phase to address:**
Phase 1 (Design System Foundation) — bake the two-tier glass strategy into the component library before migration begins.

---

### Pitfall 3: Big-Bang Migration of 81 Components Creates Untestable Chaos

**What goes wrong:**
The project doc says "all plugins migrated together (not phased)" to achieve consistency. In practice, touching 81 components simultaneously means: every PR is enormous, visual regressions are impossible to spot in review, the app is broken for weeks during migration, and rollback becomes impossible. A single bad glass token cascades across the entire UI.

**Why it happens:**
The desire for "consistency" is correct, but the execution strategy of one massive migration is wrong. Consistency comes from the design system (shared tokens + shared components), not from migrating everything simultaneously.

**How to avoid:**
- Build the shared component library FIRST as standalone (GlassCard, GlassButton, etc.) with a Storybook or test harness.
- Migrate plugin-by-plugin in a deterministic order: Cortex first (already closest to glass), then one small plugin (TextCraft or Launchpad) to validate the system, then the rest.
- Each plugin migration is one PR that can be reviewed and tested in isolation.
- "Consistency" is enforced by the shared components, not by simultaneous deployment.

**Warning signs:**
- PRs touching >15 files at once
- "It looks fine on my screen" reviews without cross-theme testing
- Merge conflicts between parallel component migrations
- QA finding regressions in plugins that weren't intentionally changed

**Phase to address:**
Phase 2 (Component Migration) — structure as plugin-by-plugin PRs, not one monolithic migration.

---

### Pitfall 4: WebGL Context Limits and Canvas Stacking

**What goes wrong:**
The plan adds four new 3D components (Dashboard Activity Mesh, Nebula Knowledge Graph, Launchpad Cost Treemap, DbInspector Schema Orb) on top of the existing MindGraph3D. Each `<Canvas>` from react-three-fiber creates a separate WebGL context. Browsers/Electron limit WebGL contexts to ~8-16 per process. If a user navigates quickly or components don't properly dispose, contexts leak. Once the limit is hit, 3D components silently fail to render (black rectangles) or crash the renderer process.

**Why it happens:**
React's reconciler doesn't automatically dispose WebGL contexts on unmount. The existing `MindGraph3D.tsx` creates geometries and materials in `useMemo` without cleanup. Developers add new Canvas components without tracking total active contexts.

**How to avoid:**
- Share a single Canvas where possible (use portals/scenes within one context).
- Enforce cleanup: every `useEffect` that creates Three.js objects (geometries, materials, textures, render targets) must return a dispose function.
- Add an error boundary around every `<Canvas>` with a 2D fallback (the project doc mentions this — enforce it).
- Lazy-load 3D components so only the visible one has an active context. When navigating away, unmount the Canvas entirely.
- Monitor `renderer.info.memory` in development to catch leaks.

**Warning signs:**
- Black rectangles appearing in Canvas areas
- Console warnings: "Too many active WebGL contexts"
- Increasing GPU memory over time without navigation
- Electron renderer process crashes after extended use

**Phase to address:**
Phase 3 (3D Components) — establish the shared Canvas / lazy-loading pattern before building the four new 3D views.

---

### Pitfall 5: Framer-Motion Bundle Size Explosion and Animation Conflicts

**What goes wrong:**
Framer-motion is already in deps but only used in Cortex (~20 files). Expanding to all 81 components means every component imports motion primitives. Framer-motion's full bundle is ~33KB gzipped. Tree-shaking helps, but `AnimatePresence`, `useAnimation`, `motion.div`, `variants`, and `LayoutGroup` together pull in most of it. More critically: nested `AnimatePresence` components (e.g., a modal inside a page transition inside a tab animation) create exit-animation conflicts where elements flash, jump, or fail to unmount.

**Why it happens:**
Developers add `AnimatePresence` at every level for enter/exit animations without understanding that nested instances require explicit `mode` and `key` coordination. The existing Cortex `cardVariants` pattern works because it's flat — staggered cards, no nesting. Page transitions + modal transitions + list animations = deep nesting.

**How to avoid:**
- Define a motion hierarchy: page transitions own `AnimatePresence` at the route level, tab content owns it at the tab level, and modals use a portal-based approach with their own root-level `AnimatePresence`. Never nest more than 2 levels deep.
- Create shared motion variant presets in a single `motion-variants.ts` file (the project doc already calls for this). Enforce that components import from this file, not define ad-hoc variants.
- Use `motion.div` with `layout` prop sparingly — layout animations are expensive and can cause unexpected reflows.
- Import `m` from `framer-motion` instead of `motion` where you only need simple transforms (smaller import).

**Warning signs:**
- Elements failing to unmount (ghost elements visible behind new content)
- Exit animations not playing (component just disappears)
- Layout shifts when navigating between tabs
- Bundle analyzer showing framer-motion chunks duplicated across lazy-loaded routes

**Phase to address:**
Phase 1 (Design System Foundation) — define the motion hierarchy and shared variants before any component migration touches animations.

---

### Pitfall 6: Theme Variable Explosion — 18 Themes x Growing Token Set

**What goes wrong:**
The current `main.css` already has 12 theme blocks, each with ~18 CSS custom properties. Adding 6 more themes + glass tokens + typography tokens means maintaining 18 blocks of 25+ variables each (450+ variable declarations). A single typo in one theme block (wrong oklch value, missing variable) breaks that theme silently — no build error, just wrong colors at runtime. Testing all 18 is tedious, so it doesn't happen, and broken themes ship.

**Why it happens:**
CSS custom property systems have no type checking. Copy-paste errors between theme blocks are invisible. The current theme definitions use a mix of oklch() and hex (#f59e0b in Portfolio) which makes comparison harder. No automated validation exists.

**How to avoid:**
- Generate theme CSS from a structured source (a TypeScript/JSON theme definition file that gets compiled to CSS). This enables: type checking, required-field enforcement, automated contrast ratio validation.
- Standardize on oklch() for all themes — the Portfolio theme currently uses hex while others use oklch, making it the odd one out.
- Build a theme validator script that: checks all required variables exist per block, validates contrast ratios for text-on-background combinations, and flags missing variables.
- Create a visual theme gallery page (in Settings) that renders all 18 themes simultaneously as thumbnails — instant visual regression detection.

**Warning signs:**
- Themes rendering with wrong accent colors or missing variables (fallback to default)
- Copy-paste blocks in CSS with subtle differences that are hard to spot in review
- "Works on default theme" but nobody tests the other 17

**Phase to address:**
Phase 1 (Design System Foundation) — migrate to generated theme CSS before adding 6 new themes.

---

### Pitfall 7: 3D Components Breaking Glass Morphism (Z-Index and Stacking Context)

**What goes wrong:**
`<Canvas>` from react-three-fiber renders into a `<canvas>` element that creates its own stacking context. Glass components using `backdrop-blur` can only blur content that is in the same stacking context and below them in paint order. A Canvas element adjacent to or behind glass panels will not be blurred correctly — you either get: glass panels that don't blur the 3D content behind them, or 3D content that renders on top of modals/dropdowns despite z-index.

**Why it happens:**
WebGL canvas elements don't participate in CSS compositing the same way DOM elements do. `backdrop-blur` samples the rendered pixels behind an element, but a Canvas renders independently on the GPU. The interaction between CSS compositing and WebGL is poorly understood by most developers.

**How to avoid:**
- Never layer glass components directly over Canvas elements. Use solid backgrounds (not translucent) for panels adjacent to 3D views.
- Place 3D components in dedicated viewport areas with clear DOM boundaries, not interspersed with glass cards.
- For overlays on 3D content (tooltips, labels), use `@react-three/drei`'s `Html` component (which renders inside the Canvas's coordinate space) instead of absolute-positioned DOM elements.
- Test the specific combination: glass modal/dropdown appearing while a 3D component is visible.

**Warning signs:**
- Backdrop-blur showing solid color instead of frosted effect near Canvas elements
- 3D content "punching through" modals or dropdowns
- Hover tooltips in 3D views appearing at wrong positions

**Phase to address:**
Phase 2 and Phase 3 overlap — layout decisions in Phase 2 must anticipate Phase 3's Canvas placement.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded glass values (`bg-white/[0.03]`) instead of theme tokens | Faster to write | Breaks on new themes, unmaintainable across 81 components | Never — already exists in Cortex, must be refactored early |
| Inline framer-motion variants per component | Quick animation | Inconsistent timing/easing across app, impossible to tune globally | During prototyping only — extract to shared file before merge |
| Skipping `dispose()` in Three.js components | Faster dev cycle | GPU memory leaks, context exhaustion after extended use | Never |
| Copy-pasting theme blocks in CSS | Quick new theme | 450+ lines of duplicated structure, typo-prone | Never — use generated CSS |
| Using `backdrop-blur` on every glass component | Visually consistent | GPU performance cliff on complex pages | Only for floating/overlay elements |
| Lazy-loading 3D without proper Suspense boundaries | Simpler code | White flash / layout shift when 3D loads | Never — always wrap in Suspense with skeleton fallback |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| react-three-fiber + framer-motion | Trying to animate Canvas props with framer-motion (they use different renderers) | Use Three.js `useFrame` for 3D animations, framer-motion only for the wrapper DOM elements |
| Tailwind v4 @theme + CSS custom properties | Defining glass tokens in JS/TS instead of @theme block, causing Tailwind utilities to not recognize them | All design tokens go in `@theme` block in `main.css`, then override per `[data-theme]` |
| Electron `BrowserWindow` + backdrop-blur | Assuming `backgroundMaterial: 'acrylic'` (Windows) or `vibrancy` (macOS) stacks with CSS backdrop-blur | They are independent systems — use only CSS backdrop-blur for cross-platform consistency, do not mix with OS-level vibrancy |
| Zustand stores + theme switching | Storing derived theme values in Zustand, causing stale colors after theme change | Read CSS custom properties at render time via `getComputedStyle` or Tailwind classes, never cache theme colors in JS state |
| d3-force-3d + React strict mode | Force simulation ticks running twice in development (React 18+ strict mode double-invokes effects) causing jittery initial layout | Guard simulation start with a ref flag, or accept the dev-mode jitter and verify it's clean in production build |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Backdrop-blur on scrollable lists | Scroll jank >16ms frame times | Use blur only on fixed/sticky headers, not on every list item | >20 glass elements simultaneously visible |
| Unthrottled `useFrame` in multiple 3D components | CPU spike, battery drain on laptops | Use `useFrame` with frame-skip logic (every 2nd or 3rd frame for non-critical animations) | 2+ Canvas components mounted simultaneously |
| Framer-motion `layout` animations on large lists | Layout thrashing, 100ms+ reflows | Use `layoutId` only for shared-element transitions between views, never on list items | Lists with >30 items |
| Three.js geometry recreation on re-render | GC pauses, GPU upload stalls | Memoize geometries with `useMemo`, use `BufferGeometry` instances, never create geometry in render function | Any component re-rendering >2x/second |
| CSS custom property reads in animation loops | Forced style recalculation per frame | Cache resolved values in JS variables, update only on theme change event | Animating >5 elements simultaneously |
| Font loading flash (FOUT) during font swap | Text reflows when Plus Jakarta Sans loads, layout shifts | Preload woff2 fonts in HTML `<head>`, use `font-display: swap` with size-adjust to minimize shift | First page load, especially on slow disk |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Loading custom fonts from CDN instead of bundled woff2 | Network dependency in desktop app, potential MITM on font files | Bundle all fonts as local woff2 assets (project already does this correctly) |
| WebGL shader injection via user-controlled data in 3D labels | Unlikely but possible XSS vector if entity names are rendered as HTML inside `<Html>` drei component | Sanitize all text rendered in Three.js `Html` overlays, never use `dangerouslySetInnerHTML` in 3D labels |
| Theme CSS injection via malicious theme names in settings | If theme names are used in CSS selectors without sanitization | Validate theme identifiers against an allowlist, never construct `[data-theme]` selectors from user input |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Glass everywhere eliminates visual hierarchy | Users can't distinguish primary content from secondary — everything looks the same | Reserve full glass (blur + translucent) for elevated surfaces only; use subtle differentiation (border weight, shadow depth) for hierarchy within glass |
| Animation fatigue from universal framer-motion | Every click triggers animation, making the app feel slow for power users | Respect `prefers-reduced-motion`, add a "reduce animations" toggle in Settings, keep workhorse interactions (tab switch, list scroll) snappy (<150ms) |
| 3D components as primary UI (not supplementary) | Users waiting for WebGL to initialize just to see their data, 3D harder to read than 2D tables | 3D must always be opt-in or secondary — show data in 2D first, offer 3D as an enhanced visualization. Never gate functionality behind 3D. |
| Skeleton loaders that don't match final layout | Content shifts when real data replaces skeleton, breaking user's spatial memory | Match skeleton dimensions exactly to loaded content; use fixed-height containers |
| Theme switching causes flash of unstyled content | Jarring white/wrong-color flash during transition | Apply theme class synchronously before React render, use CSS transitions on custom properties for smooth theme morphing |

## "Looks Done But Isn't" Checklist

- [ ] **Glass components:** Tested on all 18 themes, not just the default — verify contrast ratios with browser DevTools accessibility audit
- [ ] **3D components:** Error boundary + 2D fallback tested by force-failing WebGL (Chrome flag `--disable-webgl`) — verify fallback renders usable data
- [ ] **Animations:** Tested with `prefers-reduced-motion: reduce` enabled — verify no motion-dependent functionality is lost
- [ ] **Font swap:** Tested with network throttling / cold cache — verify no layout shift when Plus Jakarta Sans loads
- [ ] **Theme variables:** All 18 themes have every required CSS variable — verify with a script that parses `main.css` and checks completeness
- [ ] **3D cleanup:** Navigate away from every 3D view and check GPU memory — verify no context leaks via `chrome://gpu`
- [ ] **Stacking contexts:** Open a modal/dropdown while a 3D component is visible — verify correct z-ordering and no blur artifacts
- [ ] **Scroll performance:** Scroll a long list of glass cards at 60fps — verify with DevTools Performance tab, not just eyeballing
- [ ] **Bundle size:** Compare before/after chunk sizes — verify framer-motion isn't duplicated across lazy chunks

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Glass opacity broken across themes | MEDIUM | Extract hardcoded values to CSS variables, add per-theme overrides — mechanical but touches many files |
| Backdrop-blur performance cliff | LOW | Swap `backdrop-blur` to solid translucent bg on non-overlay elements — find-and-replace in component library |
| WebGL context leaks | HIGH | Audit every Three.js component for missing dispose calls, add ref-tracking system — requires understanding each component's lifecycle |
| Animation nesting conflicts | MEDIUM | Restructure AnimatePresence hierarchy — may require layout changes to component tree |
| Theme variable inconsistency | LOW | Write a validation script, fix missing/wrong values — tedious but straightforward |
| 3D/glass stacking conflicts | HIGH | Requires layout restructuring to separate 3D viewport areas from glass compositing layers — architectural change |
| Font loading layout shift | LOW | Add `size-adjust` and preload hints — small CSS change |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Glass opacity across themes | Phase 1: Design System Foundation | Render GlassCard component on all 18 themes, screenshot comparison |
| Backdrop-blur performance | Phase 1: Design System Foundation | DevTools Layers panel shows <6 blur layers on most complex page |
| Big-bang migration chaos | Phase 2: Component Migration | Each plugin migration is a separate, reviewable PR |
| WebGL context limits | Phase 3: 3D Components | Navigate through all 3D views rapidly, verify no black rectangles or crashes |
| Framer-motion conflicts | Phase 1: Design System Foundation | Nested animation test: page transition + tab switch + modal open simultaneously |
| Theme variable explosion | Phase 1: Design System Foundation | Automated CSS validator runs in CI, catches missing variables |
| 3D + glass stacking | Phase 2-3 overlap | Modal opened over 3D view renders correctly on all platforms |
| Animation fatigue | Phase 2: Component Migration | User testing with reduced-motion preference, timing audit (<150ms for common actions) |
| Font loading shift | Phase 1: Design System Foundation | Lighthouse CLS score <0.05 after font swap |

## Sources

- Codebase analysis: `src/renderer/src/plugins/cortex/cortex-theme.ts` — existing glass tokens are hardcoded strings, not theme-aware
- Codebase analysis: `src/renderer/src/assets/main.css` — 12 theme blocks with inconsistent formats (hex vs oklch)
- Codebase analysis: `src/renderer/src/plugins/cortex/components/MindGraph3D.tsx` — existing 3D component lacks dispose cleanup
- Codebase analysis: framer-motion usage confined to Cortex (20 files) and Nebula (3 files), zero in other 4 plugins
- Codebase analysis: `backdrop-blur` used in 24 files, all within Cortex — no performance issues yet because it's one plugin
- Chromium compositing documentation — backdrop-filter creates separate compositing layers per element
- WebGL context limits — browser-enforced, typically 8-16 per renderer process
- Framer-motion AnimatePresence nesting — known issue in complex SPA layouts (MEDIUM confidence, based on community patterns)

---
*Pitfalls research for: Zenith "Obsidian Glass" UI design system overhaul*
*Researched: 2026-03-24*
