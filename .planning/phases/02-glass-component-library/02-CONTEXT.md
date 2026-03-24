# Phase 2: Glass Component Library - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build all 11 shared glass UI primitives as standalone React components in `src/renderer/src/components/ui/`. Components consume the design tokens from Phase 1 (glass tokens, motion variants, fonts). No migration of existing pages/plugins happens here — that's Phases 3 and 4. This phase delivers the library; consumers come later.

Components: GlassCard, GlassSurface, GlassButton, GlassInput, GlassSelect, GlassTab, GlassBadge, GlassModal, GlassToast, GlassSkeleton, EmptyState.

</domain>

<decisions>
## Implementation Decisions

### Component API Design
- **Props style**: Variant props — predefined variants via props (e.g., `<GlassCard variant="interactive" size="lg">`). Constrained but consistent. No raw className merging for customization.
- **Composition**: Monolithic — each component is a single component. Pass children, variant, className. No sub-components (no GlassCard.Header pattern).
- **Export style**: Barrel export — all components importable from `@/components/ui` via a single `index.ts` barrel file.
- **Naming**: Keep the `Glass` prefix on all components (GlassCard, GlassButton, etc.). Clear design system provenance.

### Visual Behavior
- **Hover (interactive cards)**: y: -2px lift + border brightens to white/[0.12] + subtle shadow deepening. Professional, not playful.
- **Focus ring**: Accent glow ring — `box-shadow: 0 0 0 2px var(--glass-glow)`. Matches the glass-glow token from Phase 1. Applied to inputs, buttons, selects.
- **Disabled state**: `opacity: 0.4`, `cursor: not-allowed`, all hover/focus effects suppressed. Standard pattern.
- **Selected state**: 3px left accent bar + border transitions to accent/30. Matches the existing Nebula code block left-bar pattern. Used on GlassCard `selected` variant.

### Toast & Modal Patterns
- **Toast position**: Bottom-right corner, stacks upward.
- **Toast auto-dismiss**: 5 seconds with thin progress bar at bottom showing remaining time. Hover pauses the timer.
- **Toast stacking**: Max 3 toasts visible simultaneously. New toasts push older ones up.
- **Modal backdrop**: Click to close (default behavior). Escape key also closes.
- **Nested modals**: Not supported. Only 1 modal open at a time. Opening a new modal closes the current one.
- **Modal animation**: Scale 0.95→1 + opacity 0→1 on open (200ms). Scale 1→0.97 + opacity 1→0 on close (120ms). Uses modalVariants from lib/motion.ts.

### Skeleton & EmptyState
- **Skeleton shimmer**: Horizontal gradient sweep left-to-right, 1.5s duration, infinite loop. Uses existing `@keyframes shimmer` from main.css.
- **Skeleton variants**: text (variable-width lines), card (full rectangle), circle (avatar), table (rows with cells).
- **EmptyState illustration**: Large muted lucide icon (64px) + descriptive text below + GlassButton primary CTA. Consistent with existing icon set, no custom SVGs.
- **EmptyState parallax**: Subtle ±4px movement based on cursor position. Barely noticeable but adds life.
- **EmptyState CTA**: Uses GlassButton with `primary` variant (accent-tinted background).

### Claude's Discretion
- Exact TypeScript prop interfaces for each component
- Internal implementation details (useRef, useState patterns)
- Which Tailwind classes vs CSS custom properties to use internally
- Whether GlassSelect uses a portal for the dropdown or inline positioning
- Animation details beyond what's specified (spring tension, damping values)
- GlassTab layout animation implementation (spring vs CSS transition)

</decisions>

<specifics>
## Specific Ideas

- Visual behavior should feel like Linear's UI — clean, professional, responsive to interaction but never bouncy or playful
- The selected state with left accent bar already exists in Nebula code blocks — reuse that visual pattern for consistency
- Toasts should feel like Sonner (the toast library) — clean stack, progress bar, hover-to-pause
- GlassModal should feel like Radix Dialog — backdrop blur, centered, clean scale animation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-glass-component-library*
*Context gathered: 2026-03-25*
