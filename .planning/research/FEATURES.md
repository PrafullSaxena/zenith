# Feature Research

**Domain:** Premium UI design systems for developer desktop tools
**Researched:** 2026-03-24
**Confidence:** MEDIUM — based on established patterns in Warp, Linear, Raycast, Fig, Zed, VS Code, and Obsidian; supplemented by training data on glass morphism and 3D visualization best practices.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Consistent component styling across all views | Users notice when one plugin looks polished and another looks flat. Breaks trust in quality. Currently Cortex has glass; other 5 plugins + 4 pages do not. | HIGH | ~81 components to migrate. Biggest single effort. Must happen or the revamp feels half-done. |
| Design token system (CSS custom properties) | Every premium dev tool (Linear, Raycast, Warp) uses a token layer so themes work consistently. Zenith already has OKLCh tokens — need to extend with glass-specific tokens (blur radius, surface opacity, border opacity). | MEDIUM | Already partially exists in `main.css` @theme block. Extend, don't rebuild. |
| Skeleton loaders for async content | Bare spinners feel 2015. Skeleton screens (pulsing placeholder shapes) are table stakes since 2020. Every major app ships them. | LOW | Straightforward component. One `GlassSkeleton` with variant shapes (text, card, chart). Framer-motion pulse animation. |
| Empty states with helpful CTAs | Blank screens when no data exists are a UX failure. Users need guidance ("Add your first repo", "No results found"). | LOW | One `EmptyState` component with illustration slot + action button. Low complexity per instance but touches many views. |
| Reduced motion support | macOS `prefers-reduced-motion` is a system-level accessibility expectation. Electron apps that ignore it feel broken. Already partial in Cortex. | LOW | Already have `useCardVariants(reducedMotion)` in cortex-theme.ts. Extend pattern to all motion primitives. Wrap framer-motion in a central hook. |
| Theme switching that works everywhere | 12 themes exist but glass components must render correctly across all 18 (12 existing + 6 new). A theme selector that produces broken UI in half the themes is worse than no selector. | MEDIUM | Requires cross-theme QA matrix. Each glass component needs testing against all themes because backdrop-blur interacts differently with different background colors. |
| Smooth page/tab transitions | Instant cuts between views feel jarring in 2026. Even a 200ms crossfade is expected. Linear, Raycast, Arc all have this. | LOW | Framer-motion `AnimatePresence` on route/tab changes. One shared `PageTransition` wrapper. |
| Button/input feedback states | Hover, active, focus, disabled states on all interactive elements. Missing states make UI feel dead. | LOW | Part of the glass component library. Each component needs 4 states. |
| Scroll shadows / overflow indicators | When content overflows, users need visual cues. Scroll shadows on list tops/bottoms are standard in polished apps. | LOW | CSS-only solution with `mask-image` gradient or tiny JS intersection observer. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Glass morphism design system (unified) | Very few developer tools commit to a full glass aesthetic. Warp uses subtle glass; most tools are opaque flat. A cohesive frosted-glass system across an entire app is distinctive. | HIGH | Not just CSS classes — needs a proper component library (GlassCard, GlassButton, GlassInput, GlassSelect, GlassTab, GlassBadge, GlassModal, GlassToast) with consistent blur/opacity/border tokens. |
| 3D data visualizations (Dashboard Mesh, Knowledge Graph, Cost Treemap, Schema Orb) | Most dev tools are 2D-only. 3D visualizations as hero elements create instant "wow" moments. The four planned 3D scenes each serve a different data type — this breadth is rare. | HIGH | Three.js + R3F already in deps. Main risk: performance and WebGL compatibility. Must have node caps, lazy loading, and 2D fallbacks. Each 3D scene is effectively a mini-project. |
| Curated theme collection with visual theme selector | Most apps offer light/dark. A curated set of 18 dark themes with a visual grid selector (showing previews, not just names) is premium. Linear has one dark theme. Zenith having 18 is a genuine differentiator. | MEDIUM | 6 new themes need careful color tuning in OKLCh. Visual selector grid needs thumbnail previews — either CSS-rendered mini previews or pre-captured screenshots. |
| Micro-interactions (sidebar glow, active bar slide, icon morphs, counter animations) | The "polish layer" that separates craft from commodity. Individual micro-interactions are low-effort; the cumulative effect of 15-20 of them across the app creates perceived quality far beyond the actual effort. | MEDIUM | Each micro-interaction is LOW complexity individually (2-4 hours). Collectively MEDIUM because they need coordination — consistent easing curves, shared timing, reduced-motion variants. |
| Parallax empty state illustrations | Empty states with floating/parallax illustrations (mouse-tracking depth) feel alive. Most apps have static SVGs. | LOW | One `ParallaxIllustration` component wrapping layered SVG elements with `useMousePosition` hook. Reusable across all empty states. |
| Typography upgrade (Plus Jakarta Sans + Geist Mono) | Font choice signals craft. Default system fonts or Inter (ubiquitous) feel generic. Plus Jakarta Sans has distinctive character; Geist Mono is purpose-built for code (by Vercel). | LOW | 4 woff2 files, CSS @font-face declarations, update Tailwind --font-sans/--font-mono. Low risk, high perceived impact. |
| Shared motion variants library | A central animation system (not ad-hoc per-component) that provides stagger, page transition, modal, hover, and slide-panel presets. Ensures timing consistency app-wide. | MEDIUM | Currently cortex-theme.ts has `cardVariants` only. Need a dedicated `motion-system.ts` with 8-10 variant presets, all reduced-motion aware. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Heavy blur / extreme glass intensity | Looks dramatic in screenshots | Destroys text readability, kills GPU performance on large surfaces, makes themes unpredictable. Apple themselves backed off heavy blur in recent macOS. | Medium glass: `bg-white/[0.03]` + `backdrop-blur-xl` (already established in Cortex). Consistent, readable, performant. |
| Animated backgrounds / particle effects on every page | "Make it feel alive" | Constant motion causes fatigue, distracts from content, drains battery on laptops. Developer tools need to be workhorses, not screensavers. | Limit ambient motion to hero areas (Dashboard 3D mesh, MindGraph). Rest of app: motion on interaction only. |
| Light mode / light themes | Broad appeal | Doubles the design system work (every glass opacity, blur, shadow, and border needs light variants). Dark-only is a valid design choice for developer tools. The constraint enables focus. | Stay dark-only. Invest the saved effort in more dark theme variety. |
| Real-time CSS variable animation for theme transitions | Smooth morph between themes | CSS custom property transitions are janky in practice (no native interpolation between OKLCh values in most engines). Creates flash-of-wrong-color. | Instant theme switch with a subtle crossfade overlay (200ms opacity transition on a backdrop). Clean, predictable. |
| Per-component theme overrides | "Let users customize individual card colors" | Explodes the design system. N components x M properties = unmaintainable. Users rarely actually use granular customization. | Curated themes only. Let the 18 themes provide variety. Focus on making each theme internally consistent. |
| 3D everywhere (3D buttons, 3D navigation, 3D forms) | "Commit to the 3D aesthetic" | 3D UI chrome is slow, inaccessible, and hostile to keyboard navigation. 3D is for data visualization, not UI controls. | 3D for data (graphs, meshes, treemaps). 2D glass for UI controls (buttons, inputs, tabs). Clear boundary. |
| Custom animation easing editor | "Let power users tune animations" | Engineering cost is massive, audience is tiny (<1% of users), and inconsistent easing across the app breaks the design system. | Ship 3-4 curated easing presets. Expose a "reduce motion" toggle. That covers 99% of preferences. |
| Replacing Tailwind with a UI component library (shadcn, Radix) | "Use established components" | Rewrites the entire existing codebase. Zenith already has ~81 hand-crafted components. Migration would be a months-long detour that doesn't ship visible value. | Build glass components as Tailwind-based wrappers. Adopt Radix primitives selectively only where accessibility behavior is complex (modals, dropdowns). |

## Feature Dependencies

```
[Design Token System]
    └──requires──> (already exists, extend)
          │
          ├──> [Glass Component Library]
          │        ├──requires──> [Design Token System]
          │        └──enables──> [Plugin Migration] (all 6 plugins)
          │                       └──enables──> [Core Page Migration] (all 4 pages)
          │
          ├──> [Motion Variants Library]
          │        ├──requires──> [Design Token System] (timing tokens)
          │        ├──enables──> [Micro-interactions]
          │        ├──enables──> [Page/Tab Transitions]
          │        └──enables──> [Skeleton Loaders] (pulse animation)
          │
          ├──> [Theme Collection (6 new)]
          │        ├──requires──> [Design Token System]
          │        └──enables──> [Visual Theme Selector]
          │
          └──> [Typography Upgrade]
                   └──independent (can ship anytime)

[Glass Component Library] ──enables──> [Empty States] (uses GlassCard)
[Glass Component Library] ──enables──> [Skeleton Loaders] (uses glass styling)

[3D Visualizations]
    ├──independent of──> [Glass Component Library] (different rendering pipeline)
    ├──requires──> [Error Boundaries + 2D Fallback] (safety net)
    └──each scene is independent of the others (can ship incrementally)

[Reduced Motion Support] ──enhances──> [Motion Variants Library]
[Reduced Motion Support] ──enhances──> [3D Visualizations] (disable/simplify)
[Reduced Motion Support] ──enhances──> [Micro-interactions] (suppress or simplify)

[Cross-Theme QA] ──requires──> [Glass Component Library] + [Theme Collection]
    └── must be final step before shipping
```

### Dependency Notes

- **Glass Component Library requires Design Token System:** Glass components reference blur, opacity, and border tokens. Tokens must be defined first or components become hard-coded.
- **Plugin Migration requires Glass Component Library:** Cannot migrate plugins until shared components exist. Otherwise each plugin reinvents glass styling (current problem with Cortex).
- **3D Visualizations are independent of Glass Components:** Three.js renders in its own canvas. Can be developed in parallel with the component library.
- **Cross-Theme QA requires everything else:** This is the integration verification step. Schedule last.
- **Typography Upgrade is fully independent:** Font swap is a global CSS change with no dependencies. Can ship first for quick visible progress.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed for the revamp to feel "shipped."

- [ ] Design token extension (glass-specific tokens in @theme block) — foundation for everything
- [ ] Glass component library (GlassCard, GlassButton, GlassInput, GlassTab minimum) — the core deliverable
- [ ] Motion variants library (stagger, page transition, hover lift, reduced-motion) — animation consistency
- [ ] Skeleton loaders replacing all bare spinners — instant quality upgrade
- [ ] Empty states for zero-data views — prevents blank screen confusion
- [ ] Typography upgrade (Plus Jakarta Sans + Geist Mono) — high-impact, low-effort
- [ ] Migrate all 6 plugins + 4 core pages to glass components — the whole point of the revamp
- [ ] Reduced motion support across all new motion — accessibility baseline

### Add After Validation (v1.x)

Features to add once the core glass system is stable.

- [ ] 6 new dark themes (Midnight Bloom, Copper Forge, Ocean Depth, Nebula Dust, Obsidian, Jade Temple) — add after glass components are theme-safe
- [ ] Visual theme selector grid in Settings — add after new themes are finalized
- [ ] Micro-interactions (sidebar glow, active bar slide, icon morphs, button press scale) — polish layer after core works
- [ ] Parallax empty state illustrations — enhancement to existing empty states
- [ ] Scroll shadows / scroll progress bars — refinement

### Future Consideration (v2+)

Features to defer until the glass system is proven stable.

- [ ] 3D Dashboard Activity Mesh — high-impact but high-complexity; needs stable foundation first
- [ ] 3D Nebula Knowledge Graph upgrade — existing 2D works; 3D is enhancement
- [ ] 3D Launchpad Cost Treemap — niche visualization, defer
- [ ] 3D DbInspector Schema Orb — niche visualization, defer

**Rationale for deferring 3D:** Each 3D scene is a mini-project (estimated 2-5 days each). They are independent of the glass system and can be shipped incrementally. The glass component migration is higher priority because it affects every screen, while each 3D scene affects one view.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Glass component library | HIGH | HIGH | P1 |
| Design token extension | HIGH | LOW | P1 |
| Motion variants library | HIGH | MEDIUM | P1 |
| Plugin/page migration to glass | HIGH | HIGH | P1 |
| Skeleton loaders | MEDIUM | LOW | P1 |
| Empty states | MEDIUM | LOW | P1 |
| Typography upgrade | MEDIUM | LOW | P1 |
| Reduced motion support | MEDIUM | LOW | P1 |
| Page/tab transitions | MEDIUM | LOW | P1 |
| Scroll shadows | LOW | LOW | P1 |
| 6 new dark themes | MEDIUM | MEDIUM | P2 |
| Visual theme selector | MEDIUM | MEDIUM | P2 |
| Micro-interactions suite | MEDIUM | MEDIUM | P2 |
| Parallax empty states | LOW | LOW | P2 |
| 3D Dashboard Activity Mesh | HIGH | HIGH | P2 |
| 3D Nebula Knowledge Graph | MEDIUM | HIGH | P3 |
| 3D Launchpad Cost Treemap | LOW | HIGH | P3 |
| 3D DbInspector Schema Orb | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — the glass revamp does not ship without these
- P2: Should have, add when possible — enhances but doesn't define the revamp
- P3: Nice to have, future consideration — independent mini-projects

## Competitor Feature Analysis

| Feature | Linear | Warp | Raycast | Zed | Our Approach |
|---------|--------|------|---------|-----|--------------|
| Glass/frosted surfaces | Subtle on modals only | Subtle on command palette | Moderate on floating panels | None (opaque) | Full commitment — glass as primary surface treatment for cards, panels, modals |
| Animation system | Smooth but minimal (crossfades) | Moderate (terminal pane transitions) | Polished (extension animations, search transitions) | Minimal (performance-first) | Comprehensive motion variants library with stagger, page, modal, hover presets |
| Theme engine | 1 dark, 1 light | ~5 themes | System-follows only | ~10 themes | 18 dark themes with visual selector grid — largest curated collection |
| 3D visualizations | None | None | None | None | 4 planned 3D scenes — genuinely novel for developer tools |
| Micro-interactions | Medium (hover states, transitions) | Medium (cursor effects) | High (keyboard nav feedback, haptics) | Low (performance focus) | Medium-high — sidebar glow, icon morphs, counter animations, button scale |
| Skeleton loaders | Yes (standard) | Yes (standard) | Yes (standard) | No (instant load) | Yes — glass-styled skeleton variants |
| Empty states | Illustrated, helpful | Basic text | Illustrated with actions | Basic text | Illustrated with parallax + floating effect |
| Accessibility (motion) | Respects reduced-motion | Respects reduced-motion | Respects reduced-motion | N/A (minimal motion) | Full reduced-motion support across all animations + 2D fallbacks for 3D |

**Key insight:** No competitor in the developer tools space combines glass morphism + 3D visualizations + a deep theme collection. Each competitor excels at one dimension (Linear: polish; Raycast: micro-interactions; Warp: terminal innovation). Zenith's differentiator is the combination: glass + 3D + themes as a unified aesthetic.

## Sources

- Linear app UI patterns (established premium dev tool benchmark) — MEDIUM confidence, based on direct usage knowledge
- Warp terminal design system — MEDIUM confidence, based on training data
- Raycast extension UI and interaction patterns — MEDIUM confidence, based on training data
- Zed editor performance-first design philosophy — MEDIUM confidence, based on training data
- Apple Human Interface Guidelines on vibrancy/glass materials — HIGH confidence, well-documented standard
- framer-motion reduced motion patterns — HIGH confidence, documented API (`useReducedMotion`)
- Tailwind v4 @theme block system — HIGH confidence, actively used in this codebase
- react-three-fiber performance patterns (node caps, lazy loading) — MEDIUM confidence, based on training data

---
*Feature research for: Premium UI design systems for developer desktop tools*
*Researched: 2026-03-24*
