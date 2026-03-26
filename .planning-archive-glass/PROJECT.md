# Zenith UI Revamp — "Obsidian Glass"

## What This Is

A full UI overhaul of the Zenith desktop developer toolkit. Replaces the current inconsistent styling (glass in Cortex, flat everywhere else) with a unified "Obsidian Glass" design system — frosted glass components, shared motion/animation primitives, 6 new dark themes, 3D visualizations, and micro-interactions across all 6 plugins and 4 core pages (~81 components total).

## Core Value

**Every screen in Zenith must feel like the same app.** Consistent glass styling, shared animation system, and unified component library so switching between plugins feels seamless, not jarring.

## Requirements

### Validated

<!-- Existing capabilities that must be preserved -->

- ✓ 12 dark themes with OKLch CSS variables — existing
- ✓ Framer-motion animations in Cortex (card entrance, counters, reduced motion support) — existing
- ✓ 3D MindGraph in Cortex via react-three-fiber — existing
- ✓ Glass morphism in Cortex (GLASS_CARD, GLASS_SURFACE) — existing
- ✓ 6 plugins functional: Cortex, CodeReviewBot, DbInspector, Launchpad, Nebula, TextCraft — existing
- ✓ 4 core pages: Dashboard, Activity Log, About, Settings — existing
- ✓ Sidebar with drag-reorder and icon navigation — existing
- ✓ Real-time theme switching via data-theme attribute — existing

### Active

<!-- Current scope — building toward these -->

- [ ] Shared glass component library (GlassCard, GlassButton, GlassInput, GlassSelect, GlassTab, GlassBadge, GlassModal, GlassToast, GlassSkeleton)
- [ ] Shared motion variants module (stagger, page transition, modal, hover lift, slide panel)
- [ ] Font upgrade: Inter → Plus Jakarta Sans, JetBrains Mono → Geist Mono
- [ ] Typography scale with CSS classes
- [ ] 6 new dark themes: Midnight Bloom, Copper Forge, Ocean Depth, Nebula Dust, Obsidian, Jade Temple
- [ ] Visual theme selector grid in Settings (Classic vs New Collection sections)
- [ ] Skeleton loader system replacing bare spinners
- [ ] EmptyState component with floating illustration + parallax
- [ ] Migrate all 6 plugins to glass components
- [ ] Migrate all 4 core pages to glass components
- [ ] Sidebar micro-interactions (hover glow, active bar slide, tooltip animation)
- [ ] Tab bars use GlassTab with sliding underline across all plugins
- [ ] Button press feedback (scale 0.97) and icon morph (Copy → Check)
- [ ] 3D Dashboard Activity Mesh (hero widget on Mission Control)
- [ ] 3D Nebula Knowledge Graph (upgrade from 2D)
- [ ] 3D Launchpad Cost Treemap
- [ ] 3D DbInspector Schema Orb
- [ ] Error boundaries + 2D fallback for all 3D components
- [ ] Scroll progress bars and scroll shadows on long lists
- [ ] Cross-theme visual QA (all 18 themes correct)

### Out of Scope

- Light mode / light themes — dark-only by design
- Command palette (Cmd+K) — separate effort
- New plugin functionality — UI-only changes, no feature additions
- Mobile/responsive layouts — desktop Electron app only
- Accessibility audit beyond existing reduced-motion support
- Replacing Tailwind CSS or switching to a UI library like shadcn

## Context

- Zenith is an Electron 39 + React 19 desktop app built with electron-vite
- Styling: Tailwind v4 (CSS-first, @theme blocks) + hand-crafted components
- State: Zustand stores per plugin
- 3D: three.js + @react-three/fiber + @react-three/drei + d3-force-3d already in deps
- Animation: framer-motion already in deps, used inconsistently (only Cortex)
- Fonts: Inter Variable + JetBrains Mono (woff2 in assets/fonts/)
- Themes: 12 dark themes via CSS custom properties on `[data-theme]`
- No new npm packages required — all deps already present
- Only new assets: 4 font woff2 files (Plus Jakarta Sans, Geist Mono)

## Constraints

- **Dark-only**: All themes must remain dark. No light mode.
- **No new deps**: Build entirely on existing three.js, framer-motion, Tailwind stack.
- **Performance**: 3D components must cap nodes (50 dashboard, 200 graph, 20 treemap, 30 schema), lazy-load, respect `usePrefersReducedMotion`.
- **Glass intensity**: Medium glass — visible frosted effect matching current Cortex cards (bg-white/[0.03], backdrop-blur-xl).
- **Backwards compat**: Existing 12 themes must not break. New glass components must render correctly across all 18 themes.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Plus Jakarta Sans + Geist Mono fonts | Distinctive character without sacrificing readability; pairs well | — Pending |
| Medium glass intensity | Balanced — visible depth without overwhelming content | — Pending |
| All plugins migrated together (not phased) | User wants consistency across app, not partial rollout | — Pending |
| Dashboard Activity Mesh is highest-priority 3D | First thing users see, highest visual impact | — Pending |
| Dark-only themes | Simplifies implementation, matches developer tool aesthetic | — Pending |
| No new npm dependencies | Reduces bundle size risk, everything needed already exists | — Pending |

---
*Last updated: 2026-03-24 after initialization*
