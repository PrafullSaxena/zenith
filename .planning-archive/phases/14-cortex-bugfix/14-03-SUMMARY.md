---
phase: 14
plan: 3
subsystem: cortex-plugin
tags: [architecture-dashboard, react-flow, static-analysis, ui]
dependency_graph:
  requires: []
  provides: [static-entity-graph, route-summary, code-structure-overview]
  affects: [ArchitectureDashboard, cortex-store, cortex-types]
tech_stack:
  added: []
  patterns: [static-graph-from-analysis, collapsible-ai-section, layered-entity-grouping]
key_files:
  created: []
  modified:
    - src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx
decisions:
  - "Static entity graph groups entities by kind (controller/service/repository) into columns using LAYER_ORDER array; call edges drawn from analysisResult.calls"
  - "AI insights section collapsible with AnimatePresence height animation; auto-expands when aiInsights arrives"
  - "Route summary top-10 sorted by fullPath with navigate-to-handler on click; shows +N more count"
  - "getCortexAgent() checked inline to decide whether to show Generate button or no-agent note"
  - "buildStaticEntityGraph filters out method-kind entities to show only top-level structural entities"
metrics:
  duration: 3min
  completed: "2026-03-15"
---

# Phase 14 Plan 3: Architecture Dashboard Static Diagrams Summary

**One-liner:** Architecture Dashboard restructured to show entity graph, code stats, and route summary from raw `analysisResult` without any AI agent — AI insights moved to optional collapsible section.

## What Was Built

### Task 1: Static Code Structure Overview (always shown)

`CodeStructureOverview` component renders directly from `analysisResult`:
- Framework and language badges with lucide icons
- File count, line count, API endpoint count, component count stats
- Entity kind badges with `KIND_COLORS` color-coding and counts from `stats.entityCount`
- Language breakdown showing top 6 languages with file counts

### Task 2: Static Entity Relationship Diagram (always shown)

`buildStaticEntityGraph(analysisResult)` helper:
- Takes `analysisResult.entities` and `analysisResult.calls`
- Groups entities by kind, filters out `method` kind to show structural entities only
- Places controller/service/repository/class/component/middleware in column layers by `LAYER_ORDER`
- Column header nodes with dashed border, entity nodes below each header
- Call edges from `analysisResult.calls` (first 60 calls), animated for inject/route types
- Capped at 30 entities for readability
- Full React Flow render with Background, Controls, MiniMap

### Task 3: Route Summary (always shown for BE repos)

`RouteSummary` component:
- Counts by HTTP method, rendered as colored method badges
- Top 10 routes sorted alphabetically by `fullPath`
- Each row clickable → calls `navigateToFile(filePath, line)` to open code viewer
- Shows `+N more endpoints` footer when routes > 10

### Restructured AI Section (collapsible, not blocking)

- Collapsed by default; expanded automatically when `aiInsights` arrives
- Shows "Configure an AI agent in Settings..." note when `getCortexAgent()` returns null
- Shows Generate button only when agent IS configured and no insights yet
- Inline Refresh button within expanded AI section
- Loading skeleton and streaming indicator remain inside section, not full-page

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx` modified
- [x] TypeScript compiles clean (`npx tsc --noEmit` zero errors)
- [x] `electron-vite build` succeeds (CortexView-CGFpafD7.js built)
- [x] Commit 6fabe44 exists
