# Phase 1: Design System Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the CSS design tokens, shared motion/animation variants, font files, and typography scale that every downstream component and plugin depends on. No visual components are built here — only the primitives they consume. This phase unblocks Phase 2 (Glass Component Library) and nothing else can start without it.

</domain>

<decisions>
## Implementation Decisions

### Glass Token Values
- Background opacity: `bg-white/[0.03]` — very subtle tint, lets background through (matches current Cortex GLASS_CARD)
- Blur radius: `backdrop-blur-xl` (24px) — strong frosting, good depth perception (matches Cortex)
- Border alpha: `border-white/[0.08]` — barely visible edge, clean look (matches Cortex)
- Accent glow on hover/focus: `box-shadow: 0 0 0 2px accent/20` — subtle highlight ring, not overwhelming
- All glass tokens must be CSS custom properties in the `@theme` block so they adapt per theme
- Tokens: `--glass-bg`, `--glass-border`, `--glass-blur`, `--glass-glow`

### Font Loading Strategy
- **Sans font**: Plus Jakarta Sans Variable (single woff2 file, all weights 200-800)
- **Mono font**: Geist Mono replacing JetBrains Mono entirely (remove JetBrains Mono files)
- **Fallback chain**: Plus Jakarta Sans → Inter (kept as fallback) → system-ui → sans-serif
- **Mono fallback**: Geist Mono → system monospace
- **font-display**: `swap` — show fallback immediately, swap when loaded
- **Inter files**: Keep in assets/fonts/ as fallback, do not delete

### Motion Feel
- **Easing character**: Smooth deceleration (ease-out curve: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`)
- **Stagger timing**: Fast cascade — 60ms between cards (current Cortex setting)
- **Page transitions**: Fade + subtle rise — opacity 0→1, y: 8px→0, duration 250ms
- **Duration scale**: Snappy — 150ms feedback, 250ms transitions, 400ms entrances
- **Timing tokens**: `--duration-instant: 100ms`, `--duration-fast: 150ms`, `--duration-normal: 250ms`, `--duration-slow: 400ms`, `--duration-slower: 600ms`
- **Easing tokens**: `--ease-out`, `--ease-spring`, `--ease-smooth`
- All variants must respect `usePrefersReducedMotion` (already exists in codebase)

### Two-Tier Blur Rules
- **Blur tier** (real `backdrop-blur-xl`): GlassCard, GlassModal, GlassToast only
- **Translucent tier** (no blur): GlassSurface (headers/toolbars), GlassInput, GlassSelect, GlassButton, GlassBadge, GlassTab — use `bg-white/[0.03]` without blur
- **Nested surfaces**: Always translucent-only (`bg-white/[0.03]`, no blur). A card inside a modal does NOT get blur.
- **Max simultaneous blur layers**: 6 (sidebar is not glass, so typical screen = 3-4 card blurs + maybe 1 modal)
- **Overflow strategy**: Auto-degrade — if blur layer count exceeds 6, new surfaces render as translucent-only. No janky frame drops.

### Claude's Discretion
- Exact `size-adjust` values for font CLS minimization
- Whether glass tokens use computed values or static per-theme overrides
- Internal structure of `lib/motion.ts` (exports as raw objects vs hooks)
- Exact typography scale rem values (within the specified tier names)

</decisions>

<specifics>
## Specific Ideas

- Glass values should match the existing Cortex `GLASS_CARD` and `GLASS_SURFACE` constants as the baseline — this is the proven look
- Motion should feel like Linear or Raycast — snappy, professional, not bouncy
- The `cortex-theme.ts` GLASS_CARD/GLASS_SURFACE string constants should be deprecated once tokens exist (migration happens in Phase 4)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-design-system-foundation*
*Context gathered: 2026-03-24*
