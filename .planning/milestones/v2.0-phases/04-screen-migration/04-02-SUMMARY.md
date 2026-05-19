---
phase: 04-screen-migration
plan: 02
subsystem: ui
tags: [settings, tabs, shadcn, card, input, select, switch]
requires:
  - phase: 03-shared-components
    provides: Tabs, Card, Input, Select, Switch, Textarea, Label UI components
provides:
  - Settings fully migrated from Glass to shadcn/ui
affects: [cleanup, polish]
tech-stack:
  added: []
  patterns: [vertical-tabs-layout, card-section-grouping]
key-files:
  created: []
  modified:
    - src/renderer/src/components/settings/SettingsLayout.tsx
    - src/renderer/src/components/settings/GeneralSettings.tsx
    - src/renderer/src/components/settings/SettingsField.tsx
    - src/renderer/src/components/settings/AIAgentsSettings.tsx
    - src/renderer/src/components/settings/AgentRow.tsx
    - src/renderer/src/components/settings/AddCustomAgentForm.tsx
    - src/renderer/src/components/settings/MCPSettings.tsx
    - src/renderer/src/components/settings/PluginSettings.tsx
    - src/renderer/src/components/settings/ConnectionListEditor.tsx
    - src/renderer/src/components/settings/RepoListEditor.tsx
key-decisions:
  - "SettingsLayout uses shadcn Tabs with vertical orientation instead of GlassTab"
  - "SettingsField uses Switch for boolean instead of custom toggle button"
  - "All CSS variable references (text-text-primary, bg-surface, etc.) replaced with Tailwind theme tokens"
patterns-established:
  - "Vertical tabs with TabsList flex-col w-48 for sidebar navigation"
  - "Card sections with rounded-[22px] for settings groups"
requirements-completed:
  - SETT-01
  - SETT-02
  - SETT-03
  - SETT-04
  - SETT-05
  - SETT-06
duration: 8min
completed: 2026-03-27
---

# Plan 04-02: Settings Migration Summary

**Settings screen fully migrated with vertical Tabs navigation and all 10 component files using shadcn/ui primitives.**

## Performance

- **Tasks:** 2/2 completed
- **Files modified:** 10

## Accomplishments

1. **SettingsLayout** -- Replaced GlassTab with shadcn Tabs (vertical orientation). TabsTrigger with rounded-2xl and active bg-primary/18.

2. **GeneralSettings** -- Replaced GlassCard with Card, GlassSkeleton with Skeleton, GlassBadge with Badge. Theme selector cards use Card with hover lift.

3. **SettingsField** -- Replaced GlassInput/GlassSelect/GlassButton with Input/Select/Button/Switch/Textarea. Boolean fields use Switch.

4. **Remaining files** -- All text-text-primary/secondary replaced with text-foreground/muted-foreground. All bg-surface/accent with bg-card/primary.

## Self-Check: PASSED

- Zero Glass* imports in settings/ (verified with grep)
- All store connections preserved
