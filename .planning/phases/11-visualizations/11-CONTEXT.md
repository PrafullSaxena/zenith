# Phase 11: Visualizations - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

EstimationSummary and ComparisonView display rich Recharts charts that make cost distribution and provider comparisons immediately scannable. History tab shows a trend line of saved estimations over time. All charts render correctly in dark mode using CSS custom properties.

</domain>

<decisions>
## Implementation Decisions

### Chart layout & density
- EstimationSummary: treemap and donut chart side-by-side — treemap ~60% width, donut ~40%
- Chart area height: ~350px (medium — prominent but not dominating)
- ComparisonView: horizontal bar chart (service names as Y-axis labels, bars extending right)
- Cheapest provider bar highlighted green
- No separate legends — use inline labels on chart elements + tooltips for detail
- Each chart type lives in its own component for reusability

### Color mapping strategy
- Use theme CSS variables (--chart-1 through --chart-5) for service category colors
- When categories exceed 5: cycle the same colors with opacity variation (100%, 70%, 50%)
- Provider colors are consistent and match brand identity:
  - AWS = orange (#FF9900)
  - Azure = blue (#0078D4)
  - GCP = blue (#4285F4) or multicolor
  - Other providers: assign from theme chart variables
- Cheapest provider highlight: solid green (--success variable) with subtle glow
- All colors via CSS custom properties — no hardcoded hex values in chart components

### Tooltip & hover behavior
- Compact dark card tooltip: service name, cost ($XX.XX), percentage of total
- Tooltip appears near cursor, matches app's dark glass aesthetic
- Subtle cross-highlighting between treemap and donut: hovering a category in one dims/highlights the matching segment in the other
- Hover animation: subtle brightness increase + pointer cursor on interactive elements
- Charts are hover-only — no click actions in Phase 11

### History trend design
- X-axis: date/time when estimation was saved (real timeline, gaps visible)
- Y-axis: multi-line chart — one colored line per provider showing cost over time
- Provider lines use the same brand colors as ComparisonView bars
- Data density: scrollable X-axis showing last 10-15 estimations by default, pan left for older
- Data points: visible dots at each estimation, hover shows estimation name + per-service cost breakdown
- Dots are hover-only — no click navigation

### Claude's Discretion
- Exact Recharts component configuration and props
- Animation/transition durations
- Responsive breakpoint behavior (if charts need to stack on narrow viewports)
- Empty state design when no estimations exist yet
- Loading skeleton for chart areas
- Exact tooltip positioning logic

</decisions>

<specifics>
## Specific Ideas

- Cross-highlighting between treemap and donut should be subtle (dim non-matching, not hide)
- Provider brand colors should feel native to the dark theme — may need slight desaturation to avoid jarring contrast
- History trend with multi-line should still be readable when 3+ providers overlap — consider slight line thickness variation or dash patterns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-visualizations*
*Context gathered: 2026-03-31*
