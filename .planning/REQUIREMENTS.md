# Requirements: Zenith Full UI Revamp

**Defined:** 2026-03-27
**Core Value:** Every plugin must use the same shared component library — consistency through reuse, not duplication.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: shadcn/ui + Animate-UI installed and configured with Tailwind CSS v4
- [ ] **FOUND-02**: CSS custom property theme system with zenith-violet tokens applied globally
- [ ] **FOUND-03**: Inter + JetBrains Mono fonts loaded with font-display: swap
- [ ] **FOUND-04**: cn() utility (clsx + tailwind-merge) available project-wide
- [ ] **FOUND-05**: Radial gradient page background from primary color at top

### Base Components

- [ ] **COMP-01**: shadcn Button component with 4 variants (primary, secondary, destructive, ghost)
- [ ] **COMP-02**: shadcn Card component with 28px radius, card bg, 1px border
- [ ] **COMP-03**: shadcn Input + Label with focus ring and error states
- [ ] **COMP-04**: shadcn Select with card bg dropdown and keyboard nav
- [ ] **COMP-05**: Animate-UI Tabs with animated indicator bar
- [ ] **COMP-06**: shadcn Badge with pill radius and 13% tinted status colors
- [ ] **COMP-07**: Animate-UI Dialog with scale + fade animation
- [ ] **COMP-08**: shadcn Sonner toast with status colors and auto-dismiss
- [ ] **COMP-09**: shadcn Skeleton with shimmer animation
- [ ] **COMP-10**: shadcn ScrollArea, Tooltip, Progress, DropdownMenu, Popover
- [ ] **COMP-11**: Animate-UI Accordion and Sheet
- [ ] **COMP-12**: shadcn Command (cmdk) for command palette

### Shared Components

- [ ] **SHAR-01**: RichTextEditor — Tiptap wrapper with full/minimal modes
- [ ] **SHAR-02**: ContentRenderer — markdown output with code blocks, mermaid, streaming, actions
- [ ] **SHAR-03**: ChatInterface — AI conversation with messages, suggestions, streaming
- [ ] **SHAR-04**: DataTable — sortable, paginated, virtual scroll, cell expand
- [ ] **SHAR-05**: HistoryList — historical entries with filters, restore/delete
- [ ] **SHAR-06**: PdfExporter — unified PDF generation (report/document/diagram formats)
- [ ] **SHAR-07**: SearchInput — debounced search with shortcut hint
- [ ] **SHAR-08**: CodeEditor — CodeMirror 6 wrapper (editable/readOnly/execute modes)
- [ ] **SHAR-09**: FileTree — Animate-UI Files based tree with search, virtual scroll

### Layout

- [ ] **LYOT-01**: Collapsible sidebar (56px icon rail ↔ 240px expanded, Cmd+B toggle)
- [ ] **LYOT-02**: PluginShell — shared header + tabs wrapper for all plugins
- [ ] **LYOT-03**: SplitPanel — shared resizable panel layout
- [ ] **LYOT-04**: CommandPalette — Cmd+K global search across plugins, activity, settings
- [ ] **LYOT-05**: Page transitions preserved with Framer Motion (fade + slide)

### Dashboard

- [ ] **DASH-01**: MissionControl with radial gradient header, greeting, search, primary action
- [ ] **DASH-02**: 4 MetricCards with status-colored icon containers and delta indicators
- [ ] **DASH-03**: TokenChart restyled with theme colors in Card wrapper
- [ ] **DASH-04**: HealthPanel with glowing status dots and grouped resources
- [ ] **DASH-05**: ActivityFeed with nested rows, StatusBadges, plugin accents
- [ ] **DASH-06**: PluginCards grid with hover lift animation

### Settings

- [ ] **SETT-01**: SettingsLayout with Animate-UI vertical Tabs
- [ ] **SETT-02**: GeneralSettings with theme selector grid (single + placeholder slots)
- [ ] **SETT-03**: AIAgentsSettings with DataTable, StatusBadge, API key management
- [ ] **SETT-04**: MCPSettings with Card list, Switch toggle, DropdownMenu actions
- [ ] **SETT-05**: PluginSettings with dynamic Accordion forms
- [ ] **SETT-06**: ConnectionListEditor and RepoListEditor restyled

### Cortex Plugin

- [ ] **CRTX-01**: RepoManager with Card grid, StatusBadge, analyze Button
- [ ] **CRTX-02**: InsightsPanel with 6 sub-tabs (Overview, APIs, Flows, Architecture, Diagrams, Graph)
- [ ] **CRTX-03**: Overview with MetricCards, DonutChart, ContentRenderer for docs
- [ ] **CRTX-04**: APIs tab with DataTable, method Badges, sortable headers
- [ ] **CRTX-05**: Flows/Architecture/Diagrams with React Flow restyled using theme tokens
- [ ] **CRTX-06**: Graph tab with 2D force graph only (remove MindGraph3D)
- [ ] **CRTX-07**: CodePanel with shared FileTree + CodeEditor (readOnly)
- [ ] **CRTX-08**: QAPanel with shared ChatInterface + citation renderActions
- [ ] **CRTX-09**: ExportDialog with PdfExporter

### DB Inspector Plugin

- [ ] **DBIP-01**: ConnectionManager with Card, Select, StatusBadge
- [ ] **DBIP-02**: SchemaExplorer with Accordion tree and Tooltip
- [ ] **DBIP-03**: QueryConsole with shared CodeEditor (execute mode) + DataTable results
- [ ] **DBIP-04**: AskAI with shared ChatInterface + run-sql actions
- [ ] **DBIP-05**: QueryOptimizer with ContentRenderer + mermaid
- [ ] **DBIP-06**: ERDiagram with SearchInput, mode Tabs, Mermaid (remove SchemaOrb3D)
- [ ] **DBIP-07**: DbHistory with shared HistoryList

### Nebula Plugin

- [ ] **NEBL-01**: NoteList with Card sidebar, ScrollArea, DropdownMenu context actions
- [ ] **NEBL-02**: NoteEditor with shared RichTextEditor (full mode), auto-save StatusBadge
- [ ] **NEBL-03**: SearchView with shared SearchInput + ChatInterface for Q&A
- [ ] **NEBL-04**: KnowledgeGraph with 2D force graph only (remove KnowledgeGraph3D)
- [ ] **NEBL-05**: VoiceRecorder, TranscriptionBlock, DrawingCanvas restyled
- [ ] **NEBL-06**: All dialogs migrated to Animate-UI Dialog/AlertDialog/DropdownMenu

### TextCraft Plugin

- [ ] **TXCR-01**: 3-panel layout with shared SplitPanel
- [ ] **TXCR-02**: InputPanel with shared RichTextEditor (minimal mode)
- [ ] **TXCR-03**: ControlsPanel with ToggleGroup, Select, Textarea, primary Button
- [ ] **TXCR-04**: OutputPanel with shared ContentRenderer (collapsible + all actions)
- [ ] **TXCR-05**: HistoryPanel with shared HistoryList

### Code Review Bot Plugin

- [ ] **CRVW-01**: PRList with Card list, author Badge, file count StatusBadge
- [ ] **CRVW-02**: PRDiffView restyled with theme diff colors
- [ ] **CRVW-03**: ReviewPanel with shared ContentRenderer + severity StatusBadges
- [ ] **CRVW-04**: ReviewHistory with shared HistoryList
- [ ] **CRVW-05**: SettingsPanel with shared RichTextEditor (minimal, guidelines)

### Launchpad Plugin

- [ ] **LNCH-01**: ProviderSelector with Card buttons, brand colors
- [ ] **LNCH-02**: ServiceCatalog with shared SearchInput + ScrollArea
- [ ] **LNCH-03**: ResourceConfigurator with dynamic forms
- [ ] **LNCH-04**: EstimationSummary with cost breakdown, PdfExporter trigger
- [ ] **LNCH-05**: AiAdvisor with shared ChatInterface + suggestion actions
- [ ] **LNCH-06**: EstimationHistory + ComparisonView with shared components
- [ ] **LNCH-07**: Remove CostTreemap3D

### Activity & About

- [ ] **MISC-01**: ActivityLog with shared DataTable, filters, StatusBadges
- [ ] **MISC-02**: AboutView simplified with Cards and capability Badges

### Cleanup

- [ ] **CLEN-01**: Delete all 15 Glass* components and glass-utils.ts
- [ ] **CLEN-02**: Delete all 5 Three.js 3D components (ActivityMesh3D, SchemaOrb3D, MindGraph3D, KnowledgeGraph3D, CostTreemap3D, Scene3DWrapper)
- [ ] **CLEN-03**: Remove three, @react-three/fiber, @react-three/drei, d3-force-3d from package.json
- [ ] **CLEN-04**: Clean up old CSS (hljs-zenith.css, flow-styles.css)

### Polish

- [ ] **POLS-01**: Animate-UI micro-interactions on all interactive elements
- [ ] **POLS-02**: Empty states for every plugin
- [ ] **POLS-03**: Command palette wired to all routes, activity, settings
- [ ] **POLS-04**: Keyboard shortcuts audit (Cmd+K, Cmd+B, Cmd+N, Escape)
- [ ] **POLS-05**: Accessibility audit (focus rings, ARIA, reduced motion)
- [ ] **POLS-06**: Bundle size audit after Three.js removal

## v2 Requirements

### Multi-Theme Support
- **THME-01**: Add 3-5 curated themes (Nord, Tokyo Night, Catppuccin, Synthwave)
- **THME-02**: Theme selector grid with live preview
- **THME-03**: Per-plugin theme override capability

### Light Mode
- **LITE-01**: Full light mode variant for all components
- **LITE-02**: System preference detection (prefers-color-scheme)

## Out of Scope

| Feature | Reason |
|---------|--------|
| New plugin features | UI-only revamp, no new functionality |
| Store/IPC changes | Visual layer only, business logic untouched |
| Mobile/responsive redesign | Desktop app, existing responsive sufficient |
| Light mode | Dark-only for this milestone |
| Multiple themes | Single theme, architecture supports future |
| New 3D visualizations | Replacing with 2D, not adding new |

## Traceability

<!-- Populated during roadmap creation -->

| Requirement | Phase | Status |
|-------------|-------|--------|

**Coverage:**
- v1 requirements: 64 total
- Mapped to phases: 0
- Unmapped: 64

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after initial definition*
