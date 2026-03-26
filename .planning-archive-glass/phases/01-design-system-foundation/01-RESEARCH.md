# Phase 1: Design System Foundation - Research

**Researched:** 2026-03-25
**Domain:** CSS design tokens, typography, animation primitives, glassmorphism
**Confidence:** HIGH

## Summary

Phase 1 establishes the CSS custom property tokens, font files, typography scale, and motion variant module that every downstream component depends on. The existing codebase already has a well-structured `@theme` block in `main.css` with 11 data-theme overrides plus a default Zenith theme (12 total), Framer Motion 12.5 installed and used across 20+ components, and a `usePrefersReducedMotion` hook in the Cortex plugin. The proven glass values from `cortex-theme.ts` (`GLASS_CARD`, `GLASS_SURFACE`) become the baseline for new CSS tokens.

The work is additive: define new CSS custom properties in the existing `@theme` block, add `@font-face` declarations for Plus Jakarta Sans Variable and Geist Mono, create `src/renderer/src/lib/motion.ts` as a centralized motion variants module, and add typography scale utility classes. No existing code needs to change in this phase -- the current `GLASS_CARD`/`GLASS_SURFACE` string constants remain until Phase 4 migration.

**Primary recommendation:** Add all new tokens (glass, timing, easing) to the `@theme` block in `main.css`, create font face declarations alongside existing JetBrains Mono ones, build `lib/motion.ts` exporting raw Framer Motion variant objects that consume the CSS timing tokens, and define typography scale as Tailwind `@utility` classes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Background opacity: `bg-white/[0.03]` -- very subtle tint, lets background through (matches current Cortex GLASS_CARD)
- Blur radius: `backdrop-blur-xl` (24px) -- strong frosting, good depth perception (matches Cortex)
- Border alpha: `border-white/[0.08]` -- barely visible edge, clean look (matches Cortex)
- Accent glow on hover/focus: `box-shadow: 0 0 0 2px accent/20` -- subtle highlight ring, not overwhelming
- All glass tokens must be CSS custom properties in the `@theme` block so they adapt per theme
- Tokens: `--glass-bg`, `--glass-border`, `--glass-blur`, `--glass-glow`
- **Sans font**: Plus Jakarta Sans Variable (single woff2 file, all weights 200-800)
- **Mono font**: Geist Mono replacing JetBrains Mono entirely (remove JetBrains Mono files)
- **Fallback chain**: Plus Jakarta Sans -> Inter (kept as fallback) -> system-ui -> sans-serif
- **Mono fallback**: Geist Mono -> system monospace
- **font-display**: `swap`
- **Inter files**: Keep in assets/fonts/ as fallback, do not delete
- **Easing character**: Smooth deceleration (ease-out curve: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`)
- **Stagger timing**: Fast cascade -- 60ms between cards (current Cortex setting)
- **Page transitions**: Fade + subtle rise -- opacity 0->1, y: 8px->0, duration 250ms
- **Duration scale**: Snappy -- 150ms feedback, 250ms transitions, 400ms entrances
- **Timing tokens**: `--duration-instant: 100ms`, `--duration-fast: 150ms`, `--duration-normal: 250ms`, `--duration-slow: 400ms`, `--duration-slower: 600ms`
- **Easing tokens**: `--ease-out`, `--ease-spring`, `--ease-smooth`
- All variants must respect `usePrefersReducedMotion` (already exists in codebase)
- **Blur tier** (real `backdrop-blur-xl`): GlassCard, GlassModal, GlassToast only
- **Translucent tier** (no blur): GlassSurface, GlassInput, GlassSelect, GlassButton, GlassBadge, GlassTab -- use `bg-white/[0.03]` without blur
- **Nested surfaces**: Always translucent-only. A card inside a modal does NOT get blur.
- **Max simultaneous blur layers**: 6
- **Overflow strategy**: Auto-degrade -- if blur layer count exceeds 6, new surfaces render as translucent-only

### Claude's Discretion
- Exact `size-adjust` values for font CLS minimization
- Whether glass tokens use computed values or static per-theme overrides
- Internal structure of `lib/motion.ts` (exports as raw objects vs hooks)
- Exact typography scale rem values (within the specified tier names)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Glass design tokens added to CSS @theme block (--glass-bg, --glass-border, --glass-blur, --glass-glow) that adapt per theme | Glass token architecture pattern, per-theme override strategy, existing @theme block structure |
| FOUND-02 | Shared motion variants module created at lib/motion.ts with stagger, page transition, modal, hover lift, and slide panel variants | Framer Motion variant API, existing cardVariants pattern in cortex-theme.ts, reduced-motion hook |
| FOUND-03 | Plus Jakarta Sans Variable font installed and set as --font-sans | Font loading via @font-face in main.css, woff2 variable font format, size-adjust for CLS |
| FOUND-04 | Geist Mono font installed and set as --font-mono | @font-face replacement of JetBrains Mono, Geist Mono woff2 sourcing |
| FOUND-05 | Typography scale CSS classes defined (hero, h1, h2, h3, body, small, caption, mono) | Tailwind v4 @utility directive, rem-based scale, line-height/letter-spacing pairing |
| FOUND-06 | Timing tokens and easing tokens defined in :root | CSS custom properties in @theme block, cubic-bezier values, spring approximation |
| FOUND-07 | Two-tier blur strategy implemented (translucent-only for nested surfaces, blur for top-level glass) | Glass token design with separate blur/translucent token sets, GPU performance constraints |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TailwindCSS | 4.0.12 | Utility-first CSS with `@theme` token system | Already in codebase, `@theme` block is the canonical token location |
| Framer Motion | 12.5.0 | React animation library for variants, AnimatePresence, layout animations | Already used across 20+ components in codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tw-animate-css | 1.2.5 | Pre-built Tailwind animation utilities | Already imported in main.css, provides base keyframes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS custom properties for easing | Framer Motion spring configs only | CSS tokens are reusable in non-Framer contexts (CSS transitions, hover states); Framer springs for JS-driven physics only |

**Installation:**
No new npm dependencies needed. Font files (Plus Jakarta Sans Variable, Geist Mono) must be downloaded and placed in `src/renderer/src/assets/fonts/`.

Font sources:
- Plus Jakarta Sans Variable: Google Fonts (woff2 variable, all weights 200-800 in one file)
- Geist Mono: Vercel's Geist font package (https://github.com/vercel/geist-font) -- extract woff2 files

## Architecture Patterns

### Recommended File Structure
```
src/renderer/src/
├── assets/
│   ├── fonts/
│   │   ├── PlusJakartaSans-Variable.woff2    # NEW: Variable sans font
│   │   ├── GeistMono-Regular.woff2           # NEW: Mono font (replaces JetBrains)
│   │   ├── GeistMono-Medium.woff2            # NEW
│   │   ├── GeistMono-SemiBold.woff2          # NEW
│   │   ├── GeistMono-Bold.woff2              # NEW
│   │   ├── JetBrainsMono-Regular.woff2       # REMOVE (replaced by Geist Mono)
│   │   ├── JetBrainsMono-Bold.woff2          # REMOVE
│   │   ├── JetBrainsMono-Italic.woff2        # REMOVE
│   │   └── JetBrainsMono-SemiBold.woff2      # REMOVE
│   ├── main.css                              # MODIFY: @font-face, @theme tokens, typography utilities
│   └── base.css                              # UNTOUCHED
├── lib/
│   └── motion.ts                             # NEW: Centralized motion variants
```

### Pattern 1: CSS Custom Properties in Tailwind v4 @theme Block

**What:** All design tokens live in the `@theme` block so Tailwind can generate utilities from them and they participate in theme overrides via `[data-theme]` selectors.

**When to use:** For any token that needs to be theme-aware or available as a Tailwind utility.

**Example:**
```css
@theme {
  /* existing tokens... */

  /* Glass tokens */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-blur: 24px;
  --glass-glow: 0 0 0 2px oklch(72% 0.15 195 / 0.2);

  /* Timing tokens */
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;

  /* Easing tokens */
  --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Tailwind v4 @theme note:** In Tailwind v4, the `@theme` block defines design tokens that are automatically available as CSS custom properties AND as Tailwind utility values. Properties like `--duration-*` automatically work with `duration-*` utilities. Properties like `--ease-*` work with `ease-*` utilities.

### Pattern 2: Per-Theme Glass Token Overrides

**What:** Each `[data-theme]` selector can override `--glass-glow` to use the theme's accent color instead of the default cyan.

**When to use:** The `--glass-glow` token must reference the theme's `--color-accent` to produce a cohesive glow ring per theme.

**Example:**
```css
/* Default theme */
@theme {
  --glass-glow: 0 0 0 2px oklch(72% 0.15 195 / 0.2); /* cyan */
}

/* Per-theme override — glass-glow uses that theme's accent */
[data-theme="portfolio"] {
  --glass-glow: 0 0 0 2px rgba(245, 158, 11, 0.2); /* amber */
}
[data-theme="rose-pine"] {
  --glass-glow: 0 0 0 2px oklch(68% 0.14 350 / 0.2); /* rose */
}
/* ... repeat for all 11 non-default themes */
```

**Recommendation (Claude's discretion):** Use static per-theme overrides for `--glass-glow` rather than computed values. Reason: `box-shadow` cannot reference other CSS custom properties within `oklch()` in a single shorthand in all browsers. Static values are reliable and the 12 themes are a fixed set. The other glass tokens (`--glass-bg`, `--glass-border`, `--glass-blur`) use white/neutral values that don't change per theme, so they only need the default.

### Pattern 3: Framer Motion Variant Objects Module

**What:** A centralized `lib/motion.ts` that exports typed variant objects for all standard animations, plus a `useMotionVariants()` hook that returns reduced-motion-safe versions.

**When to use:** Every component imports from `lib/motion.ts` instead of defining inline animation configs.

**Recommendation (Claude's discretion):** Export both raw variant objects AND a `useMotionVariants(reducedMotion: boolean)` hook. Raw objects for simple cases where reduced motion is handled elsewhere; the hook for the common pattern where a component needs all variants at once.

**Example:**
```typescript
// src/renderer/src/lib/motion.ts
import type { Variants, Transition } from 'framer-motion'

// ── Timing tokens (mirror CSS custom properties) ────────────────
export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6
} as const

export const EASE = {
  out: [0.25, 0.46, 0.45, 0.94] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const
}

export const STAGGER_DELAY = 0.06 // 60ms

// ── Stagger container + item ────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: STAGGER_DELAY }
  }
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.slow, ease: EASE.out }
  }
}

// ── Page transition ─────────────────────────────────────────────
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE.out }
  },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast } }
}

// ── Modal ───────────────────────────────────────────────────────
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } }
}
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE.spring }
  }
}

// ── Hover lift ──────────────────────────────────────────────────
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: DURATION.fast, ease: EASE.out } },
  whileTap: { scale: 0.97 }
}

// ── Slide panel ─────────────────────────────────────────────────
export const slidePanel: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASE.out }
  },
  exit: { x: '100%', opacity: 0, transition: { duration: DURATION.fast } }
}

// ── Reduced-motion-safe hook ────────────────────────────────────
export function getReducedMotionVariants(reducedMotion: boolean) {
  if (!reducedMotion) {
    return { staggerContainer, staggerItem, pageTransition, modalOverlay, modalContent, hoverLift, slidePanel }
  }
  const instant: Transition = { duration: 0.01 }
  return {
    staggerContainer: { hidden: { opacity: 1 }, visible: { opacity: 1 } },
    staggerItem: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: instant } },
    pageTransition: { initial: { opacity: 0 }, animate: { opacity: 1, transition: instant }, exit: { opacity: 0, transition: instant } },
    modalOverlay: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: instant } },
    modalContent: { hidden: { opacity: 0 }, visible: { opacity: 1, scale: 1, y: 0, transition: instant } },
    hoverLift: { whileHover: {}, whileTap: {} },
    slidePanel: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: instant }, exit: { opacity: 0, transition: instant } }
  }
}
```

### Pattern 4: Typography Scale as Tailwind @utility Classes

**What:** Define a set of typography utility classes (`.text-hero`, `.text-h1`, etc.) using Tailwind v4's `@utility` directive, combining font-size, line-height, letter-spacing, and font-weight.

**Recommendation (Claude's discretion):** Use these rem values for the scale:

| Class | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|----------------|
| `.text-hero` | 2.5rem (40px) | 800 | 1.1 | -0.025em |
| `.text-h1` | 1.875rem (30px) | 700 | 1.2 | -0.02em |
| `.text-h2` | 1.5rem (24px) | 600 | 1.25 | -0.015em |
| `.text-h3` | 1.25rem (20px) | 600 | 1.3 | -0.01em |
| `.text-body` | 0.875rem (14px) | 400 | 1.6 | 0 |
| `.text-small` | 0.8125rem (13px) | 400 | 1.5 | 0.01em |
| `.text-caption` | 0.75rem (12px) | 500 | 1.4 | 0.02em |
| `.text-mono` | 0.8125rem (13px) | 400 | 1.6 | 0.02em |

These produce visually distinct sizing with enough differentiation at each step. Body is 14px (standard for dense desktop UIs), hero is 40px for dramatic dashboard headers.

**Example:**
```css
@utility text-hero {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.025em;
}

@utility text-h1 {
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* ... and so on for each tier */

@utility text-mono {
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 0.02em;
  font-family: var(--font-mono);
}
```

### Anti-Patterns to Avoid
- **Inline animation configs:** Do NOT define `initial={{ opacity: 0, y: 12 }}` inline in components. Import from `lib/motion.ts` so durations/easings stay consistent.
- **Hardcoded font stacks in components:** Always use `var(--font-sans)` or `var(--font-mono)`, never raw font names.
- **Blur on nested surfaces:** Never apply `backdrop-blur` to a surface inside another glass surface. Always use the translucent-only tier for nested elements.
- **Glass tokens outside @theme:** Do not define `--glass-*` in `:root` or a separate block. They must be in `@theme` so Tailwind generates utilities.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reduced motion detection | Custom matchMedia listener | Existing `usePrefersReducedMotion()` hook in `src/renderer/src/plugins/cortex/components/useReducedMotion.ts` | Already tested, reactively updates |
| Stagger animations | Manual `setTimeout` chains | Framer Motion `staggerChildren` in container variants | Handles mount/unmount, respects AnimatePresence |
| Font loading orchestration | `FontFace` API in JS | CSS `@font-face` with `font-display: swap` | Simpler, browser-native, no JS needed in Electron |
| CSS variable-aware animations | CSS `@keyframes` using custom properties | Framer Motion variants that read JS constants mirroring CSS tokens | Framer handles interpolation; CSS custom properties can't animate natively |
| Typography scale system | Custom className builder | Tailwind `@utility` directives | Statically extracted, tree-shaken, IDE autocomplete |

**Key insight:** The codebase already has all the infrastructure (Tailwind v4 @theme, Framer Motion, reduced-motion hook). This phase is about centralizing and standardizing, not introducing new tooling.

## Common Pitfalls

### Pitfall 1: Tailwind v4 @theme Namespace Conflicts
**What goes wrong:** Custom properties defined in `@theme` must follow Tailwind v4's namespace conventions. A property like `--glass-blur` won't automatically become a `blur-glass` utility -- it's just a CSS custom property.
**Why it happens:** Tailwind v4's `@theme` maps specific prefixes to utility classes (e.g., `--color-*` to `bg-*`, `text-*`; `--duration-*` to `duration-*`). Non-standard prefixes like `--glass-*` are just custom properties.
**How to avoid:** For `--glass-*` tokens, use them via `var(--glass-bg)` in component classes. For `--duration-*` and `--ease-*`, use the standard Tailwind prefixes so utilities like `duration-fast` and `ease-out` work automatically.
**Warning signs:** `duration-fast` doesn't resolve in Tailwind; glass utilities don't appear in IDE autocomplete.

### Pitfall 2: Variable Font @font-face Weight Range
**What goes wrong:** A variable font declared without `font-weight: 200 800` range in `@font-face` defaults to weight 400 only; requests for bold/semibold fall back to the next available font.
**Why it happens:** Variable fonts need the weight range declared explicitly.
**How to avoid:** Use `font-weight: 200 800` in the `@font-face` rule for Plus Jakarta Sans Variable.
**Warning signs:** Bold headings render in Inter instead of Plus Jakarta Sans.

### Pitfall 3: Backdrop-filter Stacking and GPU Cost
**What goes wrong:** Multiple overlapping `backdrop-blur` layers cause compounded blur (each layer blurs everything behind it including other blurred layers), leading to visual artifacts and GPU frame drops.
**Why it happens:** `backdrop-filter` is composited per-layer in the GPU. Each layer re-reads the composited result behind it.
**How to avoid:** Enforce the two-tier strategy: max 3-4 blur surfaces visible simultaneously (cards in view), never nest blur inside blur. The auto-degrade overflow strategy (cap at 6) prevents runaway.
**Warning signs:** Frame rate drops when multiple glass panels overlap; visual "double frosting" artifacts.

### Pitfall 4: CSS Custom Properties Can't Animate
**What goes wrong:** Attempting to use `transition: --glass-bg 0.2s` does nothing because CSS custom properties are not animatable by default.
**Why it happens:** CSS custom properties have no type information. The `@property` rule can make them animatable, but only for specific syntax types.
**How to avoid:** Use Framer Motion for any glass property transitions (opacity, transform). Keep CSS custom properties as static tokens, not animated values.
**Warning signs:** Theme transitions appear instant/jumpy for glass surfaces.

### Pitfall 5: Font CLS (Cumulative Layout Shift) on Swap
**What goes wrong:** When `font-display: swap` loads the custom font, text reflows because the custom font has different metrics than the fallback.
**Why it happens:** Plus Jakarta Sans has different ascent/descent/line-gap metrics than Inter or system-ui.
**How to avoid:** Add `size-adjust`, `ascent-override`, `descent-override` on the fallback `@font-face` rule for Inter to match Plus Jakarta Sans metrics. Approximate values: `size-adjust: 104%`, `ascent-override: 92%`, `descent-override: 22%` (fine-tune visually).
**Warning signs:** Visible text jump when the custom font loads, especially noticeable in Electron since load is fast.

### Pitfall 6: Relocating useReducedMotion Hook
**What goes wrong:** The existing `usePrefersReducedMotion` is in `src/renderer/src/plugins/cortex/components/useReducedMotion.ts` -- a Cortex-specific location. Other plugins importing from a cortex path creates coupling.
**Why it happens:** It was built for Cortex first, before becoming shared infrastructure.
**How to avoid:** Move the hook to `src/renderer/src/lib/useReducedMotion.ts` (or keep it in cortex and re-export from lib). Update imports in existing Cortex components.
**Warning signs:** Circular dependency warnings; non-Cortex components importing from cortex plugin directory.

## Code Examples

### @font-face for Variable Font
```css
/* Plus Jakarta Sans Variable — single file covers all weights */
@font-face {
  font-family: "Plus Jakarta Sans";
  src: url("./fonts/PlusJakartaSans-Variable.woff2") format("woff2-variations");
  font-weight: 200 800;
  font-style: normal;
  font-display: swap;
}

/* Geist Mono — individual weight files */
@font-face {
  font-family: "Geist Mono";
  src: url("./fonts/GeistMono-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Geist Mono";
  src: url("./fonts/GeistMono-Medium.woff2") format("woff2");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Geist Mono";
  src: url("./fonts/GeistMono-SemiBold.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Geist Mono";
  src: url("./fonts/GeistMono-Bold.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

### Updated @theme Font Stacks
```css
@theme {
  --font-sans: "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
```

### Fallback Font Metrics Override (CLS minimization)
```css
/* Adjust Inter fallback to approximate Plus Jakarta Sans metrics */
@font-face {
  font-family: "Inter";
  src: local("Inter");
  size-adjust: 104%;
  ascent-override: 92%;
  descent-override: 22%;
  line-gap-override: 0%;
}
```

### Glass Token Usage in Components
```typescript
// Component using glass tokens via Tailwind classes
<div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[var(--glass-blur)] rounded-2xl">
  {/* Top-level glass surface -- gets blur */}
</div>

// Nested surface -- translucent only, NO blur
<div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl">
  {/* Nested inside a glass card */}
</div>
```

### Motion Variant Usage in Components
```typescript
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import { usePrefersReducedMotion } from '@renderer/lib/useReducedMotion'
import { getReducedMotionVariants } from '@renderer/lib/motion'

function CardGrid({ items }: Props): React.JSX.Element {
  const reduced = usePrefersReducedMotion()
  const variants = getReducedMotionVariants(reduced)

  return (
    <motion.div variants={variants.staggerContainer} initial="hidden" animate="visible">
      {items.map((item, i) => (
        <motion.div key={item.id} variants={variants.staggerItem}>
          {/* card content */}
        </motion.div>
      ))}
    </motion.div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JetBrains Mono static weights | Geist Mono static weights (decision) | This phase | Geist Mono matches Vercel's design language; modern proportions for code |
| Inter only for sans | Plus Jakarta Sans Variable primary, Inter fallback | This phase | Variable font = single file, all weights, smaller total size |
| Inline Framer Motion configs | Centralized `lib/motion.ts` variants module | This phase | Consistency across all 20+ animated components |
| `GLASS_CARD` / `GLASS_SURFACE` string constants in cortex-theme.ts | CSS custom property tokens in @theme | This phase (tokens), Phase 4 (migration) | Theme-aware, available to all plugins via CSS |
| Tailwind v3 `theme.extend` | Tailwind v4 `@theme` block | Already in codebase | Native CSS custom properties, no config file needed |

**Deprecated/outdated:**
- `GLASS_CARD` and `GLASS_SURFACE` in `cortex-theme.ts`: Will be deprecated in Phase 4 once components migrate to glass tokens. In Phase 1, they remain untouched.
- `cardVariants` / `useCardVariants` in `cortex-theme.ts`: Will be superseded by `staggerItem` / `getReducedMotionVariants` from `lib/motion.ts`. Migration in Phase 4.

## Open Questions

1. **Geist Mono font file sourcing**
   - What we know: Geist Mono is distributed via Vercel's geist-font npm package and GitHub repo. Woff2 files need to be extracted.
   - What's unclear: Whether variable font version of Geist Mono is available (reducing file count from 4 to 1). The GitHub repo may have both.
   - Recommendation: Download from GitHub releases. If variable woff2 exists, use it (matching Plus Jakarta Sans approach). Otherwise, use 4 static weight files (Regular, Medium, SemiBold, Bold).

2. **Plus Jakarta Sans Variable exact file name**
   - What we know: Google Fonts serves it as a variable font. The woff2 file name varies by source.
   - What's unclear: Exact filename from fontsource or Google Fonts download.
   - Recommendation: Download from Google Fonts or fontsource. Name the file `PlusJakartaSans-Variable.woff2` for clarity.

3. **Font fallback metric values precision**
   - What we know: `size-adjust`, `ascent-override`, `descent-override` values need to match Plus Jakarta Sans metrics closely to minimize CLS.
   - What's unclear: Exact values require measurement against the actual font file.
   - Recommendation: Start with approximate values (`size-adjust: 104%`, `ascent-override: 92%`, `descent-override: 22%`). Fine-tune after visual testing. In Electron, font loads are near-instant from local disk, so CLS may be negligible.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** - `src/renderer/src/assets/main.css` (line 35-65): Existing `@theme` block with 12 theme definitions, current `--font-sans` and `--font-mono` declarations
- **Codebase inspection** - `src/renderer/src/plugins/cortex/cortex-theme.ts`: Existing `GLASS_CARD`, `GLASS_SURFACE` string constants, `cardVariants`, `useCardVariants` pattern
- **Codebase inspection** - `src/renderer/src/plugins/cortex/components/useReducedMotion.ts`: Existing `usePrefersReducedMotion` hook
- **Codebase inspection** - `package.json`: Framer Motion 12.5.0, TailwindCSS 4.0.12 confirmed
- **Codebase inspection** - `electron.vite.config.ts`: Tailwind vite plugin configured, path aliases confirmed

### Secondary (MEDIUM confidence)
- **Tailwind v4 @theme block behavior**: Based on Tailwind v4 documentation -- `@theme` defines custom properties and generates matching utilities for standard namespace prefixes (`--color-*`, `--duration-*`, `--ease-*`, etc.)
- **Framer Motion Variants API**: Based on Framer Motion documentation -- `Variants` type, `staggerChildren`, `AnimatePresence` are stable APIs in v12
- **Google Fonts / Vercel Geist**: Font availability and format confirmed via public repositories

### Tertiary (LOW confidence)
- **Font metric override values** (`size-adjust: 104%`, etc.): Approximate values based on general knowledge of Plus Jakarta Sans vs Inter metrics. Must be validated visually against actual font files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use; no new dependencies needed
- Architecture: HIGH - Patterns directly derived from existing codebase (cortex-theme.ts, main.css @theme block)
- Pitfalls: HIGH - Backdrop-filter stacking, variable font declarations, and Tailwind v4 namespace behavior are well-documented concerns
- Font sourcing: MEDIUM - Files need to be downloaded; exact variable font availability for Geist Mono needs confirmation

**Research date:** 2026-03-25
**Valid until:** 2026-04-24 (stable domain -- CSS tokens and font loading don't change rapidly)
