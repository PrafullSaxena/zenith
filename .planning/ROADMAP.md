# Roadmap: Zenith Full UI Revamp

## Overview

Migrate the entire Zenith UI from the custom Glass Design System to shadcn/ui + Animate-UI. The work flows bottom-up: install dependencies and theming tokens, generate base components, build 9 shared cross-plugin components plus layout primitives, migrate all 10 screens/plugins in parallel, remove old Glass and Three.js code, then polish with micro-interactions, empty states, and accessibility. Every plugin ends up on the same shared component library.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Install deps, configure theming tokens, fonts, and cn() utility (completed 2026-03-27)
- [ ] **Phase 2: Token Layer** - Generate all shadcn/Animate-UI base components customized with zenith-violet tokens
- [ ] **Phase 3: Shared Components** - Build 9 reusable components, AppLayout, Sidebar, PluginShell, CommandPalette, and global toast
- [ ] **Phase 4: Screen Migration** - Migrate all 10 screens/plugins to use shared components (parallel agents)
- [ ] **Phase 5: 3D Removal & Cleanup** - Delete Glass components, Three.js code, and old dependencies
- [ ] **Phase 6: Polish** - Micro-interactions, empty states, command palette wiring, a11y audit, bundle audit

## Phase Details

### Phase 1: Foundation
**Goal**: The project has a working theming foundation -- shadcn/ui configured, CSS custom property tokens applied, fonts loaded, utility functions available
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. Running the app shows the radial gradient background with zenith-violet tokens (dark page bg, violet accent)
  2. Inter renders for all UI text and JetBrains Mono renders for code/monospace elements
  3. cn() can be imported from lib/utils and correctly merges Tailwind classes (clsx + tailwind-merge)
  4. shadcn components.json is configured and `npx shadcn add button` generates a component that uses the project tokens
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Install deps, configure shadcn CLI, cn() utility, replace fonts with Inter + JetBrains Mono
- [ ] 01-02-PLAN.md -- Migrate CSS tokens to HSL shadcn format, radial gradient bg, theme.ts, verify with Button generation

### Phase 2: Token Layer
**Goal**: Every base UI primitive (buttons, cards, inputs, dialogs, tabs, toasts, etc.) exists as a themed shadcn/Animate-UI component ready for consumption by shared components and screens
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, COMP-09, COMP-10, COMP-11, COMP-12
**Success Criteria** (what must be TRUE):
  1. A Storybook-style test page (or dev route) can render every base component (Button, Card, Input, Select, Tabs, Badge, Dialog, Toast, Skeleton, ScrollArea, Tooltip, Progress, DropdownMenu, Popover, Accordion, Sheet, Command) with zenith-violet theming
  2. Sonner toasts fire with status colors (success/error/warning/info) and auto-dismiss
  3. Animate-UI Dialog opens with scale+fade animation, Tabs show animated indicator bar, Accordion/Sheet animate open/close
  4. Command component (cmdk) renders a searchable list with keyboard navigation
  5. All components respect the CSS custom property tokens (changing a token value changes appearance globally)
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md -- Core form/display components: Card, Input, Label, Select, Badge, Skeleton, Button customization
- [ ] 02-02-PLAN.md -- Utility components + Sonner toast: ScrollArea, Tooltip, Progress, DropdownMenu, Popover, AlertDialog
- [ ] 02-03-PLAN.md -- Animated components + Command: Tabs, Dialog, Accordion, Sheet (Animate-UI), Command (cmdk)

### Phase 3: Shared Components
**Goal**: All 9 cross-plugin components plus layout primitives (AppLayout, Sidebar, PluginShell, SplitPanel, CommandPalette) are built and independently testable, enabling parallel screen migration
**Depends on**: Phase 2
**Requirements**: SHAR-01, SHAR-02, SHAR-03, SHAR-04, SHAR-05, SHAR-06, SHAR-07, SHAR-08, SHAR-09, LYOT-01, LYOT-02, LYOT-03, LYOT-04, LYOT-05
**Success Criteria** (what must be TRUE):
  1. Sidebar collapses between 56px icon rail and 240px expanded with Cmd+B toggle, and all route navigation works
  2. PluginShell wraps any plugin with a consistent header + tabs layout
  3. Each of the 9 shared components (RichTextEditor, ContentRenderer, ChatInterface, DataTable, HistoryList, PdfExporter, SearchInput, CodeEditor, FileTree) renders in isolation with mock data
  4. CommandPalette opens on Cmd+K and displays a searchable list (wiring to real data deferred to Phase 6)
  5. Page transitions (fade + slide) work when navigating between routes
**Plans**: 6 plans

Plans:
- [ ] 03-01-PLAN.md -- Migrate AppLayout + Sidebar with collapsible behavior (56px <-> 240px, Cmd+B) + page transitions
- [ ] 03-02-PLAN.md -- PluginShell (Card header + Tabs wrapper), SplitPanel (resizable panels), SearchInput (debounced)
- [ ] 03-03-PLAN.md -- DataTable (sortable, paginated, virtual scroll) + HistoryList (timestamped entries with actions)
- [ ] 03-04-PLAN.md -- CodeEditor (CodeMirror 6 wrapper, edit/readOnly/execute) + FileTree (animated tree with search)
- [ ] 03-05-PLAN.md -- RichTextEditor (Tiptap full/minimal modes), PdfExporter (utility), CommandPalette (Cmd+K)
- [ ] 03-06-PLAN.md -- ContentRenderer (markdown + code + mermaid + streaming + actions) + ChatInterface (AI chat)

### Phase 4: Screen Migration
**Goal**: All 6 plugins and 4 system screens are fully migrated to use shared components and base primitives -- every screen renders correctly with the new design system
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, SETT-01, SETT-02, SETT-03, SETT-04, SETT-05, SETT-06, CRTX-01, CRTX-02, CRTX-03, CRTX-04, CRTX-05, CRTX-06, CRTX-07, CRTX-08, CRTX-09, DBIP-01, DBIP-02, DBIP-03, DBIP-04, DBIP-05, DBIP-06, DBIP-07, NEBL-01, NEBL-02, NEBL-03, NEBL-04, NEBL-05, NEBL-06, TXCR-01, TXCR-02, TXCR-03, TXCR-04, TXCR-05, CRVW-01, CRVW-02, CRVW-03, CRVW-04, CRVW-05, LNCH-01, LNCH-02, LNCH-03, LNCH-04, LNCH-05, LNCH-06, LNCH-07, MISC-01, MISC-02
**Success Criteria** (what must be TRUE):
  1. Dashboard shows MissionControl header, 4 MetricCards, TokenChart, HealthPanel with glowing dots, ActivityFeed, and PluginCards grid -- all with zenith-violet theming
  2. Settings screen has vertical tabs navigation and all sub-panels (General, AI Agents, MCP, Plugins, Connections/Repos) render with new components
  3. Cortex plugin shows RepoManager, InsightsPanel with all 6 sub-tabs, CodePanel with FileTree+CodeEditor, QAPanel with ChatInterface, and ExportDialog with PdfExporter
  4. DB Inspector shows ConnectionManager, SchemaExplorer, QueryConsole with CodeEditor+DataTable, AskAI with ChatInterface, QueryOptimizer, ERDiagram (2D mermaid, no 3D), and DbHistory
  5. Nebula shows NoteList, NoteEditor with RichTextEditor, SearchView with ChatInterface, KnowledgeGraph (2D only, no 3D), VoiceRecorder/TranscriptionBlock/DrawingCanvas restyled, and all dialogs using Animate-UI
  6. TextCraft shows 3-panel SplitPanel layout with RichTextEditor input, controls, ContentRenderer output, and HistoryList
  7. Code Review Bot shows PRList, PRDiffView with theme diff colors, ReviewPanel with ContentRenderer, ReviewHistory, and SettingsPanel with RichTextEditor
  8. Launchpad shows ProviderSelector, ServiceCatalog, ResourceConfigurator, EstimationSummary with PdfExporter, AiAdvisor with ChatInterface, EstimationHistory, and no CostTreemap3D
  9. Activity Log renders with DataTable and filters; About page renders with Cards and capability Badges
  10. All existing functionality is preserved -- stores, IPC channels, AI streaming, database queries all work unchanged
**Plans**: TBD

Plans:
- [ ] 04-01: TBD (Dashboard)
- [ ] 04-02: TBD (Settings)
- [ ] 04-03: TBD (Cortex)
- [ ] 04-04: TBD (DB Inspector)
- [ ] 04-05: TBD (Nebula)
- [ ] 04-06: TBD (TextCraft)
- [ ] 04-07: TBD (Code Review Bot)
- [ ] 04-08: TBD (Launchpad + Activity + About)

### Phase 5: 3D Removal & Cleanup
**Goal**: All legacy Glass components, Three.js 3D views, and associated dependencies are deleted -- the codebase has zero references to the old design system
**Depends on**: Phase 4
**Requirements**: CLEN-01, CLEN-02, CLEN-03, CLEN-04
**Success Criteria** (what must be TRUE):
  1. Zero imports of any Glass* component or glass-utils.ts anywhere in the codebase
  2. Zero imports of three, @react-three/fiber, @react-three/drei, or d3-force-3d -- and these packages are removed from package.json
  3. No references to ActivityMesh3D, SchemaOrb3D, MindGraph3D, KnowledgeGraph3D, CostTreemap3D, or Scene3DWrapper
  4. Old CSS files (hljs-zenith.css, flow-styles.css) are removed or their needed styles are inlined
  5. The app builds and runs cleanly with no dead-code warnings related to removed modules
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Polish
**Goal**: The app feels finished -- every interaction has micro-animations, every empty state guides the user, keyboard shortcuts work consistently, and accessibility is solid
**Depends on**: Phase 5
**Requirements**: POLS-01, POLS-02, POLS-03, POLS-04, POLS-05, POLS-06
**Success Criteria** (what must be TRUE):
  1. All interactive elements (buttons, cards, tabs, dialogs, accordions) have Animate-UI micro-interactions (hover, press, enter/exit)
  2. Every plugin shows a meaningful empty state (illustration + description + action) when it has no data
  3. Command palette (Cmd+K) searches across all plugin routes, recent activity entries, and settings sections
  4. Keyboard shortcuts work consistently: Cmd+K (palette), Cmd+B (sidebar), Cmd+N (new item where applicable), Escape (close modals/palette)
  5. Focus rings are visible on all interactive elements, ARIA attributes are correct, and prefers-reduced-motion disables animations
  6. Bundle size is measurably smaller than before (Three.js removal saves 500KB+)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Token Layer | 0/3 | Not started | - |
| 3. Shared Components | 0/6 | Not started | - |
| 4. Screen Migration | 0/8 | Not started | - |
| 5. 3D Removal & Cleanup | 0/1 | Not started | - |
| 6. Polish | 0/1 | Not started | - |

---
*Roadmap created: 2026-03-27*
*Last updated: 2026-03-27*
