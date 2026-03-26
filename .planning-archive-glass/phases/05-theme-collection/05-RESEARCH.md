# Phase 5: Theme Collection - Research

**Researched:** 2026-03-25
**Domain:** CSS custom properties, OKLch color space, theme selector UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Primary goal**: Themes optimized for high-volume reading and writing — ease of use, clean, glossy, futuristic, **no eye strain**
- **Controlled saturation**: Accent colors should be vivid enough to be distinctive but not fatiguing during extended sessions
- **Sufficient contrast**: Text must be highly readable. Background-to-text contrast ratio should exceed WCAG AA (4.5:1)
- **Glass compatibility**: Every theme must look good with glass surfaces (backdrop-blur, border opacity, accent glow)
- **6 new themes**: Midnight Bloom, Copper Forge, Ocean Depth, Nebula Dust, Obsidian, Jade Temple — palettes defined in CONTEXT.md
- **OKLch legacy conversion**: All 12 legacy themes converted from hex to oklch() notation in a single atomic commit
- **Glass-glow overrides**: Keep current Phase 1 values unchanged during conversion. Don't re-tune.
- **Mini glass preview**: Below 4 color dots, add a ~80px-wide strip simulating a glass card on that theme's background
- **Theme switch animation**: Smooth color crossfade (~300ms) via CSS transition on all color variables
- **NEW badge**: Small 'NEW' GlassBadge on new theme cards (the 6 new ones), accent-colored
- **Existing Phase 3 decisions preserved**: 3-column grid, name + 4 color dots, "Classic Themes" / "New Collection" section headers, accent border glow on active theme with check icon
- **Cross-theme QA**: All 18 themes must pass visual QA (glass cards visible, accent glow visible, text contrast sufficient, no color clashing, GlassBadge colors distinguishable)

### Claude's Discretion
- Exact OKLch values for all 22 CSS variables per new theme
- Whether to allow subtle color improvements during legacy conversion or keep strict visual match
- Exact mini glass preview implementation (CSS-only or tiny rendered component)
- Whether the crossfade transition applies to all CSS vars or only color-related ones
- How to handle themes where glass-glow might be too subtle or too strong

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| THEME-01 | Midnight Bloom theme defined (magenta-orchid accent on violet-black) | CSS variable pattern from existing themes; OKLch hue ~320-330 for magenta-orchid |
| THEME-02 | Copper Forge theme defined (burnished copper accent on warm charcoal) | OKLch hue ~55-70 for copper/orange tones |
| THEME-03 | Ocean Depth theme defined (aquamarine accent on abyssal blue) | OKLch hue ~185-195 for aquamarine/teal |
| THEME-04 | Nebula Dust theme defined (stellar pink-coral accent on deep space purple) | OKLch hue ~15-25 for pink-coral with low-lightness purple background |
| THEME-05 | Obsidian theme defined (pure monochrome, zero saturation, silver on near-black) | OKLch chroma=0 for all colors; high contrast editorial feel |
| THEME-06 | Jade Temple theme defined (jade green accent on dark forest green) | OKLch hue ~155-165 for jade/emerald tones |
| THEME-07 | Visual theme selector grid with Classic (12) and New Collection (6) sections | Existing GeneralSettings.tsx structure already has section headers and grid |
| THEME-08 | Theme card shows name, 4 color dots, mini preview strip; active theme has accent border glow | Existing ThemeCard has name + dots + check; needs mini preview strip addition |
| THEME-09 | All 12 legacy themes converted from hex to OKLch | Only 1 theme (Portfolio) still uses hex; 10 others already oklch; @theme glass tokens use rgba |
| THEME-10 | Glass components validated across all 18 themes | Manual visual QA against glass-bg, glass-border, glass-glow, accent contrast |
</phase_requirements>

## Summary

Phase 5 is primarily CSS authoring and theme metadata work with a focused UI enhancement to the existing theme selector. The codebase already has a well-established pattern: each theme is a `[data-theme="name"]` CSS block overriding 21 CSS custom properties, with corresponding metadata in `theme-metadata.ts` for the selector grid.

The legacy OKLch conversion is smaller than expected — only the Portfolio theme still uses hex/rgba values. The other 10 non-default classic themes were already authored in oklch during earlier phases. The `@theme` block's `--glass-bg` and `--glass-border` use `rgba(255,255,255,...)` which should also be converted. The new theme creation is well-scoped: 6 themes x 21 CSS variables each, following the exact same pattern as existing themes.

**Primary recommendation:** Follow the existing `[data-theme]` CSS block pattern exactly. Create all 6 new themes in `main.css`, update `theme-metadata.ts` placeholder entries with real values and corrected names, enhance ThemeCard with mini glass preview and NEW badge, and add CSS transition for theme crossfade.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Custom Properties | Native | Theme variable system | Already the established pattern in this codebase |
| OKLch color space | CSS Color Level 4 | Perceptually uniform color notation | Already used by 11 of 12 themes; superior to hex for predictable lightness/chroma control |
| Tailwind v4 | Current | Utility classes, @theme integration | Project's CSS framework; @theme block defines design tokens |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| GlassBadge | Internal component | NEW badge on theme cards | Existing component with accent variant |
| GlassCard | Internal component | Theme card wrapper | Already used in ThemeCard |
| framer-motion | Already installed | Potential animation for theme cards | Only if needed for preview strip animation |

### Alternatives Considered
None — the approach is fully constrained by existing architecture. No new dependencies needed.

**Installation:**
```bash
# No new packages needed — all tooling already in place
```

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/
├── assets/main.css                          # Theme CSS blocks (add 6 new, convert 1 legacy)
├── lib/theme-metadata.ts                    # Theme metadata (update 6 placeholders, fix names)
└── components/settings/GeneralSettings.tsx  # Theme selector UI (enhance ThemeCard)
```

### Pattern 1: Theme CSS Block
**What:** Each theme is a `[data-theme="value"]` selector block overriding 21 CSS custom properties
**When to use:** Every new theme definition
**Example:**
```css
/* Source: existing main.css pattern (e.g., lines 133-155 for nord) */
[data-theme="midnight-bloom"] {
  --color-background: oklch(11% 0.02 300);
  --color-surface: oklch(15% 0.02 300);
  --color-surface-elevated: oklch(19% 0.02 300);
  --color-border: oklch(24% 0.03 300);
  --color-accent: oklch(68% 0.18 330);
  --color-accent-glow: oklch(68% 0.18 330 / 0.2);
  --color-text-primary: oklch(90% 0.01 300);
  --color-text-secondary: oklch(55% 0.02 300);
  --color-success: oklch(72% 0.17 142);
  --color-success-muted: oklch(72% 0.17 142 / 0.15);
  --color-error: oklch(65% 0.2 25);
  --color-error-muted: oklch(65% 0.2 25 / 0.15);
  --color-warning: oklch(75% 0.15 85);
  --color-warning-muted: oklch(75% 0.15 85 / 0.15);
  --color-info: oklch(70% 0.15 250);
  --color-info-muted: oklch(70% 0.15 250 / 0.15);
  --color-diff-add: oklch(72% 0.17 142 / 0.12);
  --color-diff-del: oklch(65% 0.2 25 / 0.12);
  --color-diff-add-text: oklch(78% 0.15 142);
  --color-diff-del-text: oklch(75% 0.18 25);
  --glass-glow: 0 0 0 2px oklch(68% 0.18 330 / 0.2);
}
```

### Pattern 2: Theme Metadata Entry
**What:** Each theme has a metadata entry with value, label, section, and 4 preview colors
**When to use:** Updating theme-metadata.ts for new themes
**Example:**
```typescript
// Source: existing theme-metadata.ts pattern
{
  value: 'midnight-bloom',
  label: 'Midnight Bloom',
  section: 'new',
  colors: {
    bg: 'oklch(11% 0.02 300)',
    surface: 'oklch(15% 0.02 300)',
    accent: 'oklch(68% 0.18 330)',
    text: 'oklch(90% 0.01 300)'
  }
}
```

### Pattern 3: Theme Application Flow
**What:** `data-theme` attribute set on `<html>` element triggers CSS variable overrides
**When to use:** Understanding how themes take effect (no changes needed)
**Flow:**
1. User clicks ThemeCard in GeneralSettings
2. `setSetting('general.theme', value)` updates settings store
3. App.tsx `useEffect` calls `document.documentElement.setAttribute('data-theme', theme)`
4. CSS `[data-theme="x"]` block overrides @theme defaults
5. All components using `var(--color-*)` automatically update

### Pattern 4: Theme Crossfade Animation
**What:** CSS transition on `html` or `:root` to animate color variable changes
**When to use:** Smooth theme switching
**Example:**
```css
/* Add to :root or html selector */
html {
  transition:
    --color-background 300ms ease,
    --color-surface 300ms ease,
    --color-accent 300ms ease;
    /* ... all color vars */
}
```
**Important:** CSS `transition` on custom properties requires `@property` registration for each variable, OR use a simpler approach: transition `background-color`, `color`, and `border-color` on key elements. Alternatively, a brief opacity crossfade on `#root` is simpler and universally compatible.

### Anti-Patterns to Avoid
- **Per-component theme overrides:** Creates drift. All theming must go through CSS custom properties only.
- **Computed color values in JS:** Don't compute colors in JavaScript. All color math happens in CSS via oklch().
- **Hardcoded colors in components:** Any component using raw hex/rgb values instead of `var(--color-*)` will break theme switching.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color space conversion | Manual hex-to-oklch math | Browser DevTools color picker or online converter | OKLch values are perceptual — eyeballing from hex is error-prone |
| Theme preview rendering | Canvas/WebGL mini-renderer | CSS-only mini strip with inline styles | A tiny div with bg + surface + accent colors is sufficient |
| Color contrast checking | Custom contrast ratio calculator | Browser DevTools accessibility audit | Built-in tools are more accurate |
| Badge component | Custom styled span | Existing GlassBadge with variant="accent" | Already built with proper glass styling |

**Key insight:** This phase is almost entirely CSS variable authoring. The complexity is in choosing good OKLch values, not in building infrastructure.

## Common Pitfalls

### Pitfall 1: Placeholder Theme Names Don't Match CONTEXT.md
**What goes wrong:** The existing theme-metadata.ts has placeholder entries with names that don't match the decided themes. Current placeholders: aurora, midnight, sakura, ocean, copper, monochrome. Decided themes: midnight-bloom, copper-forge, ocean-depth, nebula-dust, obsidian, jade-temple.
**Why it happens:** Placeholders were created during Phase 3 before theme names were finalized.
**How to avoid:** Replace ALL 6 placeholder entries (value, label, colors) — don't try to map old names to new ones.
**Warning signs:** Theme selector shows wrong labels, or `data-theme` values don't match CSS blocks.

### Pitfall 2: CSS Custom Property Transitions Don't Animate by Default
**What goes wrong:** Adding `transition: --color-background 300ms` has no effect because CSS custom properties are not animatable by default.
**Why it happens:** CSS spec requires explicit `@property` registration with a syntax type for custom properties to be animatable.
**How to avoid:** Either (a) register each color property with `@property { syntax: '<color>'; inherits: true; }`, or (b) use a simpler approach like transitioning `background-color` and `color` on body/root elements, or (c) use a brief opacity crossfade.
**Warning signs:** Theme switches are instant with no animation.

### Pitfall 3: OKLch Gamut Clipping
**What goes wrong:** Choosing high chroma values that clip to sRGB gamut, producing unexpected colors on non-wide-gamut displays.
**Why it happens:** OKLch allows specifying colors outside sRGB gamut. Browsers clip to displayable range.
**How to avoid:** Keep chroma values moderate (0.10-0.20 for accents, 0.01-0.04 for backgrounds). Existing themes use max chroma ~0.22 (synthwave). Test in standard sRGB display mode.
**Warning signs:** Colors look different than expected, especially saturated accents losing vibrancy.

### Pitfall 4: Glass Surface Invisibility on Similar-Toned Themes
**What goes wrong:** Glass surfaces (rgba(255,255,255,0.03) background) become invisible when theme background is too light or too similar in tone.
**Why it happens:** The glass tokens use fixed white-based opacity, which works well on dark backgrounds but provides less contrast on lighter dark backgrounds.
**How to avoid:** Keep all theme backgrounds at oklch lightness 10-16% (existing themes range 10-16%). The glass tokens don't need per-theme overrides if backgrounds stay dark enough.
**Warning signs:** Glass cards look "flat" or indistinguishable from the background.

### Pitfall 5: Accent-on-Background Contrast Too Low
**What goes wrong:** Accent color on background fails WCAG AA for non-text elements (3:1 ratio).
**Why it happens:** When both background and accent have similar lightness, contrast drops below usable threshold.
**How to avoid:** Background lightness should be 10-16%, accent lightness 60-75%. This gives a natural 40-60% lightness gap. Check that accent-glow (at 20% opacity) is still perceptible.
**Warning signs:** Accent borders, glow rings, or badges are hard to see.

### Pitfall 6: Portfolio Hex Conversion Drift
**What goes wrong:** Converting Portfolio theme from hex to oklch changes its visual appearance.
**Why it happens:** Hex/sRGB to oklch conversion is not always pixel-perfect due to different color space geometries.
**How to avoid:** Use browser DevTools to convert each hex value to oklch. Compare rendered output side-by-side. The CONTEXT.md allows "subtle improvements" at Claude's discretion.
**Warning signs:** Portfolio theme looks noticeably different after conversion.

## Code Examples

### CSS Variable Count Per Theme (21 overrides)
```
Core (8):       --color-background, --color-surface, --color-surface-elevated, --color-border,
                --color-accent, --color-accent-glow, --color-text-primary, --color-text-secondary
Status (8):     --color-success, --color-success-muted, --color-error, --color-error-muted,
                --color-warning, --color-warning-muted, --color-info, --color-info-muted
Diff (4):       --color-diff-add, --color-diff-del, --color-diff-add-text, --color-diff-del-text
Glass (1):      --glass-glow
```
Note: `--glass-bg`, `--glass-border`, `--glass-blur` are NOT overridden per theme (shared in @theme block).

### OKLch Conversion Reference for Portfolio Theme
```css
/* Portfolio theme — hex values to convert */
--color-background: #0f172a;     /* → oklch(~15% ~0.03 ~260) */
--color-surface: #1e293b;        /* → oklch(~20% ~0.03 ~255) */
--color-surface-elevated: #334155; /* → oklch(~28% ~0.03 ~255) */
--color-border: #475569;          /* → oklch(~38% ~0.02 ~250) */
--color-accent: #f59e0b;          /* → oklch(~77% ~0.17 ~75) */
--color-text-primary: #f1f5f9;    /* → oklch(~96% ~0.005 ~240) */
--color-text-secondary: #94a3b8;  /* → oklch(~70% ~0.02 ~245) */
--color-success: #22c55e;         /* → oklch(~72% ~0.18 ~145) */
--color-error: #ef4444;           /* → oklch(~63% ~0.24 ~25) */
--color-warning: #f59e0b;         /* → oklch(~77% ~0.17 ~75) */
--color-info: #3b82f6;            /* → oklch(~60% ~0.19 ~260) */
--color-diff-add-text: #4ade80;   /* → oklch(~80% ~0.18 ~150) */
--color-diff-del-text: #f87171;   /* → oklch(~68% ~0.19 ~20) */
/* rgba values: convert base color to oklch, keep /alpha notation */
```

### OKLch Hue Guide for New Themes
```
Midnight Bloom:  bg hue ~300 (violet), accent hue ~330 (magenta-orchid)
Copper Forge:    bg hue ~50-60 (warm brown), accent hue ~55-70 (copper/orange)
Ocean Depth:     bg hue ~240-250 (navy), accent hue ~185-195 (aquamarine/teal)
Nebula Dust:     bg hue ~290-300 (space purple), accent hue ~15-25 (pink-coral)
Obsidian:        bg hue 0 chroma 0 (true neutral), accent hue 0 chroma 0 (silver/white)
Jade Temple:     bg hue ~155-165 (forest green), accent hue ~155-165 (jade/emerald)
```

### Mini Glass Preview Strip (CSS-only approach)
```tsx
{/* Inside ThemeCard, below color dots */}
<div
  className="mt-2 h-5 w-20 rounded-sm overflow-hidden relative"
  style={{ backgroundColor: theme.colors.bg }}
>
  {/* Simulated glass surface */}
  <div
    className="absolute inset-0.5 rounded-sm border"
    style={{
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderColor: 'rgba(255,255,255,0.08)',
    }}
  />
  {/* Accent glow line */}
  <div
    className="absolute bottom-0 left-1 right-1 h-px"
    style={{ backgroundColor: theme.colors.accent }}
  />
</div>
```

### Theme Crossfade (simplest reliable approach)
```css
/* Opacity crossfade on theme switch — universally compatible */
html {
  transition: background-color var(--duration-normal) var(--ease-smooth);
}

body, #root {
  transition:
    background-color var(--duration-normal) var(--ease-smooth),
    color var(--duration-normal) var(--ease-smooth);
}
```
**Alternative (full custom property animation):** Requires registering each CSS variable with `@property`. More comprehensive but verbose — ~21 `@property` declarations. Tailwind v4 may already handle some of this.

### NEW Badge on Theme Cards
```tsx
import { GlassBadge } from '@renderer/components/ui'

{theme.section === 'new' && (
  <GlassBadge variant="accent" className="absolute top-2 right-2 text-[10px]">
    NEW
  </GlassBadge>
)}
```
Note: This replaces the Check icon position for non-active new themes. Active new themes show Check; inactive new themes show NEW badge.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hex/RGB color values | OKLch notation | CSS Color Level 4 (2023+) | Perceptually uniform lightness control, better for systematic theme design |
| `prefers-color-scheme` media query | `data-theme` attribute selector | N/A (project decision) | Multiple theme support beyond light/dark binary |
| JavaScript-driven theme switching | CSS custom property overrides | N/A (project pattern) | Zero JS needed for color application; only JS sets the attribute |

**Deprecated/outdated:**
- HSL for theme design: OKLch is strictly superior for perceptual uniformity. HSL lightness is misleading (blue at 50% looks much darker than yellow at 50%).

## Open Questions

1. **@property registration for CSS transitions**
   - What we know: CSS custom properties need `@property` registration to be animatable with `transition`. Without it, transitions snap instantly.
   - What's unclear: Whether Tailwind v4's `@theme` block auto-generates `@property` registrations. If it does, transitions may work without manual registration.
   - Recommendation: Try the simple `transition: background-color, color` approach first. If the user wants full variable interpolation, investigate `@property` or use a brief opacity crossfade on `#root` as fallback.

2. **Glass token rgba vs oklch**
   - What we know: `--glass-bg: rgba(255,255,255,0.03)` and `--glass-border: rgba(255,255,255,0.08)` in `@theme` are shared across all themes and use rgba.
   - What's unclear: Whether converting these to oklch notation (e.g., `oklch(100% 0 0 / 0.03)`) would cause any rendering differences.
   - Recommendation: Convert to oklch for consistency. `oklch(100% 0 0 / 0.03)` is equivalent to `rgba(255,255,255,0.03)`.

## Existing Code Inventory

### Files to Modify
| File | Current State | Changes Needed |
|------|--------------|----------------|
| `src/renderer/src/assets/main.css` | 12 themes (1 hex, 11 oklch), @theme block | Add 6 new theme blocks, convert Portfolio hex→oklch, convert glass rgba→oklch |
| `src/renderer/src/lib/theme-metadata.ts` | 12 classic (complete) + 6 new (empty placeholders with wrong names) | Replace 6 placeholder entries with correct names/values |
| `src/renderer/src/components/settings/GeneralSettings.tsx` | ThemeCard with name + dots + check icon | Add mini glass preview strip, NEW badge, theme crossfade transition |

### Key Observations
1. **Only 1 theme needs hex conversion**: Portfolio is the only classic theme still using hex. Nord, Rose Pine, Dracula, Gruvbox, Tokyo Night, Synthwave, Catppuccin, Emerald, Solarized, Crimson — all already use oklch.
2. **Placeholder names are wrong**: Current placeholders (aurora, midnight, sakura, ocean, copper, monochrome) don't match decided names (midnight-bloom, copper-forge, ocean-depth, nebula-dust, obsidian, jade-temple).
3. **ThemeCard filters empty themes**: `getNewThemes().filter((t) => t.colors.bg !== '')` hides placeholders — so new themes become visible as soon as colors are populated.
4. **Default theme uses @theme block**: No `[data-theme]` selector for default — it's the `@theme` block itself. The `data-theme` attribute is removed for default theme.
5. **Glass glow is accent-derived**: `--glass-glow` per theme is always `0 0 0 2px <accent-color> / 0.2`. This pattern must be maintained for new themes.
6. **Status colors mostly shared**: Most themes reuse the same success/error/warning/info oklch values. Some themes customize error (e.g., synthwave uses the accent for error). New themes can follow the shared pattern unless a specific status color clashes with the theme palette.

## Sources

### Primary (HIGH confidence)
- `src/renderer/src/assets/main.css` — Complete theme CSS architecture, all 12 existing theme blocks
- `src/renderer/src/lib/theme-metadata.ts` — Theme metadata structure, placeholder entries
- `src/renderer/src/components/settings/GeneralSettings.tsx` — Current ThemeCard and selector grid
- `src/renderer/src/App.tsx` — Theme application via `data-theme` attribute
- `.planning/phases/05-theme-collection/05-CONTEXT.md` — User decisions on all 6 themes

### Secondary (MEDIUM confidence)
- OKLch color space behavior: based on CSS Color Level 4 spec knowledge and existing theme patterns in codebase
- CSS `@property` for custom property animation: CSS Houdini spec, browser support is broad but behavior with Tailwind v4 `@theme` is uncertain

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; entire phase uses existing CSS custom property architecture
- Architecture: HIGH - Pattern is clearly established by 12 existing themes; just replicating it 6 more times
- Pitfalls: HIGH - Identified from direct codebase analysis (placeholder name mismatch, hex conversion scope, CSS transition limitation)

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable — CSS/theme work, no fast-moving dependencies)
