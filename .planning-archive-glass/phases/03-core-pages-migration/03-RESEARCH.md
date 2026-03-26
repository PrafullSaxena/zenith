# Phase 3: Core Pages Migration - Research

**Researched:** 2026-03-25
**Domain:** React component migration — replacing inline Tailwind with glass component library
**Confidence:** HIGH

## Summary

Phase 3 migrates 5 targets (Dashboard/MissionControl, Activity Log, About View, Settings, Sidebar) from raw Tailwind markup to the Phase 2 glass component library. The work is straightforward component replacement — every glass component is already built, exported from `@renderer/components/ui`, and tested in Phase 2. The main complexity lies in (1) the dashboard stat cards needing AnimatedCounter relocated from Cortex, (2) the sidebar active bar needing framer-motion `layoutId` animation instead of the current CSS-only approach, (3) page transitions moving from CSS `animate-page-enter` to framer-motion `AnimatePresence` + `pageTransition` variants, and (4) the Settings theme selector needing new grid UI that doesn't exist yet (the current theme selector is a plain `<select>` dropdown).

The AnimatedCounter component already exists in `src/renderer/src/plugins/cortex/components/AnimatedCounter.tsx` and uses framer-motion's `animate`, `useMotionValue`, and `useTransform`. It needs to be relocated to a shared location (e.g., `components/ui/` or `lib/`) so the dashboard can import it without coupling to Cortex.

**Primary recommendation:** Migrate page-by-page (Dashboard first as the highest-impact target), using `staggerContainer`/`staggerItem` from `lib/motion.ts` for all card grids, and relocate AnimatedCounter to shared `components/ui/` before starting dashboard work.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Dashboard Stats Cards**: GlassCard default variant for each of the 4 stat cards (Token Usage, Connections, Today's Ops, Health). Numbers animate from 0 to value using AnimatedCounter (reuse from Cortex).
- **Dashboard Hero**: Wrap greeting area in GlassSurface. Keep existing layout.
- **Dashboard Plugin Cards**: GlassCard interactive variant with staggered fade-in using shared staggerContainer/staggerItem from lib/motion.ts.
- **Dashboard Activity Feed**: Each entry becomes a subtle GlassCard with left accent bar colored by plugin theme color. Stagger entrance.
- **Dashboard TokenChart + HealthPanel**: Wrap in GlassCard default. Keep chart internals unchanged.
- **Settings Theme Grid**: 3-column CSS grid. Card shows theme name + 4 color dots. Sections: "Classic Themes" (12) and "New Collection" (6). Active = accent border glow + check icon. Click applies instantly.
- **Settings Other Sections**: GlassCard for section groups. GlassInput/GlassSelect for form elements. GlassTab for settings sidebar navigation.
- **Sidebar Background**: Keep opaque/solid dark. No glass treatment.
- **Sidebar Icon Hover**: scale(1.08) + accent glow ring (box-shadow with accent at 20% opacity). 150ms transition.
- **Sidebar Active Indicator**: Left accent bar slides vertically to active icon position with spring animation (~300ms). Uses framer-motion layoutId or animating top/height.
- **Sidebar Tooltips**: 400ms delay before appearing. Fade in with translateX(4px). Glass-styled (GlassSurface-like background).
- **Sidebar Drag Reorder**: Keep existing framer-motion drag behavior unchanged.
- **Activity Log Toolbar**: GlassSurface for filter bar. GlassSelect for plugin and status filters.
- **Activity Log Entries**: GlassCard per entry with left accent bar by plugin. GlassBadge for status (success, failure, pending).
- **Activity Log Entrance**: Stagger animation on list.
- **About Capability Cards**: GlassCard interactive with stagger entrance for the 6 items.
- **About Getting Started**: Glass timeline with numbered step indicators.
- **About Author**: GlassCard with social link GlassButtons.

### Claude's Discretion
- Exact page transition animation between core pages
- How to handle empty state for Activity Log (use EmptyState component)
- Whether TokenChart and HealthPanel internals need glass sub-styling or just outer wrapper
- About view layout refinements beyond glass card wrapping
- How Settings sidebar navigation maps to GlassTab (vertical vs horizontal orientation)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-01 | Mission Control Dashboard migrated -- GlassCards for stats, staggered entrance, AnimatedCounter reuse | AnimatedCounter exists at `plugins/cortex/components/AnimatedCounter.tsx`, needs relocation. GlassCard default/interactive variants ready. staggerContainer/staggerItem in lib/motion.ts. QuickStat/PluginCard/ActivityFeed all identified for replacement. |
| CORE-02 | Activity Log migrated -- GlassCard entries, GlassSurface toolbar, GlassBadge status | ActivityLog uses plain `<select>` and `<div>` wrappers. Replace with GlassSelect, GlassSurface, GlassCard, GlassBadge. StatusBadge component replaced by GlassBadge with variant mapping (success/error/warning). EmptyState for no-results. |
| CORE-03 | About View migrated -- GlassCards for capabilities, stagger entrance, glass timeline | AboutView has 4 sections (header, capabilities grid, author, getting started). Replace div cards with GlassCard interactive. Social buttons become GlassButton. Getting-started items become GlassCards with step indicators. |
| CORE-04 | Settings migrated -- GlassTab sidebar, theme grid selector, GlassCard sections | SettingsLayout sidebar uses plain buttons with border-l-2. Replace with GlassTab (vertical orientation). SettingsField form elements switch to GlassInput/GlassSelect. Theme selector grid is NEW UI (current is a `<select>` dropdown). |
| CORE-05 | Sidebar upgraded -- hover scale + glow ring, active bar slide animation, tooltip delay + fade | Sidebar SidebarIcon has basic CSS transitions. Upgrade to framer-motion for active bar sliding (layoutId). Add scale(1.08) + glow ring on hover. Tooltip needs 400ms delay + translateX entrance. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.x | UI framework | Already installed, project standard |
| framer-motion | 12.x | Animation (stagger, layout, page transitions) | Already installed, used throughout Phase 1-2 |
| react-router-dom | 7.x | Routing (AnimatePresence on route change) | Already installed, handles all app routing |
| lucide-react | latest | Icons | Already installed, project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @renderer/components/ui/* | Phase 2 | Glass components (GlassCard, GlassSurface, GlassButton, etc.) | Every visual replacement in this phase |
| @renderer/lib/motion | Phase 1 | staggerContainer, staggerItem, pageTransition, hoverLift variants | All stagger animations, page transitions |

### Alternatives Considered
None -- this phase uses only existing libraries with no new dependencies (per out-of-scope constraint: "No new npm dependencies").

## Architecture Patterns

### Recommended Migration Order
```
1. Relocate AnimatedCounter to shared ui/ (unblocks Dashboard)
2. Dashboard (MissionControl) — highest visual impact
3. Sidebar — touches AppLayout, affects all pages
4. Activity Log — straightforward replacement
5. About View — straightforward replacement
6. Settings (SettingsLayout + GeneralSettings) — most new UI (theme grid)
7. Page transitions in AppLayout — affects all routes
```

### Pattern 1: Glass Card Replacement
**What:** Replace inline Tailwind card markup with GlassCard component
**When to use:** Every card, panel, or elevated surface in all 5 targets

Current pattern (QuickStat in MissionControl):
```typescript
<div className="hover-lift group relative flex items-center gap-3 rounded-xl border border-border/60 bg-surface-elevated/60 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:border-border hover:bg-surface-elevated">
```

Target pattern:
```typescript
<GlassCard className="flex items-center gap-3 px-4 py-3">
```

For interactive cards (plugin cards, capability cards):
```typescript
<GlassCard variant="interactive" className="flex flex-col p-4">
```

### Pattern 2: Stagger Container with framer-motion
**What:** Replace CSS `.stagger-children` class with framer-motion variants for more control
**When to use:** All card grids and list entrances

```typescript
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'

<motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3">
  {items.map((item) => (
    <motion.div key={item.id} variants={staggerItem}>
      <GlassCard>{/* content */}</GlassCard>
    </motion.div>
  ))}
</motion.div>
```

### Pattern 3: Page Transitions with AnimatePresence
**What:** Replace CSS `animate-page-enter` with framer-motion `AnimatePresence` for exit animations
**When to use:** AppLayout route wrapper

Current (AppLayout.tsx):
```typescript
<div key={location.pathname} className="animate-page-enter h-full">
  <Outlet />
</div>
```

Target:
```typescript
import { AnimatePresence, motion } from 'framer-motion'
import { pageTransition } from '@renderer/lib/motion'

<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    variants={pageTransition}
    initial="initial"
    animate="animate"
    exit="exit"
    className="h-full"
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

### Pattern 4: Sidebar Active Bar with layoutId
**What:** Replace CSS transition on active indicator with framer-motion layoutId for spring animation
**When to use:** Sidebar SidebarIcon active indicator

```typescript
{isActive && (
  <motion.div
    layoutId="sidebarActiveBar"
    className="absolute left-0 h-6 w-[3px] rounded-r bg-accent"
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
  />
)}
```

### Pattern 5: GlassTab for Settings Sidebar (Vertical Orientation)
**What:** Use GlassTab component for settings category navigation
**When to use:** SettingsLayout sidebar

The existing GlassTab is horizontal with flex-row layout. For settings, it needs a vertical orientation. Options:
1. Add an `orientation="vertical"` prop to GlassTab (preferred -- keeps component reusable)
2. Override with className (fragile, fights internal layout)

Recommendation: Add `orientation` prop to GlassTab that switches from `flex` row to `flex-col` and adjusts the active underline to be a left bar instead of bottom bar.

### Pattern 6: Theme Selector Grid (New UI)
**What:** Replace the `<select>` dropdown theme picker with a visual grid of theme cards
**When to use:** GeneralSettings theme section

This is the only net-new UI in the phase. Structure:
```typescript
<div className="space-y-4">
  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Classic Themes</p>
  <div className="grid grid-cols-3 gap-3">
    {classicThemes.map((theme) => (
      <GlassCard
        key={theme.value}
        variant={currentTheme === theme.value ? 'selected' : 'interactive'}
        onClick={() => setTheme(theme.value)}
        className={currentTheme === theme.value ? 'border-accent shadow-[0_0_8px_var(--color-accent-glow)]' : ''}
      >
        <span className="text-sm font-medium">{theme.label}</span>
        <div className="mt-2 flex gap-1.5">
          {theme.colorDots.map((color, i) => (
            <span key={i} className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </div>
        {currentTheme === theme.value && <Check size={14} className="absolute top-2 right-2 text-accent" />}
      </GlassCard>
    ))}
  </div>
</div>
```

Theme color dots data must be extracted from existing CSS theme definitions (each theme defines --color-bg, --color-surface, --color-accent, --color-text).

### Anti-Patterns to Avoid
- **Mixing old and new card styles:** Don't leave some cards as inline Tailwind while others use GlassCard on the same page. Migrate completely per page.
- **Breaking existing layout:** GlassCard adds `p-4 rounded-2xl` by default. Pass `className` overrides carefully to avoid double-padding.
- **Importing AnimatedCounter from Cortex:** After relocation, ALL imports must use the shared path, never the old Cortex path.
- **Using CSS stagger-children alongside framer-motion stagger:** Pick one per component. For new code, always use framer-motion staggerContainer/staggerItem.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card glass styling | Inline Tailwind with bg-surface-elevated/60 backdrop-blur-sm border-border/60 | `GlassCard` from ui/ | Consistent tokens, theme-reactive, variant system |
| Toolbar/surface backgrounds | Inline bg-surface-elevated with border | `GlassSurface` from ui/ | Two-tier blur system compliance |
| Status indicators | Custom StatusBadge with inline color maps | `GlassBadge` with variant (success/error/warning) | Consistent semantics, theme-reactive |
| Select dropdowns | Native `<select>` with custom CSS | `GlassSelect` from ui/ | Glass-styled dropdown, keyboard nav, animation |
| Form inputs | Custom inputClass CSS string | `GlassInput` from ui/ | Focus glow, error state, label integration |
| Stagger animations | CSS .stagger-children with nth-child delays | framer-motion staggerContainer/staggerItem | Reduced-motion support, exit animations, runtime control |
| Page transitions | CSS @keyframes animate-page-enter | framer-motion AnimatePresence + pageTransition | Exit animations, route-key-driven |
| Number animation | Custom setInterval counter | AnimatedCounter (relocated from Cortex) | Reduced-motion support, easing, framer-motion integration |

**Key insight:** Phase 2 built every component needed. This phase is purely assembly -- the value is in consistent, complete application, not invention.

## Common Pitfalls

### Pitfall 1: GlassCard Default Padding Conflicts
**What goes wrong:** GlassCard applies `p-4 rounded-2xl` by default. Wrapping existing cards that already have padding creates double padding.
**Why it happens:** The existing code often has `p-4` or `p-5` on the outer container.
**How to avoid:** When replacing, either (a) remove padding from inner content that's now covered by GlassCard's default, or (b) override via `className="p-0"` on GlassCard and keep inner padding. Option (a) is cleaner.
**Warning signs:** Visual testing shows cards with too much inner spacing.

### Pitfall 2: AnimatePresence Requires Single Child
**What goes wrong:** `AnimatePresence` for page transitions doesn't work if `Outlet` renders a fragment or the key doesn't change.
**Why it happens:** react-router v7's `Outlet` renders the matched component directly; the key must be on the wrapping `motion.div`, not on Outlet.
**How to avoid:** Wrap Outlet in `<motion.div key={location.pathname}>` inside AnimatePresence. Use `mode="wait"` so exit finishes before enter.
**Warning signs:** No exit animation, or both pages visible simultaneously.

### Pitfall 3: layoutId Scope for Sidebar Active Bar
**What goes wrong:** The sidebar uses `Reorder.Group` which creates its own AnimatePresence context. A `layoutId` inside NavLink's render prop may not animate across siblings correctly.
**Why it happens:** layoutId animations require elements to be in the same LayoutGroup context.
**How to avoid:** Wrap the entire sidebar nav in `<LayoutGroup>` from framer-motion. Ensure the active bar's layoutId is unique to the sidebar (e.g., "sidebarActiveBar") to avoid conflicts with GlassTab's "activeTab" layoutId.
**Warning signs:** Active bar jumps instead of sliding, or doesn't appear.

### Pitfall 4: Theme Grid Color Dot Data
**What goes wrong:** Building the theme selector grid but not having color values to show in the 4-dot preview.
**Why it happens:** Theme colors are currently defined only in CSS (main.css `[data-theme]` blocks). There's no JS-accessible theme metadata.
**How to avoid:** Create a `THEME_METADATA` constant (or small module) that pairs each theme value with its 4 key colors (bg, surface, accent, text) for the grid card dots. This can be hardcoded since themes are static. Phase 5 will add 6 new themes, so structure the data to be easily extendable.
**Warning signs:** Color dots are hardcoded per-theme without a data structure.

### Pitfall 5: Settings GlassTab Vertical vs Horizontal
**What goes wrong:** GlassTab renders horizontally with bottom underline. Settings sidebar needs vertical layout with left accent bar.
**Why it happens:** GlassTab was built for horizontal tab bars (Phase 2 scope).
**How to avoid:** Either add an `orientation` prop to GlassTab, or keep the current custom sidebar buttons and style them with glass tokens. The CONTEXT says "GlassTab for settings navigation sidebar" but the GlassTab component renders horizontal with `flex gap-1`. Extending it is cleaner than hacking className overrides.
**Warning signs:** Settings sidebar looks broken or misaligned after using GlassTab.

### Pitfall 6: Stagger Animation on Dynamic Lists
**What goes wrong:** Stagger animation replays every time the activity list re-renders (e.g., filter change).
**Why it happens:** The staggerContainer's `initial="hidden" animate="visible"` runs on every mount/key change.
**How to avoid:** Use a key that changes only on page mount (not on filter change). Or use `initial={false}` on subsequent renders by tracking if the component has already mounted.
**Warning signs:** Cards flicker/re-animate when user changes filter dropdown.

## Code Examples

### AnimatedCounter Relocation
Move from `src/renderer/src/plugins/cortex/components/AnimatedCounter.tsx` to `src/renderer/src/components/ui/AnimatedCounter.tsx`. Update the import path for `usePrefersReducedMotion`:

```typescript
// New location: src/renderer/src/components/ui/AnimatedCounter.tsx
import { usePrefersReducedMotion } from '@renderer/lib/useReducedMotion'
// (The cortex useReducedMotion.ts already re-exports from this path)
```

Leave a re-export at the old location for backward compatibility:
```typescript
// src/renderer/src/plugins/cortex/components/AnimatedCounter.tsx
export { default } from '@renderer/components/ui/AnimatedCounter'
```

Export from barrel:
```typescript
// Add to src/renderer/src/components/ui/index.ts
export { default as AnimatedCounter } from './AnimatedCounter'
```

### Dashboard QuickStat with GlassCard + AnimatedCounter
```typescript
import { GlassCard } from '@renderer/components/ui'
import AnimatedCounter from '@renderer/components/ui/AnimatedCounter'

function QuickStat({ icon: Icon, label, value, accent }) {
  return (
    <GlassCard className="flex items-center gap-3 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary/70">{label}</p>
        <AnimatedCounter value={typeof value === 'number' ? value : 0} className="text-lg font-semibold leading-tight text-text-primary" />
      </div>
    </GlassCard>
  )
}
```

### Activity Log Entry with GlassCard + GlassBadge
```typescript
import { GlassCard, GlassBadge } from '@renderer/components/ui'

const STATUS_TO_BADGE: Record<ActivityStatus, GlassBadgeVariant> = {
  success: 'success',
  failure: 'error',
  pending: 'warning'
}

// Inside map:
<motion.div variants={staggerItem}>
  <GlassCard className="flex items-center gap-3 px-4 py-2.5">
    <div className="h-full w-[3px] rounded-full" style={{ backgroundColor: pluginColor }} />
    {/* ... entry content ... */}
    <GlassBadge variant={STATUS_TO_BADGE[entry.status]}>{entry.status}</GlassBadge>
  </GlassCard>
</motion.div>
```

### Sidebar Active Bar with layoutId
```typescript
import { motion, LayoutGroup } from 'framer-motion'

// Wrap nav content in LayoutGroup
<LayoutGroup>
  <nav className="flex flex-1 flex-col items-center gap-2 pt-1">
    <SidebarIcon ... />
    ...
  </nav>
</LayoutGroup>

// Inside SidebarIcon:
{isActive && (
  <motion.div
    layoutId="sidebarActiveBar"
    className="absolute left-0 h-6 w-[3px] rounded-r bg-accent"
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
  />
)}
// Replace the existing CSS-transition div
```

### Tooltip with Delay and Slide
```typescript
// Replace the static tooltip span with:
<span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] px-2.5 py-1 text-xs text-text-primary opacity-0 shadow-lg backdrop-blur-sm transition-all duration-150 delay-[400ms] translate-x-0 group-hover:opacity-100 group-hover:translate-x-1">
  {label}
</span>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS `.stagger-children` nth-child | framer-motion staggerContainer/staggerItem variants | Phase 1 (FOUND-02) | Runtime control, reduced-motion, exit animations |
| CSS `animate-page-enter` keyframes | framer-motion AnimatePresence + pageTransition | Phase 1 (FOUND-02) | Exit animations on route change |
| Inline Tailwind glass patterns | GlassCard/GlassSurface/GlassBadge components | Phase 2 (COMP-01..11) | Theme-reactive, consistent, reduced duplication |
| `<select>` for theme picker | Visual grid with color dot previews | This phase (CORE-04) | Richer UX for theme exploration |

**Deprecated/outdated:**
- `hover-lift` CSS class: replaced by GlassCard interactive variant's built-in hoverLift
- `StatusBadge` component in dashboard/: replaced by GlassBadge with variant mapping
- `.stagger-children` CSS class: still usable but framer-motion approach preferred for new code

## Open Questions

1. **GlassTab Vertical Orientation**
   - What we know: GlassTab is currently horizontal-only with bottom underline active indicator
   - What's unclear: Whether to extend GlassTab with orientation prop or keep custom sidebar buttons styled with glass tokens
   - Recommendation: Add `orientation?: 'horizontal' | 'vertical'` prop to GlassTab. When vertical, switch to flex-col layout and left-bar active indicator instead of bottom underline. This is a small extension that benefits future vertical tab use cases.

2. **Theme Color Dot Data Source**
   - What we know: Themes are CSS-only (`[data-theme="..."]` in main.css). No JS metadata exists.
   - What's unclear: Whether to parse CSS at build time or maintain a parallel JS constant
   - Recommendation: Create a `THEME_METADATA` array in a new file (e.g., `lib/theme-metadata.ts`) with `{ value, label, section, colors: { bg, surface, accent, text } }` for each of the 12 classic themes. Leave placeholder structure for 6 new themes (Phase 5). Hardcode the hex values since they're static design tokens.

3. **TokenChart/HealthPanel Wrapping Depth**
   - What we know: Decision says "Wrap in GlassCard default. Keep chart internals unchanged."
   - What's unclear: These components already render their own outer `div` with `rounded-xl border border-border/60 bg-surface-elevated/70 p-5`. Wrapping in GlassCard would double-wrap.
   - Recommendation: Replace the component's own outer div styling with GlassCard, rather than wrapping externally. This means editing TokenChart.tsx and HealthPanel.tsx to use `<GlassCard className="flex h-full flex-col p-5">` as their root element.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All 11 glass components read from `src/renderer/src/components/ui/`
- Codebase analysis: All 5 migration target files read and analyzed
- Codebase analysis: motion.ts variants confirmed (staggerContainer, staggerItem, pageTransition)
- Codebase analysis: AnimatedCounter.tsx confirmed at Cortex location, uses framer-motion animate/useMotionValue
- Codebase analysis: AppLayout.tsx uses CSS animate-page-enter (line 19)
- Codebase analysis: SettingsLayout.tsx uses CSS animate-tab-enter (line 103)
- Codebase analysis: GlassTab uses layoutId="activeTab" for horizontal sliding underline

### Secondary (MEDIUM confidence)
- framer-motion LayoutGroup for cross-component layoutId animation (based on framer-motion docs pattern)
- AnimatePresence mode="wait" for sequential page transitions (standard framer-motion pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed, no new dependencies
- Architecture: HIGH - all components and patterns exist, this is assembly work
- Pitfalls: HIGH - identified from direct codebase reading (padding conflicts, layoutId scope, theme data gap)

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable -- no external dependencies, all internal code)
