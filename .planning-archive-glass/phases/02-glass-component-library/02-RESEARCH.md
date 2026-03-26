# Phase 2: Glass Component Library - Research

**Researched:** 2026-03-25
**Domain:** React component library (glassmorphism design system primitives)
**Confidence:** HIGH

## Summary

Phase 2 builds 11 glass-styled React components in `src/renderer/src/components/ui/`, exported from a barrel `index.ts`. These components consume the design tokens (glass, timing, easing) and motion variants established in Phase 1. The stack is already fully installed -- React 19, Framer Motion 12, Tailwind CSS 4, Lucide React -- so no new dependencies are needed.

The core technical challenge is ensuring the frosted-glass effect renders correctly across all 12 existing themes (default + 11 named themes). Each theme defines `--glass-bg`, `--glass-border`, `--glass-blur`, and `--glass-glow` tokens. The two-tier blur strategy (blur tier for top-level surfaces like GlassCard/Modal/Toast; translucent tier with no backdrop-blur for nested surfaces like GlassInput/GlassButton/GlassBadge) is already encoded in the token comments and must be respected by each component.

The toast system (COMP-09) and modal system (COMP-08) are the most complex components, requiring AnimatePresence management, portal rendering (for modal), focus trapping, keyboard handling, and timer management. The rest are stateless or minimally stateful presentational components.

**Primary recommendation:** Build components bottom-up -- simple presentational components first (GlassBadge, GlassButton, GlassInput), then compound components (GlassCard, GlassSurface, GlassSelect, GlassTab, GlassSkeleton, EmptyState), then overlay components (GlassModal, GlassToast) which require the most infrastructure.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Props style**: Variant props -- predefined variants via props (e.g., `<GlassCard variant="interactive" size="lg">`). Constrained but consistent. No raw className merging for customization.
- **Composition**: Monolithic -- each component is a single component. Pass children, variant, className. No sub-components (no GlassCard.Header pattern).
- **Export style**: Barrel export -- all components importable from `@/components/ui` via a single `index.ts` barrel file.
- **Naming**: Keep the `Glass` prefix on all components (GlassCard, GlassButton, etc.).
- **Hover (interactive cards)**: y: -2px lift + border brightens to white/[0.12] + subtle shadow deepening.
- **Focus ring**: Accent glow ring -- `box-shadow: 0 0 0 2px var(--glass-glow)`. Applied to inputs, buttons, selects.
- **Disabled state**: `opacity: 0.4`, `cursor: not-allowed`, all hover/focus effects suppressed.
- **Selected state**: 3px left accent bar + border transitions to accent/30.
- **Toast position**: Bottom-right corner, stacks upward.
- **Toast auto-dismiss**: 5 seconds with thin progress bar at bottom. Hover pauses timer.
- **Toast stacking**: Max 3 visible simultaneously. New toasts push older ones up.
- **Modal backdrop**: Click to close (default). Escape key also closes.
- **Nested modals**: Not supported. Only 1 modal at a time.
- **Modal animation**: Scale 0.95->1 + opacity 0->1 on open (200ms). Scale 1->0.97 + opacity 1->0 on close (120ms). Uses modalVariants from lib/motion.ts.
- **Skeleton shimmer**: Horizontal gradient sweep left-to-right, 1.5s duration, infinite loop. Uses existing `@keyframes shimmer` from main.css.
- **Skeleton variants**: text, card, circle, table.
- **EmptyState illustration**: Large muted lucide icon (64px) + descriptive text + GlassButton primary CTA.
- **EmptyState parallax**: Subtle +/-4px movement based on cursor position.
- **EmptyState CTA**: Uses GlassButton with `primary` variant.

### Claude's Discretion
- Exact TypeScript prop interfaces for each component
- Internal implementation details (useRef, useState patterns)
- Which Tailwind classes vs CSS custom properties to use internally
- Whether GlassSelect uses a portal for the dropdown or inline positioning
- Animation details beyond what's specified (spring tension, damping values)
- GlassTab layout animation implementation (spring vs CSS transition)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-01 | GlassCard with default, interactive, and selected variants | Blur-tier glass tokens, hoverLift from motion.ts, selected state with accent bar |
| COMP-02 | GlassSurface for headers, toolbars, panel backgrounds | Translucent-tier (no backdrop-blur), --glass-bg + --glass-border tokens |
| COMP-03 | GlassButton with default, primary, danger, ghost variants and sm/md/lg sizes | Translucent-tier, --glass-glow for focus, whileTap scale(0.97) from hoverLift |
| COMP-04 | GlassInput with focus glow and error state | Translucent-tier, --glass-glow focus ring, --color-error for error border |
| COMP-05 | GlassSelect with glass dropdown and selected accent | Translucent-tier, dropdown positioning (portal or inline), keyboard navigation |
| COMP-06 | GlassTab with sliding underline animation | Translucent-tier, layout animation for underline, --color-accent underline |
| COMP-07 | GlassBadge with success, error, warning, info, accent, neutral variants | Translucent-tier, semantic color tokens (--color-success, --color-error, etc.) |
| COMP-08 | GlassModal with backdrop blur and scale entrance/exit | modalOverlay + modalContent variants from motion.ts, AnimatePresence, focus trap, Escape key |
| COMP-09 | GlassToast with slide entrance, auto-dismiss progress bar, type variants | AnimatePresence, timer with pause-on-hover, max 3 stacking, zustand or context for state |
| COMP-10 | GlassSkeleton with shimmer animation and text/card/circle/table variants | Existing @keyframes shimmer in main.css, variant-specific dimensions |
| COMP-11 | EmptyState with floating illustration, parallax mouse effect, CTA button | Lucide icon at 64px, mousemove listener for parallax, composes GlassButton |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.1 | Component framework | Already installed, project standard |
| Framer Motion | 12.5.0 | Animation (AnimatePresence, motion.*, layout) | Already installed, used throughout codebase |
| Tailwind CSS | 4.0.12 | Utility-first styling | Already installed, project standard |
| Lucide React | 0.475.0 | Icon library | Already installed, used throughout codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lib/motion.ts | N/A (local) | Centralized motion variants, DURATION, EASE constants | All animated components (modal, toast, hover, stagger) |
| lib/useReducedMotion.ts | N/A (local) | Reduced motion preference hook | Every component with animation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-built toast state | sonner or react-hot-toast | User locked "no new npm dependencies" in REQUIREMENTS.md. Build toast state in-house. |
| Hand-built focus trap | focus-trap-react | Same constraint. Simple focus-trap logic for modal is ~20 lines. |
| Hand-built select dropdown | Radix Select / React Select | Same constraint. Custom dropdown with keyboard nav is moderate complexity. |

**Installation:**
```bash
# No installation needed -- all dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/components/ui/
├── index.ts              # Barrel export -- all 11 components
├── GlassCard.tsx
├── GlassSurface.tsx
├── GlassButton.tsx
├── GlassInput.tsx
├── GlassSelect.tsx
├── GlassTab.tsx
├── GlassBadge.tsx
├── GlassModal.tsx
├── GlassToast.tsx
├── GlassSkeleton.tsx
├── EmptyState.tsx
└── glass-utils.ts        # Shared helpers (cn, variant maps, glass class builders)
```

### Pattern 1: Variant Props with Type-Safe Maps
**What:** Each component uses a typed `variant` prop mapped to CSS class combinations via a constant object. No arbitrary className merging for variants.
**When to use:** Every glass component.
**Example:**
```typescript
// Variant map pattern
const BUTTON_VARIANTS = {
  default: 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-text-primary hover:bg-white/[0.06]',
  primary: 'bg-accent/20 border-accent/30 text-accent hover:bg-accent/30',
  danger: 'bg-error/20 border-error/30 text-error hover:bg-error/30',
  ghost: 'bg-transparent border-transparent text-text-secondary hover:bg-white/[0.04]'
} as const

type ButtonVariant = keyof typeof BUTTON_VARIANTS

interface Props {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
  className?: string  // additive only, not replacing variant styles
}
```

### Pattern 2: Two-Tier Blur Classification
**What:** Components are classified as blur-tier (backdrop-blur + glass tokens) or translucent-tier (glass-bg only, no backdrop-blur). This is the core architectural decision from Phase 1.
**When to use:** Determining the base styles for every component.

| Tier | Components | Base Style |
|------|-----------|------------|
| Blur | GlassCard, GlassModal, GlassToast | `bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)]` |
| Translucent | GlassSurface, GlassButton, GlassInput, GlassSelect, GlassTab, GlassBadge | `bg-[var(--glass-bg)] border border-[var(--glass-border)]` (no backdrop-blur) |

### Pattern 3: Motion Integration
**What:** Import motion variants from `@renderer/lib/motion` rather than defining inline. Use `getReducedMotionVariants()` for accessibility.
**When to use:** GlassCard (hoverLift), GlassModal (modalOverlay, modalContent), GlassToast (custom slide variant), GlassButton (whileTap).
**Example:**
```typescript
import { motion } from 'framer-motion'
import { hoverLift, DURATION, EASE } from '@renderer/lib/motion'

// For interactive GlassCard:
<motion.div {...hoverLift} className={cardClasses}>
  {children}
</motion.div>
```

### Pattern 4: Toast State Management
**What:** Toast state managed via a lightweight Zustand store or React context. Components call `addToast()` from anywhere. The GlassToast container renders the stack.
**When to use:** GlassToast system.
**Example:**
```typescript
// Toast store pattern (new file: stores/toast-store.ts or inline in GlassToast.tsx)
interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number // default 5000ms
}

// Expose: useToast() => { addToast, removeToast, toasts }
// GlassToast.tsx renders <AnimatePresence> over toasts array (max 3)
```

### Pattern 5: Modal Portal + Focus Trap
**What:** GlassModal renders via React portal to `document.body` to escape stacking context. Minimal focus trap: on mount, save previously focused element; on unmount, restore focus. Tab key cycles within modal.
**When to use:** GlassModal.
**Example:**
```typescript
import { createPortal } from 'react-dom'

// GlassModal renders:
return createPortal(
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          variants={modalOverlay} initial="hidden" animate="visible" exit="hidden"
          onClick={onClose} />
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
          variants={modalContent} initial="hidden" animate="visible" exit="hidden">
          <div ref={modalRef} role="dialog" aria-modal="true">
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>,
  document.body
)
```

### Anti-Patterns to Avoid
- **Inline glass values:** Never hardcode `bg-white/[0.03]` or `backdrop-blur-xl` directly. Always consume `--glass-bg`, `--glass-border`, `--glass-blur` tokens so themes work automatically.
- **Importing from cortex-theme.ts:** The existing `GLASS_CARD` and `GLASS_SURFACE` constants in cortex-theme.ts are Cortex-specific legacy. New glass components must use the design tokens from main.css, not cortex-theme.ts. (Phase 4 will migrate Cortex to use these new components.)
- **Adding backdrop-blur to translucent-tier components:** Nested surfaces with backdrop-blur cause compounding blur artifacts. Only blur-tier components (GlassCard, GlassModal, GlassToast) get `backdrop-blur`.
- **Dynamic className construction with template literals for variants:** Use variant maps (objects) not string interpolation. Tailwind's JIT compiler needs to see full class names statically.
- **Missing AnimatePresence wrapper:** Any component that exits the DOM (toast, modal) MUST be wrapped in AnimatePresence with a unique `key`. Without it, exit animations won't play.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Class name merging | Custom string concatenation | `clsx` or simple `cn()` utility (2-line function) | Already common pattern; Tailwind class conflicts need last-wins semantics. Note: clsx is likely already a transitive dependency via tw-animate-css. Check before adding. |
| Animation variants | Custom spring configs per component | `@renderer/lib/motion` exports | Phase 1 established centralized variants -- reuse them |
| Reduced motion | Per-component media query checks | `usePrefersReducedMotion()` + `getReducedMotionVariants()` | Already built in Phase 1 |
| Shimmer animation | Custom CSS keyframes | Existing `@keyframes shimmer` in main.css (line 1002) | Already defined, just apply via animation property |
| Icon rendering | Custom SVG components | Lucide React icons | Already installed, matches existing icon set |

**Key insight:** The project explicitly states "No new npm dependencies" in REQUIREMENTS.md out-of-scope. Every solution must use existing libraries or hand-built utilities. The existing stack (React 19 + Framer Motion 12 + Tailwind 4 + Lucide) is sufficient for all 11 components.

## Common Pitfalls

### Pitfall 1: Tailwind v4 Arbitrary Value Syntax for CSS Variables
**What goes wrong:** Using `bg-[--glass-bg]` instead of `bg-[var(--glass-bg)]`. Tailwind v4 requires the `var()` wrapper for CSS custom properties in arbitrary values.
**Why it happens:** Tailwind v3 had a shorthand that some developers remember.
**How to avoid:** Always use `bg-[var(--glass-bg)]`, `border-[var(--glass-border)]`, `backdrop-blur-[var(--glass-blur)]`.
**Warning signs:** Styles not applying; element appears with no background.

### Pitfall 2: Backdrop-Blur on Nested Elements
**What goes wrong:** Applying `backdrop-blur` to a child element inside a parent that already has `backdrop-blur` causes double-blur or visual artifacts.
**Why it happens:** backdrop-filter is composited per stacking context, so nested blurs stack.
**How to avoid:** Strictly follow the two-tier strategy. GlassSurface, GlassInput, etc. never get backdrop-blur. Only top-level containers (GlassCard, GlassModal, GlassToast) blur.
**Warning signs:** Overly frosted areas, text becoming unreadable, performance drops.

### Pitfall 3: AnimatePresence Exit Animations Not Playing
**What goes wrong:** Modal or toast disappears instantly without exit animation.
**Why it happens:** Missing `key` prop, component unmounts before AnimatePresence can capture exit, or `exit` variant not defined.
**How to avoid:** Ensure `<AnimatePresence>` wraps the conditional render, the animated element has a stable `key`, and `exit` variant is defined on the motion component.
**Warning signs:** Elements vanish instead of animating out.

### Pitfall 4: Toast Timer Not Pausing on Hover
**What goes wrong:** Toast dismisses while user is reading it.
**Why it happens:** Using a simple `setTimeout` without pause/resume capability.
**How to avoid:** Track remaining time in state. On mouseenter, clear the timeout and save remaining time. On mouseleave, restart with remaining time.
**Warning signs:** Toast disappears while cursor is on it.

### Pitfall 5: Focus Trap Escape in Modal
**What goes wrong:** Tab key moves focus outside the modal dialog to elements behind it.
**Why it happens:** No focus containment logic.
**How to avoid:** On mount, query all focusable elements inside the modal ref. On Tab press at last element, wrap to first. On Shift+Tab at first, wrap to last. On Escape, call onClose.
**Warning signs:** Background elements receiving focus while modal is open.

### Pitfall 6: GlassSelect Dropdown Clipping
**What goes wrong:** The select dropdown gets clipped by an `overflow: hidden` parent container.
**Why it happens:** The dropdown renders inside the same DOM tree as the select trigger.
**How to avoid:** Either use a portal (createPortal) for the dropdown, or use CSS `position: fixed` with calculated coordinates. Inline positioning works if no ancestor has `overflow: hidden`.
**Warning signs:** Dropdown partially hidden or cut off.

### Pitfall 7: Theme Token Fallback
**What goes wrong:** Glass components look broken on a theme that doesn't define custom `--glass-glow`.
**Why it happens:** Only some tokens have per-theme overrides. If a component uses a token not overridden, it falls back to the @theme defaults.
**How to avoid:** All 12 themes already define `--glass-glow` (verified in main.css). The base `--glass-bg`, `--glass-border`, `--glass-blur` tokens are theme-independent rgba values. No per-theme overrides needed for those -- they work universally.
**Warning signs:** Focus rings wrong color on specific themes.

## Code Examples

### Glass Class Builder Utility
```typescript
// glass-utils.ts
// Lightweight class name merger
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Base glass classes per tier
export const GLASS_BASE = {
  blur: 'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)]',
  translucent: 'bg-[var(--glass-bg)] border border-[var(--glass-border)]'
} as const
```

### GlassCard Component Shape
```typescript
import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import { cn, GLASS_BASE } from './glass-utils'
import { hoverLift } from '@renderer/lib/motion'

interface GlassCardProps {
  variant?: 'default' | 'interactive' | 'selected'
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = 'default', children, className, onClick }, ref) => {
    const isInteractive = variant === 'interactive' || variant === 'selected'
    const Component = isInteractive ? motion.div : 'div'

    return (
      <Component
        ref={ref}
        className={cn(
          GLASS_BASE.blur,
          'rounded-2xl p-4',
          variant === 'interactive' && 'cursor-pointer hover:border-white/[0.12]',
          variant === 'selected' && 'border-l-[3px] border-l-accent/30',
          className
        )}
        {...(isInteractive ? hoverLift : {})}
        onClick={onClick}
      >
        {children}
      </Component>
    )
  }
)
```

### GlassModal Focus Trap Pattern
```typescript
// Minimal focus trap (no external deps)
function useFocusTrap(ref: React.RefObject<HTMLElement>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !ref.current) return
    const el = ref.current
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [isOpen, ref])
}
```

### Toast Timer with Pause
```typescript
function useAutoTimer(duration: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(duration)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    if (paused) return
    startTimeRef.current = Date.now()
    timerRef.current = setTimeout(onExpire, remaining)
    return () => clearTimeout(timerRef.current)
  }, [paused, remaining, onExpire])

  const pause = () => {
    clearTimeout(timerRef.current)
    setRemaining((prev) => prev - (Date.now() - startTimeRef.current))
    setPaused(true)
  }
  const resume = () => setPaused(false)

  return { pause, resume, remaining, duration }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 arbitrary properties `bg-[--var]` | Tailwind v4 requires `bg-[var(--var)]` | Tailwind v4 (2024) | Must use var() wrapper everywhere |
| `react-dom` `createPortal` in class components | `createPortal` in functional components (same API) | React 18+ | No change, just hooks-based |
| Individual motion prop inline | Centralized variant objects in lib/motion.ts | Phase 1 (2026-03-25) | All animations must import from motion.ts |
| Per-plugin glass constants (GLASS_CARD in cortex-theme.ts) | Shared glass components in ui/ directory | Phase 2 (this phase) | Legacy constants remain until Phase 4 migration |

**Deprecated/outdated:**
- `GLASS_CARD` and `GLASS_SURFACE` in cortex-theme.ts: Will be superseded by GlassCard and GlassSurface components. Not removed until Phase 4.
- `cardVariants` in cortex-theme.ts: Superseded by staggerItem/staggerContainer from lib/motion.ts.

## Open Questions

1. **clsx availability**
   - What we know: `clsx` is a common transitive dependency. The project uses `tw-animate-css` which may bring it in.
   - What's unclear: Whether clsx is directly importable or needs explicit install.
   - Recommendation: Write a 2-line `cn()` utility in glass-utils.ts that uses `Array.filter(Boolean).join(' ')`. This avoids any dependency question and is sufficient for the use case (no Tailwind merge needed since variant maps don't produce conflicts).

2. **GlassSelect portal vs inline**
   - What we know: No existing portals in the codebase (grep found zero `createPortal` usage). The select dropdown could clip if ancestors have overflow hidden.
   - What's unclear: Whether any current or future layout will clip the dropdown.
   - Recommendation: Start with inline positioning (`position: absolute` relative to the trigger). If clipping issues arise during Phase 3/4 integration, upgrade to a portal. Simpler is better for now.

3. **Toast store location**
   - What we know: The codebase pattern is one Zustand store per feature domain in `stores/`. Nebula already has its own toast system in nebula-store.ts.
   - What's unclear: Whether the global toast system should live in its own store or be co-located with the GlassToast component.
   - Recommendation: Create a minimal `stores/toast-store.ts` following the existing Zustand pattern. This makes toast accessible from any component via `useToastStore()`.

## Sources

### Primary (HIGH confidence)
- `src/renderer/src/assets/main.css` -- Glass tokens, shimmer keyframes, all 12 theme definitions verified
- `src/renderer/src/lib/motion.ts` -- All motion variants, timing constants, easing constants verified
- `src/renderer/src/plugins/cortex/cortex-theme.ts` -- Existing GLASS_CARD/GLASS_SURFACE patterns verified
- `.planning/phases/01-design-system-foundation/01-01-SUMMARY.md` -- Phase 1 token decisions verified
- `.planning/phases/01-design-system-foundation/01-02-SUMMARY.md` -- Phase 1 motion decisions verified
- `.planning/REQUIREMENTS.md` -- All COMP-01 through COMP-11 requirements verified
- `.planning/phases/02-glass-component-library/02-CONTEXT.md` -- All locked decisions verified

### Secondary (MEDIUM confidence)
- Framer Motion AnimatePresence pattern -- based on established API in Framer Motion 12, verified by existing usage in codebase (10 files use AnimatePresence)
- React createPortal pattern -- standard React API, no codebase precedent (zero existing portals)

### Tertiary (LOW confidence)
- clsx transitive dependency availability -- not verified, mitigated by custom cn() utility

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified in package.json and codebase usage
- Architecture: HIGH -- two-tier blur strategy well-documented in Phase 1, variant prop pattern established in cortex-theme.ts
- Pitfalls: HIGH -- identified from direct codebase inspection (Tailwind v4 syntax, backdrop-blur nesting, AnimatePresence patterns)

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable -- no fast-moving dependencies)
