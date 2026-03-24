# Project Research Summary

**Project:** Zenith — Obsidian Glass UI Design System Overhaul
**Domain:** Electron desktop app — unified glass morphism design system with 3D components, animation system, and 18-theme engine
**Researched:** 2026-03-24
**Confidence:** HIGH (stack verified against existing deps; architecture grounded in codebase analysis; pitfalls identified from direct code inspection)

## Executive Summary

Zenith is an Electron + React 19 + Tailwind v4 developer tool undergoing a comprehensive UI design system overhaul — "Obsidian Glass." The project already has every required npm dependency installed; this effort is purely about using them correctly and consistently. The core task is building a shared `ui/` component library (GlassCard, GlassButton, GlassInput, GlassTab, etc.) backed by a centralized motion system (`lib/motion.ts`) and extended CSS token system, then migrating all 6 plugins and 4 core pages to consume it. Currently, only the Cortex plugin has glass styling — it must become the template, not the exception.

The recommended approach is strictly bottom-up: CSS tokens first, motion system second, component library third, then migrate pages and plugins incrementally (one plugin per PR). The most significant risk is treating this as a big-bang migration — it must be phased by plugin to stay reviewable and recoverable. A second-order risk is performance: `backdrop-blur` creates GPU compositing layers, and a naive "glass on everything" implementation will cause frame drops on integrated GPUs. The fix is a two-tier glass strategy: blur only on floating/overlay surfaces, solid translucent fills on static cards. The 3D scenes (Dashboard Mesh, Nebula Graph, etc.) are independent mini-projects and should be deferred until the core glass system is proven stable.

No new npm packages are needed. The only new assets are two font families (Plus Jakarta Sans and Geist Mono, as self-hosted woff2 files). The design differentiator — full-commitment glass morphism + 3D data visualizations + 18 curated dark themes — has no direct competitor in the developer tools space. Executing this correctly requires disciplined phase ordering, per-theme QA, and strict architectural boundaries between the design system layer and the plugin/feature layer.

## Key Findings

### Recommended Stack

All required technology is already installed. Tailwind v4's `@theme` block is the single source of truth for design tokens — all glass values (`--glass-bg`, `--glass-border`, `--glass-blur`) live here and override per `[data-theme]` selector. Framer-motion v12 handles all React-side animation (variants, page transitions, micro-interactions) with `useReducedMotion` as the mandatory reduced-motion gate. React Three Fiber v9 + drei v10 handle all 3D scenes, and the pattern is: lazy-loaded Canvas inside ErrorBoundary + Suspense with a 2D fallback. Zustand manages per-plugin state and theme selection. The font strategy is self-hosted woff2 — no CDN, no Fontsource npm packages — because Electron is offline-capable.

**Core technologies:**
- Tailwind CSS v4 (`^4.0.12`): CSS-first design tokens via `@theme`, OKLch colors, tree-shaking — already powers all 12 themes
- framer-motion (`^12.5.0`): All animation (variants, page transitions, reduced-motion) — already used in Cortex; no import migration needed
- @react-three/fiber (`^9.5.0`) + drei (`^10.7.7`): Declarative 3D scenes — already powers MindGraph3D
- Zustand (`^5.0.3`): Per-plugin state + theme store — already manages all plugin stores
- tw-animate-css (`^1.2.5`): Tailwind v4-compatible CSS animation utilities — pure CSS, no JS plugin API
- Plus Jakarta Sans + Geist Mono (woff2 files): Font upgrade — the only new assets required

### Expected Features

The revamp must deliver a unified glass aesthetic across every screen. Currently only Cortex has glass styling; the remaining 5 plugins and 4 core pages are flat/inconsistent. Every component migration must result in the same visual contract: `bg-white/[0.03]`, `backdrop-blur-xl` (overlays only), `border-white/[0.08]`, OKLch-based theme tokens.

**Must have (table stakes):**
- Consistent glass component library across all 81 components — the revamp is not "shipped" without this
- Design token extension (glass-specific CSS custom properties in `@theme`) — foundation that everything else requires
- Motion variants library with reduced-motion support — animation consistency and accessibility baseline
- Skeleton loaders replacing all bare spinners — table stakes since 2020
- Empty states with CTAs for zero-data views — prevents blank screen failures
- Typography upgrade (Plus Jakarta Sans + Geist Mono) — high impact, low effort
- Page/tab transitions with `AnimatePresence` — 200ms crossfades are expected in 2026
- Button/input hover, active, focus, disabled states — UI feels dead without these

**Should have (differentiators):**
- 6 new dark themes (Midnight Bloom, Copper Forge, Ocean Depth, Nebula Dust, Obsidian, Jade Temple) + visual theme selector grid — 18 curated themes is a genuine differentiator; no competitor has this breadth
- Micro-interactions suite (sidebar glow, active bar slide, icon morphs, button press scale) — cumulative "craft" effect
- Parallax empty state illustrations — distinctive vs. competitors' static SVGs
- Scroll shadows and scroll progress indicators — polish details

**Defer (v2+):**
- All four 3D scenes (Dashboard Activity Mesh, Nebula Knowledge Graph, Launchpad Cost Treemap, DbInspector Schema Orb) — each is a 2-5 day mini-project; defer until glass system is stable and proven
- 3D Nebula Knowledge Graph upgrade (existing 2D works; 3D is an enhancement)

### Architecture Approach

The architecture is a strict layer cake: CSS Token System → Motion System → Glass Component Library (`ui/`) → Plugins/Pages (consumers). The key structural addition is a new `ui/` directory at `src/renderer/src/ui/` containing all shared glass primitives — this is explicitly separated from `components/` (app shell/features) to enforce the rule that `ui/` has no business logic and no upward dependencies. A single `lib/motion.ts` file centralizes all framer-motion variant objects; components never define animation parameters inline. Plugin-specific tokens (KIND_COLORS in Cortex) stay in plugin directories; the glass constants (GLASS_CARD, GLASS_SURFACE) migrate to `ui/glass/` and the plugin-local copies are deleted.

**Major components:**
1. **Token System** (`main.css` @theme + [data-theme] blocks) — CSS custom properties for color, typography, glass intensity; drives all theming; no JS coupling
2. **Motion System** (`lib/motion.ts` + `lib/use-reduced-motion.ts`) — shared framer-motion variant registry; all components import from here, never define inline variants
3. **Glass Component Library** (`ui/glass/`) — GlassCard, GlassButton, GlassInput, GlassSelect, GlassTab, GlassBadge, GlassModal, GlassToast, GlassSkeleton, EmptyState; consumes tokens and motion; barrel-exported from `ui/index.ts`
4. **3D Visualization Modules** (per-scene, in plugin dirs) — each is a self-contained ErrorBoundary + Suspense + Canvas + 2D fallback wrapper; lazy-loaded; consumes GlassCard for chrome
5. **Plugin/Page Views** (consumers) — import exclusively from `ui/`, own Zustand store, own domain-specific tokens

### Critical Pitfalls

1. **Glass opacity inconsistency across 18 themes** — `bg-white/[0.03]` tuned on one theme fails on lighter or more saturated themes. Prevention: define `--glass-bg`, `--glass-border`, `--glass-blur` as CSS custom properties per theme in `main.css` from day one; build a visual QA matrix rendering GlassCard on all 18 themes. Address in Phase 1 before any migration begins.

2. **Backdrop-blur performance cliff** — every `backdrop-blur` element creates a GPU compositing layer. Applying blur to all 81 components causes frame drops on integrated GPUs. Prevention: two-tier glass strategy — `GlassOverlay` (blur + translucent, floating/overlay elements only) vs. `GlassCard` (solid translucent bg, no blur, for static cards). DevTools Layers panel must show <6 blur layers on any page. Address in Phase 1 by baking this distinction into the component API.

3. **Big-bang migration chaos** — migrating 81 components simultaneously creates untestable PRs, merge conflicts, and impossible rollback. Prevention: build component library standalone first, then migrate plugin-by-plugin with one PR per plugin. Cortex first (already closest), then a small plugin to validate, then the rest. Consistency comes from shared components, not simultaneous deployment.

4. **WebGL context limits and leaks** — each R3F Canvas creates a WebGL context; browsers/Electron limit to ~8-16 per process. Without disposal, contexts leak. Prevention: lazy-load 3D components so only one Canvas is active at a time; enforce `dispose()` in every Three.js `useEffect` cleanup; wrap every Canvas in ErrorBoundary with 2D fallback. Address in Phase 3 before building any new 3D scenes.

5. **Framer-motion AnimatePresence nesting conflicts** — nested AnimatePresence (page transition + tab switch + modal) causes ghost elements, skipped exit animations, and layout shifts. Prevention: define a motion hierarchy (page-level, tab-level, modal via portal) with max 2 nesting levels; define all variants in `lib/motion.ts` before any component migration. Address in Phase 1.

## Implications for Roadmap

The dependency chain is clear and non-negotiable: tokens before motion, motion before components, components before migration, migration before polish. 3D scenes are orthogonal — they can proceed after Phase 3 or in parallel with late Phase 4/5 once the glass system is stable.

### Phase 1: Design System Foundation

**Rationale:** Every subsequent phase depends on this. CSS tokens must be theme-aware from day one (not patched retroactively). The motion system must exist before any component embeds animations. Font swap is additive CSS with no risk — good quick win to include here.
**Delivers:** Extended `@theme` with glass tokens, 6 new `[data-theme]` blocks, `lib/motion.ts` with all variant presets, `lib/use-reduced-motion.ts` hook, Plus Jakarta Sans + Geist Mono fonts loaded, theme validator script.
**Addresses features:** Design token system, motion variants library, typography upgrade, reduced-motion support baseline.
**Avoids pitfalls:** Glass opacity wars (tokens are theme-aware on day 1), backdrop-blur performance cliff (two-tier glass distinction baked in), framer-motion nesting conflicts (motion hierarchy defined before use).
**Research flag:** Standard patterns — skip research-phase. Tailwind v4 @theme and framer-motion Variants are well-documented; implementation follows existing Cortex patterns.

### Phase 2: Glass Component Library

**Rationale:** Components are leaf nodes that consume tokens and motion. They must be built standalone (not in context of any specific plugin) so they can be validated in isolation before migration begins.
**Delivers:** Full `ui/glass/` component library — GlassCard (two tiers: card/overlay), GlassButton, GlassInput, GlassSelect, GlassTab, GlassBadge, GlassModal, GlassToast, GlassSkeleton, EmptyState, ScrollShadow. Barrel export from `ui/index.ts`. Each component validated against all 18 themes.
**Uses:** Tailwind v4 `cn`/`clsx` class composition, framer-motion variants from `lib/motion.ts`, CSS tokens from Phase 1.
**Implements:** Glass Component Library architecture layer; establishes `forwardRef` + `variant` prop pattern for all primitives.
**Avoids pitfalls:** Addresses glass opacity across themes (each component tested per-theme during build, not after migration).
**Research flag:** Standard patterns — skip research-phase. GlassCard compound component with Tailwind class composition is a documented and already-used pattern in this codebase.

### Phase 3: Core App Shell Migration

**Rationale:** Core pages (AppLayout, Sidebar, Dashboard, Settings, Activity, About) are simpler than plugins — fewer custom components, less business logic. Migrating them first validates the component library in a real context with lower risk before tackling the more complex plugins.
**Delivers:** Fully migrated app shell and 4 core pages using `ui/` components. Page/tab transitions via `AnimatePresence`. Sidebar micro-interactions (glow, active bar slide). Consistent navigation chrome.
**Addresses features:** Page transitions, scroll shadows, consistent component styling for core navigation.
**Avoids pitfalls:** Proves the migration pattern (one PR per section) before applying it to 6 plugins; catches any component library gaps early.
**Research flag:** Standard patterns — skip research-phase. Migration is mechanical import-swapping guided by established component API.

### Phase 4: Plugin Migration

**Rationale:** Plugins are the primary surface area (6 plugins = majority of app screens). They are migrated after the core shell proves the system works. Each plugin is a separate PR — Cortex first (already closest to glass), then a small plugin (TextCraft or Launchpad) to validate at smaller scale, then Nebula, DbInspector, and Code Review Bot.
**Delivers:** All 6 plugins fully migrated to `ui/` components. Cortex-specific GLASS_CARD and GLASS_SURFACE constants deleted; replaced with GlassCard usage. Empty states added to all zero-data views. Skeleton loaders replacing all bare spinners.
**Addresses features:** Consistent component styling across all plugins, skeleton loaders, empty states, button/input feedback states.
**Avoids pitfalls:** Plugin-by-plugin PRs (never >15 files at once); no big-bang migration chaos.
**Research flag:** Standard patterns for import migration. However, **Cortex plugin** (MindGraph3D integration, glass-on-3D stacking) may benefit from brief research-phase review before its PR, due to the WebGL + glass compositing interaction (Pitfall 7).

### Phase 5: Theme Collection and Visual Selector

**Rationale:** New themes can only be added after the component library is theme-stable. Adding themes before Phase 2-4 complete means tuning colors against an unstable glass implementation.
**Delivers:** 6 new dark themes (Midnight Bloom, Copper Forge, Ocean Depth, Nebula Dust, Obsidian, Jade Temple) in OKLch. Visual theme selector grid in Settings with CSS-rendered previews. All legacy hex-based themes (Portfolio) converted to OKLch. Theme validator integrated into CI.
**Addresses features:** 18-theme collection, visual theme selector, OKLch color space standardization.
**Avoids pitfalls:** Theme variable explosion (generated/validated CSS rather than copy-pasted blocks).
**Research flag:** Standard patterns for CSS theming. The visual theme selector grid (CSS-rendered mini previews vs. pre-captured screenshots) is the one implementation decision that warrants a brief planning spike — recommend a short research-phase on this component.

### Phase 6: 3D Visualizations

**Rationale:** 3D scenes are independent of the glass system (different rendering pipeline) but consume it (GlassCard wraps Canvas). They are deferred to Phase 6 because each is a 2-5 day mini-project with the highest technical risk (WebGL context limits, performance, fallback handling). The glass system being stable before starting 3D means the `GlassSkeleton` fallback and `GlassCard` chrome already exist and are theme-safe.
**Delivers:** Dashboard Activity Mesh (50-node cap), Nebula Knowledge Graph upgrade (200-node cap), Launchpad Cost Treemap (20-node cap), DbInspector Schema Orb (30-node cap). Each wrapped in ErrorBoundary + Suspense + 2D fallback. Lazy-loaded. Verified no WebGL context leaks.
**Uses:** R3F v9 + drei v10, d3-force-3d, InstancedMesh for node-heavy scenes, `useFrame` (not setState) for per-frame animation.
**Avoids pitfalls:** WebGL context limits (one active Canvas at a time via lazy-load), R3F without error boundary (every Canvas is wrapped), 3D/glass stacking conflicts (3D in dedicated viewport areas, no glass overlaid directly on Canvas).
**Research flag:** **This phase needs research-phase for each 3D scene** — the implementation patterns for InstancedMesh, d3-force-3d simulation lifecycle, and Canvas disposal are well-documented but each scene has unique requirements. Recommend per-scene planning with research-phase before implementation starts.

### Phase 7: Polish and QA

**Rationale:** Refinement requires all components to be migrated and stable. Running cross-theme QA before Phase 4-5 complete would be wasted effort.
**Delivers:** Full micro-interactions suite (sidebar glow, active tab indicator, icon morphs, counter animations, button press scale). Parallax empty state illustrations. Scroll progress bars. Cross-theme visual QA matrix across all 18 themes. Lighthouse CLS <0.05 after font swap. Animation timing audit (<150ms for common interactions).
**Addresses features:** Micro-interactions, parallax illustrations, scroll shadows/progress, accessibility audit.
**Avoids pitfalls:** Animation fatigue (timing audit enforces <150ms for workhorse interactions; reduced-motion toggle in Settings).
**Research flag:** Standard patterns — skip research-phase. Polish is mechanical refinement of existing components.

### Phase Ordering Rationale

- Phases 1 → 2 are hard dependencies: components cannot be built without tokens and motion system.
- Phase 3 before Phase 4: core shell is simpler; validates the component API at low risk before complex plugin migration.
- Phase 5 after Phase 2-4: themes require stable glass components to tune correctly; new themes before stable components is wasted work.
- Phase 6 after Phase 4-5: 3D consumes the glass system (`GlassCard`, `GlassSkeleton`); those must exist and be theme-safe first. 3D is the highest-risk work and benefits from a stable foundation.
- Phase 7 last: polish requires a complete, stable app to refine.
- Phases 4 and 6 can partially overlap in the late stages: once enough plugins are migrated and the glass system is proven, a 3D scene can be developed in parallel.

### Research Flags

Phases needing deeper research during planning:
- **Phase 6 (3D Visualizations):** Each 3D scene warrants a research-phase before implementation. InstancedMesh patterns, d3-force-3d simulation lifecycle, and WebGL disposal strategies are well-documented but scene-specific. Recommend one research-phase per scene or one combined research-phase covering all four.
- **Phase 5 (Visual Theme Selector):** The CSS-rendered theme preview grid implementation (real-time CSS thumbnail vs. pre-captured screenshot approach) needs a planning spike. Brief research-phase recommended before committing to the implementation approach.
- **Phase 4 / Cortex plugin migration:** The interaction between glass `backdrop-blur` and R3F Canvas stacking context (Pitfall 7) should be verified against the specific Cortex layout before migration PR is written.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Design System Foundation):** Tailwind v4 @theme and framer-motion Variants patterns are directly observable in the existing codebase. No unknowns.
- **Phase 2 (Glass Component Library):** Compound component with Tailwind class composition is a fully established pattern; GlassCard already exists in Cortex as a proof of concept.
- **Phase 3 (Core App Shell Migration):** Mechanical import migration following established patterns.
- **Phase 7 (Polish and QA):** Refinement of existing components; no architectural unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All dependencies verified in `package.json`; version compatibility confirmed against official docs; no new packages needed |
| Features | MEDIUM | Based on competitor analysis (Linear, Warp, Raycast, Zed) and established design system patterns; direct user research not available |
| Architecture | HIGH | Grounded in direct codebase analysis (`main.css`, `cortex-theme.ts`, `MindGraph3D.tsx`, `App.tsx`); all patterns verified against existing implementation |
| Pitfalls | HIGH | 6 of 7 pitfalls derived from direct codebase inspection (hardcoded glass values, no dispose in MindGraph3D, inline variants, hex vs oklch inconsistency); one (framer-motion nesting) from community patterns |

**Overall confidence:** HIGH

### Gaps to Address

- **Theme preview grid implementation strategy:** Two viable approaches (CSS-rendered mini previews vs. pre-captured screenshots). CSS rendering is more dynamic but harder to implement correctly at small scale; screenshots are simpler but require a capture pipeline. Resolve during Phase 5 planning.
- **Cross-platform backdrop-blur behavior:** Research was done on Chromium/Electron in general; behavior on Windows (DirectComposition) vs. macOS vs. Linux may differ subtly. Verify during Phase 2 component builds with Electron-specific testing.
- **3D scene performance baselines:** Node caps (50/200/20/30) are derived from PROJECT.md constraints, not profiled benchmarks. Actual performance on low-end hardware (Intel Iris, older integrated GPUs) needs measurement during Phase 6 development. Adjust caps based on profiling, not estimates.
- **Font metrics for layout shift:** `size-adjust` values for Plus Jakarta Sans (replacing the current font) are not known. Measure during Phase 1 font integration and add `size-adjust` to minimize CLS (target: Lighthouse CLS <0.05).

## Sources

### Primary (HIGH confidence)
- Zenith codebase (`main.css`, `cortex-theme.ts`, `MindGraph3D.tsx`, `App.tsx`, `package.json`) — all architecture and pitfall findings
- Tailwind CSS v4 official docs — `@theme` directive, OKLch colors, backdrop-filter utilities
- framer-motion v12 official docs (motion.dev) — Variants API, AnimatePresence, useReducedMotion
- @react-three/fiber v9 official docs (r3f.docs.pmnd.rs) — useFrame, Canvas, performance patterns
- @react-three/drei v10 — OrbitControls, Html, InstancedMesh helpers

### Secondary (MEDIUM confidence)
- Linear, Warp, Raycast, Zed design patterns — competitor feature analysis (based on direct usage knowledge and training data)
- Apple Human Interface Guidelines — vibrancy/glass material patterns
- Epic Web Dev — glassmorphism with Tailwind CSS recipe
- LogRocket Tailwind CSS 2026 guide — @theme directive, OKLch patterns
- Chromium compositing documentation — backdrop-filter layer behavior

### Tertiary (LOW confidence)
- Framer-motion AnimatePresence nesting behavior in complex SPAs — community patterns, needs validation during Phase 1
- 3D node performance caps (50/200/20/30) — from PROJECT.md constraints, not profiled benchmarks; validate during Phase 6

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
