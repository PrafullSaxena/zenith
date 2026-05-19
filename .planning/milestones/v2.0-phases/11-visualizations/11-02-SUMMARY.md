---
phase: 11-visualizations
plan: 02
subsystem: ui
tags: [recharts, bar-chart, line-chart, visualization, launchpad, cost-comparison, estimation-history]

# Dependency graph
requires:
  - phase: 11-01-visualizations
    provides: chart-utils.ts with PROVIDER_COLORS, TOOLTIP_CLASSES, getCategoryColor; recharts installed
  - phase: 10-service-catalog
    provides: ComparisonView rows computation, EstimationEntry type, equivalences

provides:
  - ComparisonBarChart: horizontal grouped BarChart with aws/gcp/azure bars per service; cheapest bar green-highlighted
  - HistoryTrendLine: multi-line LineChart plotting totalMonthly over time per provider with Show all toggle
  - ComparisonView updated with bar chart section above existing provider detail cards
  - EstimationHistory updated with trend chart in glass card above the card list

affects: [12-advanced-visualizations, any plan touching ComparisonView or EstimationHistory]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cheapest-bar highlight: Cell per bar mapped from cheapestByService Map; green fill + drop-shadow for cheapest, muted brand color for others"
    - "Multi-line trend: separate Line per provider present in data; connectNulls=false so gaps show instead of interpolating"
    - "Show all toggle: slice(-15) default, useState showAll expands to full dataset"
    - "Tooltip with metadata: _aws/_gcp/_azure keys carry estimation name + services alongside numeric data key"

key-files:
  created:
    - src/renderer/src/plugins/launchpad/charts/ComparisonBarChart.tsx
    - src/renderer/src/plugins/launchpad/charts/HistoryTrendLine.tsx
  modified:
    - src/renderer/src/plugins/launchpad/ComparisonView.tsx
    - src/renderer/src/plugins/launchpad/EstimationHistory.tsx

key-decisions:
  - "Cell-per-bar cheapest highlight: cheapestByService Map built from useMemo; each Cell checks Map lookup to assign green or muted brand color"
  - "Muted brand colors for non-cheapest bars (#B8721A/#3A6DB5/#1A6BA0) keep dark-theme contrast without washing out the green winner"
  - "isAnimationActive={false} on all chart components — consistent with phase-11-01 pattern, prevents layout jank"
  - "HistoryTrendLine sidebar legend rendered as inline color swatch + label below chart — no recharts Legend component needed"
  - "Tooltip metadata stored as _aws/_gcp/_azure keys alongside numeric data keys so CustomTooltip can access estimation name + services without separate lookups"
  - "connectNulls=false on trend lines — gaps are informative (no data for that provider at that time)"

patterns-established:
  - "Bar cheapest highlight: build cheapestByService Map in useMemo, use Cell per bar to assign green vs muted fill"
  - "Multi-provider merge: toChartData() merges entries by timestamp into single data array with per-provider keys for Recharts multi-line"

requirements-completed: [VIZ-04, VIZ-05, VIZ-06]

# Metrics
duration: 10min
completed: 2026-03-31
---

# Phase 11 Plan 02: ComparisonBarChart + HistoryTrendLine Summary

**Recharts horizontal grouped BarChart for provider cost comparison with green cheapest-bar highlight, and multi-line LineChart trend for estimation history with show-all toggle and per-provider dash patterns**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-31T00:00:00Z
- **Completed:** 2026-03-31T00:10:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- ComparisonBarChart.tsx: Recharts BarChart layout="vertical" with three bars per service row; cheapest bar highlighted green (hsl(142 76% 36%) + drop-shadow); non-cheapest bars use muted brand colors for dark-theme readability; custom tooltip with provider dots and N/A for nulls
- HistoryTrendLine.tsx: Recharts LineChart plotting totalMonthly vs savedAt timestamp; one Line per provider with PROVIDER_COLORS; AWS solid 2.5px, GCP dashed 2px, Azure dotted 1.5px for overlap readability; last-15 default with Show all toggle; empty guard for <2 entries
- ComparisonView: bar chart section with "Cost Comparison" heading and overflow-auto max-h-[400px] wrapper added above existing provider detail cards; both chart and cards coexist
- EstimationHistory: trend chart in rounded glass card (border-white/5, bg-black/20, backdrop-blur) above animated card list; existing load/delete functionality unchanged

## Task Commits

1. **Task 1: ComparisonBarChart + wire into ComparisonView** - `18b323f` (feat)
2. **Task 2: HistoryTrendLine + wire into EstimationHistory** - `ccbc06d` (feat)

## Files Created/Modified

- `src/renderer/src/plugins/launchpad/charts/ComparisonBarChart.tsx` - Horizontal grouped BarChart with cheapest-bar green highlight, custom tooltip, Cell-per-bar coloring
- `src/renderer/src/plugins/launchpad/charts/HistoryTrendLine.tsx` - Multi-line LineChart with per-provider dash patterns, show-all toggle, metadata tooltip, empty guard
- `src/renderer/src/plugins/launchpad/ComparisonView.tsx` - Added ComparisonBarChart import + rendering above provider cards with section heading
- `src/renderer/src/plugins/launchpad/EstimationHistory.tsx` - Added HistoryTrendLine import + glass card wrapper above the history card list

## Decisions Made

- Muted provider hex values (#B8721A/#3A6DB5/#1A6BA0) for non-cheapest bars keep dark-theme contrast without visually competing with the green winner bar
- Tooltip metadata stored as `_aws`/`_gcp`/`_azure` sibling keys in chart data so CustomTooltip accesses estimation name and services directly without a separate lookup map
- `connectNulls={false}` on all trend lines — gaps show explicitly when a provider has no saved estimation at a given time (informative, not masked by interpolation)
- Bar chart uses `isAnimationActive={false}` consistent with the pattern established in phase 11-01

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript compilation clean, full build passed in both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both chart components are standalone and reusable
- ComparisonView shows bar chart above cards; EstimationHistory shows trend chart above card list
- Phase 12 (advanced visualizations) can extend HistoryTrendLine with cost-per-service drill-down or add new chart types
- No blockers

---
*Phase: 11-visualizations*
*Completed: 2026-03-31*

## Self-Check: PASSED

- ComparisonBarChart.tsx: FOUND
- HistoryTrendLine.tsx: FOUND
- 11-02-SUMMARY.md: FOUND
- Commit 18b323f: FOUND
- Commit ccbc06d: FOUND
