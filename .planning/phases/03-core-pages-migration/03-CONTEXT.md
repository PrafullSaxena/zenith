# Phase 3: Core Pages Migration - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the 4 core app pages (Dashboard/Mission Control, Activity Log, About, Settings) and the Sidebar to use glass components from Phase 2. This is the first time users see the Obsidian Glass design system applied to actual screens. No plugin pages are touched here — that's Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Dashboard (Mission Control)
- **Stats cards**: GlassCard default variant for each of the 4 stat cards (Token Usage, Connections, Today's Ops, Health). Numbers animate from 0 to value using AnimatedCounter (reuse from Cortex).
- **Hero section**: Wrap the "Good morning" greeting area in a GlassSurface. Keep existing layout (greeting, date, stats grid inside).
- **Plugin overview cards**: GlassCard interactive variant with staggered fade-in entrance animation on page load using shared staggerContainer/staggerItem variants from lib/motion.ts.
- **Activity feed**: Each activity entry becomes a subtle GlassCard with left accent bar colored by the plugin's theme color. Stagger entrance animation.
- **Token chart + Health panel**: Wrap in GlassCard default. Keep chart internals unchanged.

### Settings — Theme Selector Grid
- **Layout**: 3-column CSS grid.
- **Card content**: Theme name + row of 4 color dots (background, surface, accent, text colors).
- **Sections**: Simple text dividers — "Classic Themes" above the existing 12, "New Collection" above the 6 new ones.
- **Active theme indicator**: Accent border glow (border transitions to accent color + subtle glow shadow) with a small check icon in the corner.
- **Click behavior**: Click instantly applies the theme (existing behavior preserved).
- **Other settings sections**: GlassCard for each section group (AI Agents, MCP, Plugin settings). GlassInput/GlassSelect for form elements. GlassTab for settings navigation sidebar.

### Sidebar
- **Background**: Keep opaque/solid dark. Sidebar is chrome, not content — no glass treatment.
- **Icon hover**: scale(1.08) + accent glow ring (box-shadow with accent at 20% opacity). 150ms smooth transition.
- **Active indicator**: Left accent bar slides vertically to active icon position with spring animation (~300ms). Uses framer-motion layoutId or animating top/height.
- **Tooltips**: 400ms delay before appearing. Fade in with translateX(4px) from left. Glass-styled (GlassSurface-like background).
- **Drag reorder**: Keep existing framer-motion drag behavior unchanged.

### Activity Log
- **Toolbar**: GlassSurface for the filter bar (plugin filter, status filter, activity count, clear button).
- **Filter dropdowns**: Use GlassSelect for plugin and status filters.
- **Activity entries**: GlassCard for each entry with left accent bar colored by plugin. GlassBadge for status indicators (success, failure, pending).
- **Entrance**: Stagger animation on the activity list.

### About View
- **Capability cards**: GlassCard interactive with stagger entrance for the 6 capability items.
- **Getting started**: Glass timeline with numbered step indicators.
- **Author section**: GlassCard with social link GlassButtons.

### Claude's Discretion
- Exact page transition animation between core pages
- How to handle the empty state for Activity Log when no activities exist (use EmptyState component)
- Whether TokenChart and HealthPanel internals need glass sub-styling or just outer wrapper
- About view layout refinements beyond glass card wrapping
- How Settings sidebar navigation maps to GlassTab (vertical vs horizontal orientation)

</decisions>

<specifics>
## Specific Ideas

- The dashboard should feel noticeably upgraded from current flat look — the glass cards + animated counters + stagger entrance should create a "wow" moment
- Settings theme grid is the most user-facing new UI element in this phase — it should look polished since users will interact with it to explore the new themes (Phase 5)
- Sidebar should feel responsive but not distracting — the glow ring and sliding bar should be subtle enough to not pull attention from content

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-core-pages-migration*
*Context gathered: 2026-03-25*
