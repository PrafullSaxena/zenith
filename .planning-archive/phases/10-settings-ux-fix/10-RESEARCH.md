# Phase 10 Research: Settings UX Fix

## RESEARCH COMPLETE

## Scope

Visual-only refactoring of all Settings UI components to use consistent design tokens. No logic changes.

## Files to Modify (10 files)

1. `src/renderer/src/components/settings/SettingsLayout.tsx` — sidebar category buttons
2. `src/renderer/src/components/settings/SettingsField.tsx` — universal form field component
3. `src/renderer/src/components/settings/GeneralSettings.tsx` — general settings wrapper
4. `src/renderer/src/components/settings/AIAgentsSettings.tsx` — AI agent table header/layout
5. `src/renderer/src/components/settings/AgentRow.tsx` — individual agent row
6. `src/renderer/src/components/settings/MCPSettings.tsx` — MCP server list + add form
7. `src/renderer/src/components/settings/AddCustomAgentForm.tsx` — custom agent form
8. `src/renderer/src/components/settings/ConnectionListEditor.tsx` — PostgreSQL connections
9. `src/renderer/src/components/settings/RepoListEditor.tsx` — Bitbucket repo list
10. `src/renderer/src/components/settings/PluginSettings.tsx` — dynamic plugin settings

## Issues Identified

### CRITICAL — Button Border-Radius Inconsistency
Buttons use mixed `rounded-md`, `rounded-lg`, `rounded-r-lg`, and `rounded-full` across all components.
**Standard:** All buttons should use `rounded-lg`.

### CRITICAL — Toggle/Switch Design Inconsistency
Two completely different toggle implementations:
- SettingsField: `h-6 w-11`, dot `h-4 w-4`, translate-x-6/translate-x-1
- MCPSettings: `h-5 w-9`, dot `h-4 w-4`, translate-x-4/translate-x-0.5
**Standard:** Unify to one toggle design (SettingsField version is closer to standard).

### HIGH — Input Styling Inconsistency
- SettingsField: `rounded-md border-border bg-surface-elevated px-3 py-2 focus:ring-2 focus:ring-accent`
- MCPSettings: `rounded-lg border-border bg-surface px-3 py-1.5 focus:border-accent focus:outline-none`
**Standard:** `rounded-lg border-border/50 bg-surface px-3 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30`

### MEDIUM — Form Container Styling
Three different container designs:
- AddCustomAgentForm: `rounded-xl border-border/50 bg-surface p-4`
- MCPSettings: `rounded-lg border-accent/20 bg-accent/5 p-4`
- ConnectionListEditor: `rounded-md border-border bg-surface-elevated/30 p-4`
**Standard:** `rounded-xl border border-border/50 bg-surface-elevated/30 p-4`

### MEDIUM — Empty State Styling
- MCPSettings: solid border, filled background, py-6
- ConnectionListEditor/RepoListEditor: dashed border, no background, py-3
**Standard:** Centered icon (size 24) + title `text-sm` + subtitle `text-xs text-text-secondary`, `rounded-lg border border-dashed border-border/50 px-4 py-8`

### MEDIUM — Table Row Hover States Missing
AIAgentsSettings, ConnectionListEditor, RepoListEditor table rows lack hover feedback.
**Standard:** `hover:bg-surface-elevated/30 transition-colors`

### MEDIUM — Delete/Remove Button Inconsistency
Mixed red patterns. **Standard:** `text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors`

### MEDIUM — Button Padding Inconsistency
Hardcoded `h-[38px]` in ConnectionListEditor/RepoListEditor.
**Standard:** Use padding-based sizing: small `px-2.5 py-1 text-xs`, medium `px-3 py-1.5 text-sm`

### LOW — Badge/Chip Styling
AgentRow: `rounded-md`, MCPSettings: `rounded`.
**Standard:** `rounded-md bg-surface-elevated px-1.5 py-0.5 text-[10px]`

### LOW — Password Visibility Toggle Size
SettingsField: size 16, ConnectionListEditor: size 14.
**Standard:** size 14 consistently.

### LOW — Select Element Styling
Mixed `rounded-md`/`rounded-lg`. **Standard:** `rounded-lg` to match inputs.

### LOW — Section Header Descriptions
Inconsistent description text sizes. **Standard:** `text-xs text-text-secondary mt-1`

## Design Token Summary

| Element | Standard |
|---------|----------|
| Buttons (small) | `px-2.5 py-1 text-xs rounded-lg` |
| Buttons (medium) | `px-3 py-1.5 text-sm rounded-lg` |
| Inputs/selects | `rounded-lg border-border/50 bg-surface px-3 py-1.5 text-sm` |
| Input focus | `focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30` |
| Toggle switch | `h-5 w-10 rounded-full` + `h-4 w-4 translate-x-5/translate-x-0.5` |
| Cards/containers | `rounded-xl border-border/50` |
| Table containers | `rounded-lg border-border/50 overflow-hidden` |
| Table row hover | `hover:bg-surface-elevated/30 transition-colors` |
| Delete buttons | `text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg` |
| Empty states | Icon (size 24) + title text-sm + subtitle text-xs, dashed border |
| Badges | `rounded-md bg-surface-elevated px-1.5 py-0.5 text-[10px]` |
| Section descriptions | `text-xs text-text-secondary mt-1` |

## Implementation Approach

**Batch 1 — SettingsField.tsx (universal component):** Fix input classes, toggle, select, password icon, button radii. This propagates to all settings using SettingsField.

**Batch 2 — MCPSettings.tsx:** Unify toggle, input styles, form container, empty state, badges, delete buttons.

**Batch 3 — AgentRow.tsx + AIAgentsSettings.tsx + AddCustomAgentForm.tsx:** Table hover rows, button radii, badge styles, form container.

**Batch 4 — ConnectionListEditor.tsx + RepoListEditor.tsx:** Table containers, button sizes (remove h-[38px]), empty states, password toggle, hover rows.

**Batch 5 — SettingsLayout.tsx + GeneralSettings.tsx + PluginSettings.tsx:** Sidebar polish, section header consistency, stagger animations.

## Dependencies

No new npm packages. All changes are Tailwind class swaps. Each batch is independent after Batch 1 (SettingsField changes affect all consumers).
