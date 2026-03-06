---
phase: 01-foundation
plan: "03"
subsystem: ui
tags: [typescript, react, plugin-system, registry, lazy-loading]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: Electron scaffold with React 19, TypeScript, Tailwind v4 @theme tokens
provides:
  - PluginDefinition type with id, name, icon, route, component, settingsSchema, defaultAgent
  - PluginId string literal union for four compiled-in plugins
  - SettingsField interface for plugin settings schema forms
  - PLUGINS readonly array with CodeReviewBot, DbInspector, AstroPatch, PromptBuilder entries
  - getPluginById helper function for type-safe lookups
  - Four stub view components (React.lazy-loadable)
affects:
  - 01-02-app-shell (imports PLUGINS for sidebar icons and React Router routes)
  - 01-04-settings-ipc (imports PLUGINS settingsSchema for per-plugin settings sections)
  - 01-05-ai-agent-config (imports PLUGINS for per-plugin agent dropdown)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compiled-in plugin registry: single PLUGINS array drives sidebar, router, settings"
    - "React.lazy for plugin views: each stub loaded via dynamic import"
    - "Type-safe plugin IDs: PluginId literal union prevents typos at compile time"
    - "Settings schema pattern: SettingsField[] describes forms declaratively for auto-rendering"

key-files:
  created:
    - src/renderer/src/types/plugin.ts (PluginDefinition, PluginId, SettingsField types)
    - src/renderer/src/plugins/registry.ts (PLUGINS array, getPluginById helper)
    - src/renderer/src/plugins/stubs/CodeReviewBotView.tsx (stub view)
    - src/renderer/src/plugins/stubs/DbInspectorView.tsx (stub view)
    - src/renderer/src/plugins/stubs/AstroPatchView.tsx (stub view)
    - src/renderer/src/plugins/stubs/PromptBuilderView.tsx (stub view)
  modified: []

key-decisions:
  - "Used 'as const' on PLUGINS array for maximum type narrowing while keeping PluginDefinition[] assignability"
  - "Stub views use Tailwind @theme tokens (text-text-primary, text-text-secondary) matching established dark theme pattern"

patterns-established:
  - "Plugin registration: add entry to PLUGINS array in registry.ts with lazy component import"
  - "Plugin settings: declare SettingsField[] array on each PluginDefinition for auto-rendered settings forms"
  - "Plugin views: default export function component in plugins/stubs/ directory"

requirements-completed: [PLUG-01, PLUG-02, PLUG-03]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 1 Plan 03: Plugin Registry Summary

**PluginDefinition type system and compiled-in PLUGINS registry with four lazy-loaded stub views and declarative settings schemas**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T05:13:38Z
- **Completed:** 2026-03-06T05:15:08Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- PluginDefinition type system with PluginId literal union, SettingsField schema, and LazyExoticComponent for tree-shakeable lazy loading
- PLUGINS readonly array with all four plugins in sidebar display order (CodeReviewBot, DbInspector, AstroPatch, PromptBuilder)
- Each plugin has a complete settingsSchema with typed fields (text, password, boolean) and validation-ready structure
- Four stub view components using Tailwind @theme tokens, ready for React.lazy loading

## Task Commits

Each task was committed atomically:

1. **Task 1: Define PluginDefinition type system** - `3bb3f0e` (feat)
2. **Task 2: Create plugin registry and stub view components** - `810f612` (feat)

**Plan metadata:** (pending - created in final commit)

## Files Created/Modified

- `src/renderer/src/types/plugin.ts` - PluginDefinition, PluginId, SettingsField, SettingsFieldType exports
- `src/renderer/src/plugins/registry.ts` - PLUGINS array (4 entries), getPluginById helper
- `src/renderer/src/plugins/stubs/CodeReviewBotView.tsx` - Stub view for CodeReviewBot plugin
- `src/renderer/src/plugins/stubs/DbInspectorView.tsx` - Stub view for DbInspector plugin
- `src/renderer/src/plugins/stubs/AstroPatchView.tsx` - Stub view for AstroPatch plugin
- `src/renderer/src/plugins/stubs/PromptBuilderView.tsx` - Stub view for PromptBuilder plugin

## Decisions Made

- Used `as const` on PLUGINS array for maximum type narrowing while keeping PluginDefinition[] type compatibility
- Stub views use established Tailwind @theme token classes (text-text-primary, text-text-secondary) rather than raw color values, consistent with 01-01 dark theme pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PLUGINS array importable by app shell (01-02) for sidebar icon rendering and React Router route generation
- settingsSchema on each plugin ready for settings UI (01-04) to auto-render per-plugin settings forms
- defaultAgent=null on all plugins ready for AI agent config (01-05) per-plugin agent dropdown
- Stub views can be incrementally replaced with real plugin implementations in later phases
- Pre-existing TypeScript error in scaffold file Versions.tsx (window.electron reference) is unrelated and does not affect plugin code

## Self-Check: PASSED

- src/renderer/src/types/plugin.ts: FOUND
- src/renderer/src/plugins/registry.ts: FOUND
- src/renderer/src/plugins/stubs/CodeReviewBotView.tsx: FOUND
- src/renderer/src/plugins/stubs/DbInspectorView.tsx: FOUND
- src/renderer/src/plugins/stubs/AstroPatchView.tsx: FOUND
- src/renderer/src/plugins/stubs/PromptBuilderView.tsx: FOUND
- .planning/phases/01-foundation/01-03-SUMMARY.md: FOUND
- Commit 3bb3f0e: FOUND
- Commit 810f612: FOUND
- TypeScript (new files): NO ERRORS
- plugin.ts exports (PluginDefinition, PluginId, SettingsField, SettingsFieldType): 4 exports VERIFIED
- PLUGINS array references: VERIFIED in registry.ts

---
*Phase: 01-foundation*
*Completed: 2026-03-06*
