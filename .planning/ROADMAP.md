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
- [x] **Phase 3: Shared Components** - Build 9 reusable components, AppLayout, Sidebar, PluginShell, CommandPalette, and global toast (completed 2026-03-26)
- [ ] **Phase 4: Screen Migration** - Migrate all 10 screens/plugins to use shared components (parallel agents)
- [ ] **Phase 5: 3D Removal & Cleanup** - Delete Glass components, Three.js code, and old dependencies
- [ ] **Phase 6: Polish** - Micro-interactions, empty states, command palette wiring, a11y audit, bundle audit
- [x] **Phase 7: Data Foundation** - Initialize pricing.db, PricingRepository, core IPC handlers, and credential storage (completed 2026-03-30)
- [x] **Phase 8: Pricing Sync** - PricingSync service, AWS/Azure/GCP fetchers, delta sync, regional data, sync IPC channels (completed 2026-03-30)
- [x] **Phase 9: Calculator & Store** - Pure calculator function, pricingCache, lazy loading, memoization, region picker (completed 2026-03-30)
- [x] **Phase 10: Service Catalog** - 100-service DB-driven catalog, virtualized list, in-memory search, cross-provider equivalences (completed 2026-03-30)
- [ ] **Phase 11: Visualizations** - Recharts integration, treemap, donut, comparison bar, history trend line
- [ ] **Phase 12: Settings & Polish** - Settings panel, credentials UI, sync status badge, region persistence

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
**Plans**: 10 plans

Plans:
- [ ] 04-01-PLAN.md -- Dashboard: MissionControl, MetricCards, TokenChart, HealthPanel, ActivityFeed, PluginCards
- [ ] 04-02-PLAN.md -- Settings: SettingsLayout with vertical Tabs, all sub-panels (General, AI Agents, MCP, Plugins, Connections, Repos)
- [ ] 04-03-PLAN.md -- Cortex Insights: InsightsPanel with 6 sub-tabs (Overview, APIs, Flows, Architecture, Diagrams, Graph)
- [ ] 04-04-PLAN.md -- Cortex Code/QA/Repos: CortexView with PluginShell, RepoManager, CodePanel, QAPanel, ExportDialog
- [ ] 04-05-PLAN.md -- DB Inspector Query: DbInspectorView, ConnectionManager, SchemaExplorer, QueryConsole, ResultsGrid
- [ ] 04-06-PLAN.md -- DB Inspector AI/ER: AskAI, QueryOptimizer, ERDiagram, MermaidRenderer, DbHistory
- [ ] 04-07-PLAN.md -- Nebula: NebulaView, NoteList, NoteEditor, SearchView, KnowledgeGraph, VoiceRecorder, DrawingCanvas, all dialogs
- [ ] 04-08-PLAN.md -- TextCraft: TextCraftView with SplitPanel, InputPanel, ControlsPanel, OutputPanel, HistoryPanel
- [ ] 04-09-PLAN.md -- Code Review Bot: CodeReviewBotView, PRList, PRDiffView, ReviewPanel, ReviewHistory, SettingsPanel
- [ ] 04-10-PLAN.md -- Launchpad + Activity + About: LaunchpadView, all sub-components, ActivityLog, AboutView

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
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md -- Micro-interactions utilities + EmptyState update + wire empty states into all 6 plugins
- [ ] 06-02-PLAN.md -- Wire CommandPalette to all routes/activity/settings + keyboard shortcuts audit
- [ ] 06-03-PLAN.md -- Accessibility audit (focus rings, ARIA, reduced motion) + bundle size audit

---

## v2.0 — Launchpad Enhancement

### Phase 7: Data Foundation
**Goal**: The Launchpad has a persistent pricing database in the main process, a repository API, encrypted credential storage, and the core IPC channels wired -- app boots without network and serves rates from DB
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, IPC-01, IPC-05, IPC-06
**Success Criteria** (what must be TRUE):
  1. App boots on first launch with no network and Launchpad renders using seeded pricing data from pricing.db
  2. PricingRepository can be called from any main-process handler and returns catalog, rates, regions, and sync status without error
  3. A GCP API key entered in settings is stored encrypted and survives app restart (confirmed via safeStorage round-trip)
  4. Calling launchpad:getPricing and launchpad:getCatalog from the renderer returns structured data from the DB within 5ms
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md -- DB init, PricingRepository class, safeStorage credentials helper
- [ ] 07-02-PLAN.md -- Seed from TS catalogs, IPC handlers (getPricing/getCatalog/saveCredentials), preload exposure

### Phase 8: Pricing Sync
**Goal**: Live pricing is fetched from AWS, Azure, and GCP on a daily schedule; delta sync keeps the DB current; sync failures are isolated per provider and logged; the renderer is notified on completion
**Depends on**: Phase 7
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, SYNC-08, SYNC-09, SYNC-10, REGION-01, IPC-02, IPC-03, IPC-04
**Success Criteria** (what must be TRUE):
  1. On first manual sync, AWS and Azure pricing data populates pricing.db for all 12 supported regions per provider without requiring any credentials
  2. GCP pricing syncs successfully when a valid API key is configured; with no key, the UI displays "Using cached data" without crashing
  3. A second sync run fetches only changed rates (delta strategy) -- the sync log shows a smaller byte count than the initial full sync
  4. If one provider's sync endpoint returns an error, the other two providers' data is still updated and the failure is recorded in pricing_sync_log
  5. The renderer receives a launchpad:syncComplete push event and the sync status badge updates immediately after any sync completes
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md -- PricingSync orchestrator + AWS fetcher (bulk JSON, delta, optional Cost Explorer stub)
- [ ] 08-02-PLAN.md -- Azure fetcher (paginated Retail Prices API, delta) + GCP fetcher (API key, graceful skip, ETag delta)
- [ ] 08-03-PLAN.md -- Wire IPC handlers (syncPricing, getSyncStatus, getRegions) + preload exposure + push notification

### Phase 9: Calculator & Store
**Goal**: Cost calculations are driven entirely by live DB rates -- the calculator is a pure function, rates load lazily per selected service, results are memoized, and region changes recalculate instantly without a network round-trip
**Depends on**: Phase 8
**Requirements**: REGION-02, REGION-03, REGION-04, REGION-05, CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06
**Success Criteria** (what must be TRUE):
  1. Selecting a different region in EstimationSummary recalculates all service costs instantly (no loading spinner, no IPC call on region change)
  2. The calculator produces identical results whether called with AWS, GCP, or Azure rates -- no provider-specific logic inside the function
  3. Selecting a service for the first time loads its rates from DB; selecting it again uses the memoized result (no duplicate IPC calls)
  4. With no DB rates available, the UI shows "Pricing unavailable" per service rather than crashing or showing $0
  5. Selected region is persisted per provider and restored on next app launch
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md -- Fix pricing-sync.ts stubs + refactor calculator to pure RateMap-driven function
- [ ] 09-02-PLAN.md -- launchpad-store pricingCache + lazy loading + memoization + region picker UI
- [ ] 09-03-PLAN.md -- Gap closure: wire memoCache read/write path into getTotalCost (CALC-04)

### Phase 10: Service Catalog
**Goal**: The service catalog contains ~100 services across 8 categories for all 3 providers, is served from the DB, renders smoothly regardless of catalog size, and supports instant text filtering
**Depends on**: Phase 9
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06
**Success Criteria** (what must be TRUE):
  1. The ServiceCatalog list displays ~100 services grouped into 8 categories for any selected provider, all loaded from the DB
  2. Scrolling through the full catalog (100+ items) maintains 60fps -- only visible rows are rendered in the DOM
  3. Typing in the catalog search box filters results within 10ms with no perceptible lag on each keystroke
  4. ComparisonView shows cross-provider equivalences for ~25 service families (e.g., EC2 / Compute Engine / Azure VMs)
**Plans**: 3 plans

Plans:
- [ ] 10-01-PLAN.md -- Expand TS catalogs to ~34 services/provider across 8 categories + equivalences to 25 families
- [ ] 10-02-PLAN.md -- DB-driven ServiceCatalog: IPC load, useVirtualizer, filter chips, flat search, row-tint selection
- [ ] 10-03-PLAN.md -- ComparisonView equivalence reference table: 25 families, alphabetical, read-only, partial matches show "—"

### Phase 11: Visualizations
**Goal**: EstimationSummary and ComparisonView display rich Recharts charts that make cost distribution and provider comparisons immediately scannable; history trend is visible in the History tab
**Depends on**: Phase 10
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06
**Success Criteria** (what must be TRUE):
  1. EstimationSummary renders a treemap showing cost distribution by service with category color-coding; hovering a cell shows service name, cost, and percentage of total
  2. EstimationSummary renders a donut chart showing spending split by category alongside the treemap
  3. ComparisonView renders a grouped bar chart with one group per service family; the cheapest provider's bar is highlighted green
  4. The History tab renders a trend line plotting saved estimations over time; hovering a point shows the estimation name and cost breakdown
  5. All charts render correctly in dark mode using CSS custom properties -- no hardcoded colors visible
**Plans**: 2 plans

Plans:
- [ ] 11-01-PLAN.md -- Install recharts, CostTreemap + CategoryDonut charts, wire into EstimationSummary with cross-highlighting
- [ ] 11-02-PLAN.md -- ComparisonBarChart for ComparisonView + HistoryTrendLine for History tab

### Phase 12: Settings & Polish
**Goal**: Users can manage credentials, configure sync preferences, inspect per-provider sync health, and see live sync status from the Launchpad header -- the plugin feels production-ready
**Depends on**: Phase 11
**Requirements**: SET-01, SET-02, SET-03, SET-04, SET-05, SET-06
**Success Criteria** (what must be TRUE):
  1. The Zenith Settings screen has a Launchpad section where users can set sync frequency, default region per provider, and trigger a manual sync
  2. The settings panel shows provider status (Live / No Key / Stale) with last-sync timestamp for each of AWS, GCP, and Azure
  3. AWS access key, GCP API key, and GCP billing account fields are displayed masked with Edit and Clear actions per field
  4. The GCP API key field is labeled "Required for live pricing" with a link to the GCP Console API key setup page
  5. The Launchpad plugin header displays a sync status badge (Live / Partial / Cached / Stale) that opens a per-provider detail popover on click
**Plans**: TBD

Plans:
- [ ] 12-01-PLAN.md -- TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Token Layer | 0/3 | Not started | - |
| 3. Shared Components | 0/6 | Complete    | 2026-03-26 |
| 4. Screen Migration | 0/10 | Not started | - |
| 5. 3D Removal & Cleanup | 0/1 | Not started | - |
| 6. Polish | 0/3 | Not started | - |
| 7. Data Foundation | 2/2 | Complete    | 2026-03-30 |
| 8. Pricing Sync | 3/3 | Complete    | 2026-03-30 |
| 9. Calculator & Store | 3/3 | Complete   | 2026-03-30 |
| 10. Service Catalog | 3/3 | Complete    | 2026-03-30 |
| 11. Visualizations | 0/2 | Not started | - |
| 12. Settings & Polish | 0/1 | Not started | - |

---
*Roadmap created: 2026-03-27*
*Last updated: 2026-03-31 — Phase 11 plans created (VIZ-01 through VIZ-06)*
