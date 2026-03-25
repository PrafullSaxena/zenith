# Roadmap: Zenith UI Revamp — "Obsidian Glass"

## Overview

Transform Zenith from an inconsistent mix of flat and glass styling into a unified "Obsidian Glass" experience. The build order is strictly bottom-up: CSS tokens and motion primitives first, then the shared component library, then migrate core pages and plugins to consume it, then add new themes tuned against stable glass components, then build 3D visualizations on the proven foundation, and finally polish micro-interactions across the complete app. Every phase delivers a coherent, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Design System Foundation** - Glass tokens, motion system, fonts, and typography scale (completed 2026-03-24)
- [x] **Phase 2: Glass Component Library** - All 11 shared glass primitives built and theme-validated (completed 2026-03-24)
- [x] **Phase 3: Core Pages Migration** - Dashboard, Activity Log, About, Settings, and Sidebar migrated to glass components (completed 2026-03-24)
- [x] **Phase 4: Plugin Migration** - All 6 plugins migrated to shared glass components (completed 2026-03-24)
- [x] **Phase 5: Theme Collection** - 6 new dark themes, OKLch conversion, and visual theme selector (completed 2026-03-24)
- [ ] **Phase 6: 3D Visualizations** - Four new 3D scenes with error boundaries and 2D fallbacks
- [ ] **Phase 7: Micro-Interactions and Polish** - Button feedback, icon morphs, scroll indicators, sidebar animations, and cross-theme QA

## Phase Details

### Phase 1: Design System Foundation
**Goal**: Every token, animation variant, and font needed by downstream components exists and works across all themes
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07
**Success Criteria** (what must be TRUE):
  1. Glass CSS tokens (--glass-bg, --glass-border, --glass-blur, --glass-glow) resolve correctly on all 12 existing themes
  2. Importing any motion variant from lib/motion.ts works (stagger, page transition, modal, hover lift, slide panel) and respects reduced-motion preference
  3. App renders body text in Plus Jakarta Sans and code blocks in Geist Mono
  4. Typography scale classes (hero through caption) produce visually distinct, consistent sizing
  5. Two-tier blur strategy is enforced: top-level glass surfaces use backdrop-blur, nested surfaces use translucent-only fills
**Plans**: TBD

Plans:
- [ ] 01-01: Glass tokens, fonts, timing/easing tokens (Wave 1)
- [ ] 01-02: Motion variants module + useReducedMotion relocation (Wave 1)
- [ ] 01-03: Typography scale @utility classes + build verification (Wave 2)

### Phase 2: Glass Component Library
**Goal**: A complete, standalone set of glass UI primitives that any page or plugin can import and render correctly on all themes
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, COMP-09, COMP-10, COMP-11
**Success Criteria** (what must be TRUE):
  1. All 11 glass components (GlassCard, GlassSurface, GlassButton, GlassInput, GlassSelect, GlassTab, GlassBadge, GlassModal, GlassToast, GlassSkeleton, EmptyState) are importable from ui/index.ts
  2. GlassCard renders with visible frosted glass effect on all 12 existing themes without visual breakage
  3. GlassModal opens with backdrop blur and scale animation, and closes cleanly without ghost elements
  4. GlassSkeleton shimmer animation plays in card, text, circle, and table variants
  5. EmptyState shows floating illustration with parallax mouse tracking and a CTA button
**Plans**: 3 plans

Plans:
- [ ] 02-01: Glass utilities + simple components (GlassBadge, GlassButton, GlassInput, GlassSurface) (Wave 1)
- [ ] 02-02: Compound components (GlassCard, GlassSelect, GlassTab, GlassSkeleton, EmptyState) (Wave 2)
- [ ] 02-03: Overlay components (GlassModal, GlassToast) + toast store + barrel index.ts (Wave 3)

### Phase 3: Core Pages Migration
**Goal**: The app shell and all 4 core pages use glass components, delivering a consistent look before any plugin is touched
**Depends on**: Phase 2
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05
**Success Criteria** (what must be TRUE):
  1. Mission Control Dashboard shows stat cards as GlassCards with staggered entrance animation
  2. Activity Log displays entries in GlassCards with status badges and a GlassSurface toolbar
  3. Settings page uses GlassTab sidebar navigation and the theme grid selector area is ready for Phase 5 content
  4. Sidebar icons show hover glow and the active indicator bar slides between items on navigation
  5. Navigating between core pages plays a page transition animation (crossfade or slide)
**Plans**: 3 plans

Plans:
- [ ] 03-01: Shared utilities — AnimatedCounter relocation, GlassTab vertical orientation, theme metadata, page transitions (Wave 1)
- [ ] 03-02: Dashboard + Activity Log migration — GlassCards, AnimatedCounter, stagger animations, GlassBadge status (Wave 2)
- [ ] 03-03: Sidebar + About View + Settings migration — hover glow, active bar slide, glass timeline, theme selector grid (Wave 2)

### Phase 4: Plugin Migration
**Goal**: Every plugin screen feels identical in quality and styling to the core pages — switching between plugins is seamless
**Depends on**: Phase 3
**Requirements**: PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-05, PLUG-06
**Success Criteria** (what must be TRUE):
  1. Cortex uses shared GlassCard and GlassTab from ui/ — all inline GLASS_CARD and GLASS_SURFACE constants are deleted
  2. All 6 plugins use GlassTab bars with the sliding underline animation for tab navigation
  3. All plugins show GlassSkeleton loaders during loading states instead of bare spinners
  4. Zero-data views in all plugins show EmptyState components with CTAs
  5. Switching between any two plugins produces no jarring visual style difference
**Plans**: TBD

Plans:
- [ ] 04-00: Shared utilities — GlassChat, GlassTable, PluginHeader, GlassResizeHandle components (Wave 1)
- [ ] 04-01: TextCraft migration — GlassCard panels, GlassSelect controls, GlassTab bar, resizable layout (Wave 2)
- [ ] 04-02: Cortex migration — delete inline GLASS_CARD/GLASS_SURFACE, PluginHeader, GlassChat QA, GlassModal export (Wave 3)
- [ ] 04-03: CodeReviewBot migration — PR list GlassCards, review GlassBadge severity, GlassTab bar (Wave 3)
- [ ] 04-04: DbInspector migration — GlassTable results, GlassChat Ask AI, GlassSelect connection manager (Wave 3)
- [ ] 04-05: Launchpad migration — brand-colored provider cards, AnimatedCounter costs, GlassChat advisor (Wave 3)
- [ ] 04-06: Nebula migration — GlassCard note list, GlassSurface editor wrapper, GlassResizeHandle drawing panel (Wave 3)

### Phase 5: Theme Collection
**Goal**: Users can choose from 18 curated dark themes via a visual selector, and all themes render glass components correctly
**Depends on**: Phase 4
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, THEME-05, THEME-06, THEME-07, THEME-08, THEME-09, THEME-10
**Success Criteria** (what must be TRUE):
  1. All 6 new themes (Midnight Bloom, Copper Forge, Ocean Depth, Nebula Dust, Obsidian, Jade Temple) are selectable and render the app correctly
  2. Settings shows a visual theme selector grid with Classic (12 legacy) and New Collection (6) sections
  3. Each theme card displays the theme name, 4 representative color dots, and a mini preview strip; the active theme has an accent border glow
  4. All 12 legacy themes use OKLch color values (no remaining hex-only definitions)
  5. Glass components render without visual breakage across all 18 themes (cross-theme QA pass)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: 3D Visualizations
**Goal**: Four new 3D data visualizations enhance key plugin views, with graceful fallbacks when 3D is unavailable
**Depends on**: Phase 4
**Requirements**: 3D-01, 3D-02, 3D-03, 3D-04, 3D-05, 3D-06
**Success Criteria** (what must be TRUE):
  1. Mission Control Dashboard shows a 3D Activity Mesh wireframe sphere with activity nodes (max 50), auto-rotate, and hover tooltips
  2. Nebula plugin offers a 2D/3D toggle for its Knowledge Graph, with the 3D view showing notes as nodes and tag-based edges
  3. All 4 new 3D components are wrapped in ErrorBoundary + Suspense and fall back to a 2D alternative on WebGL failure
  4. Enabling reduced-motion preference disables auto-rotate and reduces particle effects in all 3D scenes
  5. No WebGL context leaks: navigating away from a 3D view disposes its Canvas and context cleanly
**Plans**: 3 plans

Plans:
- [ ] 06-01: Scene3DWrapper shared component + Dashboard Activity Mesh 3D (Wave 1)
- [ ] 06-02: Nebula 3D Knowledge Graph + Launchpad Cost Treemap 3D (Wave 2)
- [ ] 06-03: DbInspector Schema Orb 3D + ER/3D toggle (Wave 2)

### Phase 7: Micro-Interactions and Polish
**Goal**: Every interactive element in the app has tactile feedback, and the entire UI passes cross-theme visual QA
**Depends on**: Phase 5, Phase 6
**Requirements**: MICRO-01, MICRO-02, MICRO-03, MICRO-04, MICRO-05, MICRO-06, MICRO-07, MICRO-08, MICRO-09, MICRO-10
**Success Criteria** (what must be TRUE):
  1. Pressing any GlassButton produces a visible scale-down effect (0.97) and copy buttons animate to a check icon for 2 seconds
  2. All card grids throughout the app use staggered entrance animations
  3. Scrollable containers show a thin accent progress bar at top and fade shadows at overflow edges
  4. Tab bars across the entire app animate the active underline sliding to the selected tab
  5. All micro-interactions respect reduced-motion preference (disabled or simplified when active)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD
- [ ] 07-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 > 2 > 3 > 4 > 5 > 6 > 7
Note: Phase 5 and Phase 6 both depend on Phase 4 and can run in parallel.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design System Foundation | 0/3 | Complete    | 2026-03-24 |
| 2. Glass Component Library | 3/3 | Complete    | 2026-03-24 |
| 3. Core Pages Migration | 0/3 | Complete    | 2026-03-24 |
| 4. Plugin Migration | 7/7 | Complete    | 2026-03-24 |
| 5. Theme Collection | 0/3 | Complete    | 2026-03-24 |
| 6. 3D Visualizations | 0/3 | Not started | - |
| 7. Micro-Interactions and Polish | 0/3 | Not started | - |
