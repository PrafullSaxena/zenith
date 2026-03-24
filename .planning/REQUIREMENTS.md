# Requirements: Zenith UI Revamp — "Obsidian Glass"

**Defined:** 2026-03-24
**Core Value:** Every screen in Zenith must feel like the same app — consistent glass styling, shared animation, unified components.

## v1 Requirements

Requirements for the UI revamp. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: Glass design tokens added to CSS @theme block (--glass-bg, --glass-border, --glass-blur, --glass-glow) that adapt per theme
- [x] **FOUND-02**: Shared motion variants module created at lib/motion.ts with stagger, page transition, modal, hover lift, and slide panel variants
- [ ] **FOUND-03**: Plus Jakarta Sans Variable font installed and set as --font-sans
- [ ] **FOUND-04**: Geist Mono font installed and set as --font-mono
- [ ] **FOUND-05**: Typography scale CSS classes defined (hero, h1, h2, h3, body, small, caption, mono)
- [ ] **FOUND-06**: Timing tokens (--duration-instant/fast/normal/slow/slower) and easing tokens (--ease-out/spring/smooth) defined in :root
- [ ] **FOUND-07**: Two-tier blur strategy implemented (translucent-only for nested surfaces, blur for top-level glass)

### Components

- [ ] **COMP-01**: GlassCard component with default, interactive, and selected variants
- [ ] **COMP-02**: GlassSurface component for headers, toolbars, panel backgrounds
- [ ] **COMP-03**: GlassButton component with default, primary, danger, ghost variants and sm/md/lg sizes
- [ ] **COMP-04**: GlassInput component with focus glow and error state
- [ ] **COMP-05**: GlassSelect component with glass dropdown and selected accent
- [ ] **COMP-06**: GlassTab component with sliding underline animation
- [ ] **COMP-07**: GlassBadge component with success, error, warning, info, accent, neutral variants
- [ ] **COMP-08**: GlassModal component with backdrop blur and scale entrance/exit
- [ ] **COMP-09**: GlassToast component with slide entrance, auto-dismiss progress bar, and type variants
- [ ] **COMP-10**: GlassSkeleton component with shimmer animation and text/card/circle/table variants
- [ ] **COMP-11**: EmptyState component with floating SVG illustration, parallax mouse effect, and CTA button

### Themes

- [ ] **THEME-01**: Midnight Bloom theme defined (magenta-orchid accent on violet-black)
- [ ] **THEME-02**: Copper Forge theme defined (burnished copper accent on warm charcoal)
- [ ] **THEME-03**: Ocean Depth theme defined (aquamarine accent on abyssal blue)
- [ ] **THEME-04**: Nebula Dust theme defined (stellar pink-coral accent on deep space purple)
- [ ] **THEME-05**: Obsidian theme defined (pure monochrome, zero saturation, silver on near-black)
- [ ] **THEME-06**: Jade Temple theme defined (jade green accent on dark forest green)
- [ ] **THEME-07**: Visual theme selector grid in Settings with Classic (12) and New Collection (6) sections
- [ ] **THEME-08**: Each theme card shows name, 4 color dots, mini preview strip; active theme has accent border glow
- [ ] **THEME-09**: All 12 legacy themes converted from hex to OKLch color space
- [ ] **THEME-10**: Glass components validated across all 18 themes (visual QA)

### Core Pages Migration

- [ ] **CORE-01**: Mission Control Dashboard migrated — GlassCards for stats, staggered entrance, AnimatedCounter reuse
- [ ] **CORE-02**: Activity Log migrated — GlassCard entries, GlassSurface toolbar, GlassBadge status
- [ ] **CORE-03**: About View migrated — GlassCards for capabilities, stagger entrance, glass timeline
- [ ] **CORE-04**: Settings migrated — GlassTab sidebar, theme grid selector, GlassCard sections
- [ ] **CORE-05**: Sidebar upgraded — hover scale + glow ring, active bar slide animation, tooltip delay + fade

### Plugin Migration

- [ ] **PLUG-01**: Cortex migrated — shared GlassCard/GlassTab replacing inline glass classes, shared motion variants
- [ ] **PLUG-02**: CodeReviewBot migrated — PR list GlassCards, review comments GlassCards, GlassTab bar, skeleton loaders
- [ ] **PLUG-03**: DbInspector migrated — GlassSelect connection manager, glass tree explorer, glass-wrapped console, GlassTab bar
- [ ] **PLUG-04**: Launchpad migrated — GlassCard provider selector, GlassInput/GlassSelect forms, GlassTab bar, AnimatedCounter
- [ ] **PLUG-05**: Nebula migrated — GlassCard note list, GlassSurface editor wrapper, GlassBadge tags, GlassTab bar
- [ ] **PLUG-06**: TextCraft migrated — GlassCard panels, GlassSelect controls, GlassTab bar, GlassButton actions

### 3D Visualizations

- [ ] **3D-01**: Dashboard Activity Mesh — 3D wireframe sphere with activity nodes, auto-rotate, hover tooltips, max 50 nodes
- [ ] **3D-02**: Nebula 3D Knowledge Graph — port MindGraph3D architecture, notes as nodes, tag edges, orbit controls, 2D/3D toggle
- [ ] **3D-03**: Launchpad Cost Treemap — 3D extruded blocks, height = cost proportion, hover lift + tooltip, max 20 blocks
- [ ] **3D-04**: DbInspector Schema Orb — floating table planes, FK relationship lines, orbit controls, toggle alongside mermaid, max 30 tables
- [ ] **3D-05**: Error boundaries + Suspense + lazy Canvas + 2D fallback for all 4 new 3D components
- [ ] **3D-06**: All 3D components respect usePrefersReducedMotion (disable auto-rotate, reduce particles)

### Micro-Interactions & Polish

- [ ] **MICRO-01**: Button press feedback — scale(0.97) on press for all GlassButtons
- [ ] **MICRO-02**: Icon morph — Copy to Check spring animation on copy actions, revert after 2s
- [ ] **MICRO-03**: Staggered card entrances — all card grids use shared staggerItem variant
- [ ] **MICRO-04**: Tab sliding underline — active underline slides to new tab with layout animation
- [ ] **MICRO-05**: Skeleton loaders — all loading states replaced with contextual shimmer (card/table/text shapes)
- [ ] **MICRO-06**: Scroll progress bar — thin accent bar at top of scrollable containers
- [ ] **MICRO-07**: Scroll shadows — top/bottom fade shadows when content overflows
- [ ] **MICRO-08**: Sidebar hover glow — scale(1.08) + accent glow ring on icon hover
- [ ] **MICRO-09**: Sidebar active bar — left accent bar slides in with height animation on active icon
- [ ] **MICRO-10**: Tooltip animation — 400ms delay, then fade + translateX(4px) from left

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Future Enhancements

- **V2-01**: Light mode / light themes
- **V2-02**: Command palette (Cmd+K) global search
- **V2-03**: Success celebration effects (confetti/sparkle on significant actions)
- **V2-04**: Animated empty state SVG illustrations (custom per plugin)
- **V2-05**: Responsive layouts for variable window sizes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Light mode | Dark-only by design decision — would double theme work |
| New plugin functionality | UI-only revamp, no feature additions |
| Mobile/responsive layouts | Desktop Electron app only |
| Replacing Tailwind with a UI library | Existing Tailwind v4 + custom components is the chosen approach |
| New npm dependencies | All needed libs already installed |
| Per-component theme overrides | Anti-feature per research — creates drift |
| Heavy animated backgrounds | Anti-feature per research — GPU drain with negative UX impact |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| FOUND-07 | Phase 1 | Pending |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |
| COMP-04 | Phase 2 | Pending |
| COMP-05 | Phase 2 | Pending |
| COMP-06 | Phase 2 | Pending |
| COMP-07 | Phase 2 | Pending |
| COMP-08 | Phase 2 | Pending |
| COMP-09 | Phase 2 | Pending |
| COMP-10 | Phase 2 | Pending |
| COMP-11 | Phase 2 | Pending |
| THEME-01 | Phase 5 | Pending |
| THEME-02 | Phase 5 | Pending |
| THEME-03 | Phase 5 | Pending |
| THEME-04 | Phase 5 | Pending |
| THEME-05 | Phase 5 | Pending |
| THEME-06 | Phase 5 | Pending |
| THEME-07 | Phase 5 | Pending |
| THEME-08 | Phase 5 | Pending |
| THEME-09 | Phase 5 | Pending |
| THEME-10 | Phase 5 | Pending |
| CORE-01 | Phase 3 | Pending |
| CORE-02 | Phase 3 | Pending |
| CORE-03 | Phase 3 | Pending |
| CORE-04 | Phase 3 | Pending |
| CORE-05 | Phase 3 | Pending |
| PLUG-01 | Phase 4 | Pending |
| PLUG-02 | Phase 4 | Pending |
| PLUG-03 | Phase 4 | Pending |
| PLUG-04 | Phase 4 | Pending |
| PLUG-05 | Phase 4 | Pending |
| PLUG-06 | Phase 4 | Pending |
| 3D-01 | Phase 6 | Pending |
| 3D-02 | Phase 6 | Pending |
| 3D-03 | Phase 6 | Pending |
| 3D-04 | Phase 6 | Pending |
| 3D-05 | Phase 6 | Pending |
| 3D-06 | Phase 6 | Pending |
| MICRO-01 | Phase 7 | Pending |
| MICRO-02 | Phase 7 | Pending |
| MICRO-03 | Phase 7 | Pending |
| MICRO-04 | Phase 7 | Pending |
| MICRO-05 | Phase 7 | Pending |
| MICRO-06 | Phase 7 | Pending |
| MICRO-07 | Phase 7 | Pending |
| MICRO-08 | Phase 7 | Pending |
| MICRO-09 | Phase 7 | Pending |
| MICRO-10 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 55 total
- Mapped to phases: 55
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after roadmap creation*
