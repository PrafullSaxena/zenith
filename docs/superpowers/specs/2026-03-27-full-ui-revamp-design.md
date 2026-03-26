# Zenith Full UI Revamp — Design Specification

**Date:** 2026-03-27
**Branch:** feature/ui-revamp
**Scope:** Complete UI migration from custom Glass Design System to shadcn/ui + Animate-UI with modern SaaS aesthetic

---

## 1. Design Decisions

| Decision | Choice |
|----------|--------|
| Style direction | Modern SaaS / Clean (Linear, Vercel, Raycast) |
| Color mode | Dark only |
| Navigation | Collapsible sidebar (56px icon rail <-> 240px expanded) |
| Themes | Single polished theme (architecture supports future themes) |
| 3D visualizations | Replace all with 2D alternatives |
| Scope | UI revamp + minor UX tweaks (command palette, empty states) |
| Component library | shadcn/ui + Animate-UI (https://animate-ui.com) |
| Accent color | Violet — hsl(263 70% 58%) / #7c3aed |
| Fonts | Inter (UI) + JetBrains Mono (code) |

---

## 2. Theming Architecture (Future-Proof)

CSS custom properties scoped to `[data-theme]` attributes. Adding a new theme = adding a new `[data-theme="name"]` block. No component changes needed.

```css
:root, [data-theme="zenith-violet"] {
  /* Base surfaces */
  --background: 240 10% 4%;           /* #09090b — page bg */
  --foreground: 0 0% 95%;             /* #f2f2f2 — primary text */
  --card: 240 6% 8%;                  /* #131318 — cards, sidebar */
  --card-foreground: 0 0% 95%;
  --popover: 240 6% 8%;
  --popover-foreground: 0 0% 95%;

  /* Accent */
  --primary: 263 70% 58%;             /* #7c3aed — violet */
  --primary-foreground: 0 0% 100%;

  /* Secondary surfaces */
  --secondary: 240 4% 16%;            /* #27272d — table headers, nested surfaces */
  --secondary-foreground: 0 0% 85%;
  --muted: 240 4% 16%;
  --muted-foreground: 240 5% 65%;     /* #a1a1aa — muted text, placeholders */

  /* Accent alias */
  --accent: 263 70% 58%;
  --accent-foreground: 0 0% 100%;

  /* Status colors */
  --destructive: 0 63% 51%;           /* #d13434 — errors, critical */
  --success: 142 71% 45%;             /* #21c55d — success */
  --warning: 38 92% 50%;              /* #f59e0b — warnings */
  --info: 217 91% 60%;                /* #3b82f6 — info */

  /* Chrome */
  --border: 240 4% 16%;
  --input: 240 4% 16%;
  --ring: 263 70% 58%;

  /* Radius */
  --radius: 1rem;                     /* 16px — base radius */
  --radius-lg: 1.75rem;               /* 28px — major cards */
  --radius-sm: 0.5rem;                /* 8px — small elements */
  --radius-pill: 9999px;              /* badges, pills */
}
```

### Design Token Hierarchy

- `--background`: Page bg with optional `radial-gradient(circle at top, hsl(var(--primary) / 0.16), transparent 26%)` overlay
- `--card`: Cards, sidebar, popovers. Key surfaces use 88% opacity + `backdrop-filter: blur(14px)`
- `--secondary`: Table headers, secondary buttons, nested surfaces within cards
- `--primary`: Buttons, active states, focus rings, tab indicators. Used sparingly.
- Status colors: Badges and icon containers use 13% opacity tint of status color

### Key Visual Patterns

- **28px rounded corners** on major cards, **16px** on nested elements, **pill** on badges
- **Subtle backdrop blur** (14px) on sidebar and header surfaces
- **Radial gradient** from primary color at page top
- **Glowing status dots** with `box-shadow: 0 0 20px <color>`
- **Tinted icon containers**: `background: hsl(var(--status-color) / 0.13)`
- **3-tier depth**: background -> card/sidebar -> nested card (using `--background` inside `--card`)
- **Generous padding**: 20px on cards, 16px on nested items

---

## 3. Typography

| Role | Font | Weights | Source |
|------|------|---------|--------|
| UI / Body | Inter | 400, 500, 600, 700 | Google Fonts (variable) |
| Code / Mono | JetBrains Mono | 400, 500, 600 | Google Fonts |

- Base size: 14px
- Scale: 12 / 13 / 14 / 16 / 18 / 20 / 24 / 30 / 36px
- Line heights: 1.4 (body), 1.2 (headings), 1.6 (code)

---

## 4. Animation Strategy

Animate-UI for component-level animations + Framer Motion for page transitions.

| Animation | Library | Behavior |
|-----------|---------|----------|
| Page transitions | Framer Motion | Fade + slide (existing pattern) |
| Dialog open/close | Animate-UI | Scale + fade |
| Tab switching | Animate-UI | Layout animation for indicator |
| Accordion expand | Animate-UI | Height animation |
| Toast enter/exit | Sonner | Slide from bottom |
| Button press | Animate-UI | Subtle scale on tap |
| Card hover | CSS transition | Slight lift + border brighten |
| Skeleton loading | CSS animation | Shimmer |
| Sidebar collapse | Framer Motion | Width animation with content fade |
| Command palette | Animate-UI | Scale + backdrop fade |

All animations respect `prefers-reduced-motion`.

---

## 5. Shared Component Layer

Nine core reusable components that eliminate ~20 duplicate implementations across plugins.

### 5.1 RichTextEditor

Single Tiptap wrapper for all content authoring.

**Props:**
- `content: string` — initial content (Tiptap JSON or markdown)
- `onChange: (content) => void`
- `placeholder?: string`
- `mode: 'full' | 'minimal'`

**Modes:**
- `full`: Floating toolbar, code blocks with syntax highlighting, tables, images, links, topic tags. Used by Nebula (notes).
- `minimal`: Plain text with basic formatting (bold/italic/lists), word count footer. Used by TextCraft (input), Code Review Bot (guidelines editor).

**Shared extensions:** StarterKit, Link, CodeBlock with lowlight highlighting.
**Shared toolbar:** FloatingToolbar as shadcn Popover with Button groups.

**Used by:** Nebula (notes), TextCraft (input), Code Review Bot (guidelines)

### 5.2 ContentRenderer

Single markdown/content output component for all AI-generated and formatted content.

**Props:**
- `content: string` — markdown content
- `format?: 'markdown' | 'raw'`
- `isStreaming?: boolean` — shows skeleton shimmer during streaming
- `actions?: ('copy-raw' | 'copy-md' | 'export-pdf' | 'save-as-note' | 'run-sql')[]`
- `onAction?: (action, context) => void`
- `citationLinks?: { label, onClick }[]`
- `collapsible?: boolean` — detect `##` headers and wrap in Accordion

**Renders:** Headings, bold/italic, code blocks (syntax highlighted + copy button), tables, mermaid diagrams (rendered to SVG), blockquotes, lists, inline code.

**Streaming:** Renders incrementally during AI streaming with skeleton shimmer at the tail.

**Plugin-specific behaviors:**
- `run-sql` action: SQL code blocks get a "Run" button (DB Inspector)
- `citationLinks`: Clickable source references (Cortex Q&A)
- `collapsible`: Sections collapse via Animate-UI Accordion (TextCraft output)
- `save-as-note`: Converts output to Nebula note (TextCraft)

**Used by:** TextCraft (output), DB Inspector (AI Q&A, Optimizer), Cortex (Q&A, Design Doc, HLD), Launchpad (AI Advisor), Code Review Bot (review findings), Nebula (search Q&A)

### 5.3 ChatInterface

Single chat component for all AI conversation interfaces.

**Props:**
- `messages: ChatMessage[]` — `{ role, content, citations?, actions? }`
- `onSend: (message: string) => void`
- `isStreaming?: boolean`
- `placeholder?: string`
- `suggestedQuestions?: string[]`
- `renderActions?: (message) => ReactNode`

**Structure:**
- User messages: right-aligned, primary tint background, 16px rounded
- Assistant messages: left-aligned, Card wrapper, rendered via ContentRenderer
- Typing indicator: 3 animated dots
- Auto-scroll to bottom on new messages
- Suggested questions: shown as clickable chips when chat is empty
- `renderActions` prop: plugin-specific action buttons per message

**Used by:** DB Inspector (Ask AI), Cortex (Q&A), Nebula (Search Q&A), Launchpad (AI Advisor)

### 5.4 DataTable

Single table component for all tabular data display.

**Props:**
- `columns: Column[]` — `{ key, label, render?, sortable?, width? }`
- `data: Record[]`
- `sortable?: boolean`
- `paginated?: boolean` — page size configurable
- `onRowClick?: (row) => void`
- `emptyMessage?: string`
- `virtualScroll?: boolean` — for large datasets (>100 rows)

**Features:**
- Sortable column headers with direction arrows
- Pagination via shadcn Pagination
- Row hover highlighting
- Cell expansion modal for large content (Animate-UI Dialog)
- Virtual scrolling via @tanstack/react-virtual
- Column-level custom rendering via `columns[].render`

**Used by:** DB Inspector (query results, history), Code Review Bot (history), Activity Log, Cortex (API list), Settings (agents table)

### 5.5 HistoryList

Single history component for all historical entry displays.

**Props:**
- `entries: HistoryEntry[]` — `{ id, title, subtitle, timestamp, type?, badge? }`
- `onRestore: (entry) => void`
- `onDelete?: (entry) => void`
- `renderEntry?: (entry) => ReactNode`
- `emptyMessage?: string`
- `filters?: { key, options }[]`

**Structure:** Card list with timestamp, type badge, preview text. Restore and delete action buttons. Optional filters.

**Used by:** DB Inspector (history), Code Review Bot (history), Launchpad (estimation history), TextCraft (history)

### 5.6 PdfExporter

Single PDF generation system replacing all per-plugin PDF logic.

**Renderer-side API:**
- `exportPdf({ content, metadata, format })`
- `content: string` — markdown to render
- `metadata?: { title, author, date, plugin }`
- `format?: 'report' | 'document' | 'diagram'`

**Main-process implementation:**
- Single `pdf-generator.ts` with template presets per format
- Shared header/footer: Zenith branding, timestamp, page numbers
- Markdown -> PDF rendering: headings, tables, code blocks (syntax highlighted), mermaid -> PNG
- Theme-aware: uses token colors for code highlighting

**Formats:**
- `report`: Structured with table of contents, sections, summaries (Cortex HLD, Launchpad cost, DB Optimizer)
- `document`: Clean flowing text (TextCraft output)
- `diagram`: Centered SVG/PNG rendering (DB Inspector ER diagrams)

**Used by:** TextCraft, DB Inspector (ER + Optimizer), Cortex (export), Launchpad (cost report), App (diagnostics)

### 5.7 SearchInput

Single search component for all search contexts.

**Props:**
- `placeholder?: string`
- `onSearch: (query: string) => void`
- `debounceMs?: number` — default 300ms
- `icon?: LucideIcon` — default Search
- `shortcut?: string` — keyboard shortcut hint (e.g., "Cmd+K")

**Used by:** Command palette, Nebula (search), Cortex (code search, graph search), DB Inspector (table search), Launchpad (service catalog)

### 5.8 CodeEditor

Single CodeMirror 6 wrapper for all code editing and viewing contexts. Replaces SqlEditor, CodeViewer, and inline code editing across plugins.

**Props:**
- `value: string` — code content
- `onChange?: (value: string) => void` — omit for read-only mode
- `language: 'sql' | 'typescript' | 'javascript' | 'python' | 'java' | 'json' | 'css' | 'html' | 'markdown' | 'yaml'`
- `readOnly?: boolean` — default false
- `dialect?: 'postgresql' | 'mysql'` — SQL-specific dialect highlighting
- `schemaCompletions?: { tables, columns }` — schema-aware autocomplete (DB Inspector)
- `lineHighlight?: number[]` — highlight specific lines (error indicators, search results)
- `onExecute?: (selection?: string) => void` — Mod+Enter callback (DB Inspector query execution)
- `placeholder?: string`
- `maxHeight?: string` — constrain height with scroll
- `showLineNumbers?: boolean` — default true
- `autoFormat?: boolean` — auto-format on paste (SQL formatter, code formatter)

**Features:**
- CodeMirror 6 with dynamic language extension loading
- Theme: custom dark theme matching zenith-violet palette tokens
- Schema-aware autocomplete for SQL (tables + columns from live connection)
- Keyboard shortcuts: Mod+Enter (execute), Mod+Shift+Enter (execute all), standard editor shortcuts
- Error line decoration (red highlight on line number)
- Variable hover tooltips for `{{varName}}` patterns (DB Inspector)
- Compartment-based live updates (schema changes, language switching)
- Copy button overlay (top-right, for read-only mode)

**Modes:**
- `editable + onExecute`: Full SQL editor with execution (DB Inspector QueryConsole)
- `editable`: Standard code editor (future use)
- `readOnly`: Code viewer with copy button and syntax highlighting (Cortex CodeViewer, ContentRenderer code blocks)

**Used by:** DB Inspector (SQL console — editable+execute), Cortex (code viewer — read-only), Nebula (code block editing), ContentRenderer (code block rendering — read-only), Code Review Bot (diff syntax highlighting)

### 5.9 FileTree

Animated file/folder tree using Animate-UI's Files component as the base, customized for Zenith.

**Props:**
- `nodes: FileTreeNode[]` — `{ name, type: 'file' | 'folder', children?, path, language?, size? }`
- `onSelect: (node: FileTreeNode) => void`
- `selectedPath?: string` — currently selected file
- `searchable?: boolean` — show search input at top
- `defaultExpanded?: string[]` — paths to expand by default (e.g., ['src', 'app', 'lib'])
- `defaultCollapsed?: string[]` — paths to collapse by default (e.g., ['node_modules', '.git', 'dist'])
- `virtualScroll?: boolean` — for large trees (>500 nodes)

**Features:**
- Built on Animate-UI Files component with animated expand/collapse
- File type icons: language-specific icons (TS, JS, Python, Java, JSON, CSS, etc.) via lucide
- Folder open/close animation
- Search/filter input at top (uses SearchInput shared component)
- Active file highlight with primary tint
- Keyboard navigation: arrow keys to navigate, Enter to select, Left/Right to collapse/expand
- Virtual scrolling for large repos via @tanstack/react-virtual
- Auto-expand configured paths on mount
- File size + language indicators on hover (Tooltip)

**Used by:** Cortex (codebase file browser — primary use case), potentially DB Inspector (saved queries tree — future)

---

## 6. Component Migration Map

### 6.1 Glass -> shadcn/Animate-UI Replacements

| Current Glass Component | Replacement | Customizations |
|------------------------|-------------|----------------|
| GlassButton | shadcn Button | 4 variants (default, primary, destructive, ghost). 16px radius. |
| GlassInput | shadcn Input + Label | Card bg, primary ring on focus + 2px shadow |
| GlassCard | shadcn Card | 28px radius (--radius-lg), card bg, 1px border |
| GlassModal | Animate-UI Dialog | Animated open/close, backdrop blur overlay |
| GlassSelect | shadcn Select | Card bg dropdown, keyboard navigation |
| GlassTab | Animate-UI Tabs | Animated indicator bar (layout animation) |
| GlassTable | -> DataTable (shared) | See section 5.4 |
| GlassBadge | shadcn Badge | Pill radius, 13% tinted bg |
| GlassToast | shadcn Sonner | Status-colored, auto-dismiss, stacked |
| GlassSkeleton | shadcn Skeleton | Shimmer animation preserved |
| GlassChat | -> ChatInterface (shared) | See section 5.3 |
| GlassResizeHandle | react-resizable-panels handle | Restyle only |
| GlassSurface | Remove | Use Card or plain div |
| PluginHeader | -> PluginShell (shared) | Card + Animate-UI Tabs |
| ScrollContainer | shadcn ScrollArea | Native scrollbar styling |
| AnimatedIcon | Animate-UI animations | Keep reduced-motion support |
| AnimatedCounter | Keep custom | Restyle with tokens |
| Scene3DWrapper | Remove | No more 3D views |
| SqlEditor | -> CodeEditor (shared) | See section 5.8, editable+execute mode |
| CodeViewer | -> CodeEditor (shared) | See section 5.8, readOnly mode |
| FileTree | -> FileTree (shared) | See section 5.9, Animate-UI Files base |

### 6.2 New Components

| Component | Library | Purpose |
|-----------|---------|---------|
| CommandPalette | shadcn Command | Cmd+K global search |
| Tooltip | shadcn Tooltip | Replace custom glass tooltips |
| DropdownMenu | shadcn DropdownMenu | Context menus, action menus |
| Sheet | Animate-UI Sheet | Drawers for mobile/settings |
| Popover | shadcn Popover | Hover cards, quick actions |
| Progress | shadcn Progress | Analysis/upload progress |
| Accordion | Animate-UI Accordion | Collapsible sections |

---

## 7. Screen-by-Screen Revamp

### 7.1 App Shell (AppLayout + Sidebar)

**Current:** Fixed 56px icon-only sidebar + content area with drag region.

**New:**
- Collapsible sidebar: 56px icon rail <-> 240px expanded with labels
- Toggle: hamburger icon or Cmd+B
- Sidebar bg: card at 88% opacity + 14px backdrop-blur
- Active item: primary at 18% opacity bg + primary/35% border
- Hover: secondary bg
- Logo "Z" badge in primary color at top
- Plugin reordering preserved (drag handles visible in expanded mode)
- Command palette: Cmd+K opens shadcn Command — search plugins, recent activity, settings
- Page transitions: Keep Framer Motion route animations (fade + slight slide)

### 7.2 Dashboard (MissionControl)

**Current:** Hero header, 3D ActivityMesh, StatsCards, TokenChart, HealthPanel, PluginCards.

**New:**
- Radial gradient at page top from primary (as in reference)
- Header card: 28px rounded, backdrop blur, greeting + SearchInput + primary action Button
- Stats cards (4x MetricCard): 24px rounded, status-colored icon containers (13% tint), AnimatedCounter, delta indicators
- Token chart: Keep custom SVG, restyle with theme colors, Card wrapper 28px radius
- Health panel: Card with grouped resources, glowing status dots, StatusBadges
- Activity feed: Card with DataTable or list of nested rows (22px rounded), StatusBadges
- Plugin cards: Grid, 24px rounded, hover lift animation
- REMOVE: ActivityMesh3D -> Replace with recent operations summary

### 7.3 Settings (SettingsLayout)

**Current:** Vertical tab sidebar + dynamic content panel.

**New:**
- Sidebar tabs: Animate-UI vertical Tabs with active indicator
- General Settings: Theme selector grid (single theme + placeholder slots for future). Code highlight theme Select. Working directory picker.
- AI Agents: DataTable (shared) with StatusBadge, Input for API keys, Button for test/remove
- MCP Servers: Card list with Switch toggle, DropdownMenu for actions
- Plugin Settings: Dynamic form with shadcn Input, Select, Textarea, Switch in Accordion sections
- Connection Editor: Card forms with test Button, StatusBadge
- Repo List Editor: Inline editable rows with Add/Remove Buttons

### 7.4 Cortex Plugin

**Current:** 4 tabs (Insights/Code/Ask/Repos), React Flow diagrams, code viewer, Q&A chat.

**New:**
- PluginShell with 4 tabs
- RepoManager: Grid of Cards (24px rounded) with StatusBadge, analyze Button
- AddRepoDialog: Animate-UI Dialog with Input + Select
- InsightsPanel (6 sub-tabs via Animate-UI Tabs):
  - Overview: MetricCards (shared), DonutChart restyled, ContentRenderer (shared) for docs
  - APIs: DataTable (shared) with method Badges
  - Flows: React Flow restyled with theme tokens, Animate-UI Tabs for flow type selector
  - Architecture: Card sections with Badges, React Flow for entity diagram, ContentRenderer for HLD
  - Diagrams: React Flow restyled with theme tokens
  - Graph: 2D force graph only (react-force-graph-2d) restyled. REMOVE MindGraph3D.
- CodePanel: SplitPanel (shared) with FileTree (shared, Animate-UI Files) + CodeEditor (shared, readOnly mode)
- QAPanel: ChatInterface (shared) with citation renderActions
- ExportDialog: Animate-UI Dialog with format options, triggers PdfExporter (shared)

### 7.5 DB Inspector Plugin

**Current:** Split layout, ConnectionManager + SchemaExplorer (left), tabbed content (right).

**New:**
- PluginShell with 5 tabs
- ConnectionManager: Card with Select, connect Button, StatusBadge
- SchemaExplorer: Accordion tree (databases -> schemas -> tables -> columns), Tooltip for types
- QueryConsole: Animate-UI Tabs for query tabs, CodeEditor (shared, editable+execute mode with SQL dialect + schema completions), DataTable (shared) for results
- AskAI: ChatInterface (shared) with run-sql renderActions
- QueryOptimizer: Card with SQL input, ContentRenderer (shared) with mermaid + copy, suggestion Cards
- ERDiagram: Card with SearchInput (shared) for table selector, mode Tabs, Mermaid rendering
- DbHistory: HistoryList (shared)
- REMOVE: SchemaOrb3D

### 7.6 Nebula Plugin

**Current:** 3 tabs (Notes/Search/Knowledge), Tiptap editor, drawing canvas, voice recorder.

**New:**
- PluginShell with 3 tabs
- NoteList: Card sidebar with ScrollArea, pinned section, DropdownMenu for context actions
- NoteEditor: RichTextEditor (shared, full mode), auto-save StatusBadge
- FloatingToolbar: shadcn Popover with formatting Button groups
- DrawingCanvas: Keep tldraw, restyle wrapper Card
- SearchView: SearchInput (shared) + results as Card list + ChatInterface (shared) for Q&A
- KnowledgeGraph: react-force-graph-2d restyled with theme colors. REMOVE KnowledgeGraph3D.
- VoiceRecorder: FAB Button in primary color, recording indicator
- TranscriptionBlock: Card with speaker Badges, editable text
- CodeBlockNodeView: Restyle with theme code colors, copy Button (inherits from ContentRenderer CodeBlock)
- TableControls: Inline shadcn Buttons
- Toasts: shadcn Sonner (global system)
- DeleteConfirmDialog: Animate-UI AlertDialog
- NoteContextMenu: shadcn DropdownMenu
- LinkDialog: Animate-UI Dialog

### 7.7 TextCraft Plugin

**Current:** 3-panel resizable (Input/Controls/Output) + History.

**New:**
- PluginShell with 2 tabs (Refine / History)
- SplitPanel (shared) for 3-panel layout
- InputPanel: Card with RichTextEditor (shared, minimal mode), word count
- ControlsPanel: Card with shadcn ToggleGroup (tones), Select (format), Textarea (instructions), primary Button
- OutputPanel: Card with ContentRenderer (shared, collapsible + copy/export-pdf/save-as-note actions)
- HistoryPanel: HistoryList (shared)

### 7.8 Code Review Bot Plugin

**Current:** Tab layout (Diff/Review/History) with Bitbucket integration.

**New:**
- PluginShell with 3 tabs
- PRList: Card list with PR title, author Badge, file count StatusBadge
- PRDiffView: Keep diff rendering, restyle with theme diff colors (add=success tint, del=destructive tint)
- ReviewPanel: ContentRenderer (shared) for findings with severity StatusBadges
- ReviewHistory: HistoryList (shared)
- SettingsPanel: Form with Input, RichTextEditor (shared, minimal mode for guidelines), Switch

### 7.9 Launchpad Plugin

**Current:** 4 tabs (Estimator/AI Advisor/History/Compare) with service catalog.

**New:**
- PluginShell with 4 tabs
- ProviderSelector: Card buttons with provider brand colors
- ServiceCatalog: SearchInput (shared) + ScrollArea list grouped by category
- ResourceConfigurator: Dynamic form with Input, Select per service
- EstimationSummary: Sticky Card with cost breakdown, PdfExporter (shared) trigger
- AiAdvisor: ChatInterface (shared) with suggestion action renderActions
- EstimationHistory: HistoryList (shared)
- ComparisonView: Side-by-side Cards per provider with DataTable (shared)
- REMOVE: CostTreemap3D -> DataTable or bar comparison

### 7.10 Activity Log

**Current:** Filtered activity list.

**New:** Card wrapper, DataTable (shared) with Select filters (plugin, status), StatusBadges, relative timestamps.

### 7.11 About Page

**Current:** App info, capabilities, author bio, timeline.

**New:** Simplified Card layout, version info, capability Badges, vertical timeline with status dots.

---

## 8. Removals

### 8.1 Components to Delete

| Component | Reason |
|-----------|--------|
| ActivityMesh3D | Replaced by summary list |
| SchemaOrb3D | ER diagram sufficient |
| MindGraph3D | 2D force graph only |
| KnowledgeGraph3D | 2D force graph only |
| CostTreemap3D | DataTable/bar chart |
| Scene3DWrapper | No 3D views |
| All Glass* components (15) | Replaced by shadcn equivalents |
| GlassSurface | Use Card or div |

### 8.2 Dependencies to Remove

| Package | Reason |
|---------|--------|
| three | No 3D views |
| @react-three/fiber | No 3D views |
| @react-three/drei | No 3D views |
| d3-force-3d | Use d3-force (2D) only |

### 8.3 Dependencies to Add

| Package | Purpose |
|---------|---------|
| shadcn/ui components | Core UI library |
| animate-ui components | Animated variants |
| @radix-ui/* | shadcn primitives |
| sonner | Toast notifications |
| cmdk | Command palette |
| tailwind-merge | Class merging for cn() |
| clsx | Conditional classes |

---

## 9. Migration Phases

### Phase 1: Foundation (Sequential)

- Install shadcn/ui + Animate-UI + dependencies
- Configure Tailwind with CSS custom properties
- Create theme file with zenith-violet tokens
- Set up cn() utility (clsx + tailwind-merge)
- Add Inter + JetBrains Mono fonts
- Configure shadcn components.json

### Phase 2: Token Layer (Sequential)

- Generate all shadcn base components customized with tokens:
  Button, Card, Input, Label, Select, Textarea, Switch, Badge, Skeleton,
  ScrollArea, Separator, Tooltip, Progress
- Generate Animate-UI components:
  Dialog, Tabs, Accordion, Sheet, AlertDialog
- Install Sonner for toasts
- Install cmdk for command palette
- Create StatusBadge variant component
- Create MetricCard variant component

### Phase 3: Shared Components (Sequential)

- Build RichTextEditor (Tiptap wrapper with full/minimal modes)
- Build ContentRenderer (markdown + code + mermaid + streaming + actions)
- Build ChatInterface (messages + input + suggestions + streaming)
- Build DataTable (sortable + paginated + virtual scroll + cell expand)
- Build HistoryList (entries + filters + restore/delete)
- Build PdfExporter (unified main-process generator + renderer trigger)
- Build SearchInput (debounced + shortcut hint)
- Build CodeEditor (CodeMirror 6 wrapper with editable/readOnly/execute modes, SQL dialect, schema completions)
- Build FileTree (Animate-UI Files base with search, virtual scroll, language icons, keyboard nav)
- Migrate AppLayout + Sidebar (collapsible, Cmd+B toggle)
- Build PluginShell (header + tabs wrapper)
- Build CommandPalette (Cmd+K, search plugins/activity/settings)
- Migrate global toast system to Sonner
- Migrate MarkdownRenderer -> ContentRenderer

### Phase 4: Screen Migration (10 Parallel Agents)

Each agent independently migrates one screen/plugin:

| Agent | Target | Components to Migrate |
|-------|--------|-----------------------|
| Agent 1 | Dashboard | MissionControl, StatsCards->MetricCard, TokenChart, HealthPanel, ActivityFeed, PluginCard |
| Agent 2 | Settings | SettingsLayout, GeneralSettings, AIAgentsSettings, AgentRow, AddCustomAgentForm, MCPSettings, PluginSettings, ConnectionListEditor, RepoListEditor |
| Agent 3 | Cortex - Insights | InsightsPanel, OverviewTab, APIListTab, FlowsTab, ArchitectureDashboard, DiagramsTab, MindGraphTab, InsightCard, ValidationPanel |
| Agent 4 | Cortex - Code/QA/Repos | RepoManager, RepoCard, AddRepoDialog, CodePanel (uses shared FileTree + CodeEditor), CodeTabs, QAPanel, ExportDialog |
| Agent 5 | DB Inspector - Query | DbInspectorView, ConnectionManager, SchemaExplorer, QueryConsole (uses shared CodeEditor with execute mode), QueryTab, ResultsGrid |
| Agent 6 | DB Inspector - AI/ER | AskAI, QueryOptimizer, ERDiagram, MermaidRenderer, DbHistory, SavedQueriesPanel |
| Agent 7 | Nebula | NebulaView, NoteList, NoteEditor, SearchView, KnowledgeGraph, VoiceRecorder, DrawingCanvas, FloatingToolbar, all dialogs |
| Agent 8 | TextCraft | TextCraftView, InputPanel, ControlsPanel, OutputPanel, HistoryPanel |
| Agent 9 | Code Review Bot | CodeReviewBotView, PRList, PRDiffView, ReviewPanel, ReviewHistory, SettingsPanel |
| Agent 10 | Launchpad + Activity + About | LaunchpadView, all sub-components, ActivityLog, AboutView |

### Phase 5: 3D Removal & Cleanup (Sequential)

- Delete: ActivityMesh3D, SchemaOrb3D, MindGraph3D, KnowledgeGraph3D, CostTreemap3D, Scene3DWrapper
- Delete: All Glass* components (15 files)
- Delete: glass-utils.ts, cortex-theme.ts (migrate any needed constants)
- Remove: three, @react-three/fiber, @react-three/drei, d3-force-3d from package.json
- Remove: old CSS files (hljs-zenith.css -> new theme, flow-styles.css -> inline)
- Clean up: unused imports, dead code

### Phase 6: Polish (Sequential)

- Animate-UI micro-interactions on all interactive elements
- Empty states for every plugin (illustration + description + action)
- Command palette wiring (search all plugins, recent activity, settings navigation)
- Keyboard shortcuts audit (Cmd+K, Cmd+B, Cmd+N, Escape patterns)
- Accessibility audit (focus management, ARIA attributes, reduced motion)
- Responsive audit (sidebar collapse on small screens, panel stacking)
- Performance audit (bundle size check after Three.js removal, lazy loading)

---

## 10. Shared Component Usage Matrix

```
Plugin/Screen          RichText  Content  Chat  DataTable  History  Pdf  Search  Code    File
                       Editor    Renderer  Intf                     Exp  Input   Editor  Tree
--------------------   --------  --------  ----  ---------  -------  ---  ------  ------  ----
Dashboard                                        x                       x (cmd)
Settings                                          x
Cortex - Insights                 x               x                  x
Cortex - Code/QA                  x         x                        x   x       x (ro)  x
DB Inspector - Query                              x                              x (exec)
DB Inspector - AI/ER              x         x     x          x       x   x
Nebula                 x (full)   x         x                             x      x (ro)
TextCraft              x (min)    x                          x       x
Code Review Bot        x (min)    x                          x                   x (ro)
Launchpad                         x         x     x          x       x   x
Activity Log                                      x
About

(ro) = readOnly mode, (exec) = editable + execute mode
```

---

## 11. File Structure (New)

```
src/renderer/src/
  components/
    ui/                          # shadcn + Animate-UI base components
      button.tsx
      card.tsx
      input.tsx
      label.tsx
      select.tsx
      textarea.tsx
      switch.tsx
      badge.tsx
      skeleton.tsx
      scroll-area.tsx
      separator.tsx
      tooltip.tsx
      progress.tsx
      dialog.tsx                 # Animate-UI
      tabs.tsx                   # Animate-UI
      accordion.tsx              # Animate-UI
      sheet.tsx                  # Animate-UI
      alert-dialog.tsx           # Animate-UI
      dropdown-menu.tsx
      popover.tsx
      command.tsx                # cmdk
      sonner.tsx                 # toast
    shared/                      # Cross-plugin reusable components
      rich-text-editor.tsx
      content-renderer.tsx
      chat-interface.tsx
      data-table.tsx
      history-list.tsx
      pdf-exporter.tsx           # renderer trigger
      search-input.tsx
      code-editor.tsx            # CodeMirror 6 wrapper (edit + view)
      file-tree.tsx              # Animate-UI Files based tree
      status-badge.tsx
      metric-card.tsx
      empty-state.tsx
      plugin-shell.tsx
      split-panel.tsx
      command-palette.tsx
    layout/
      app-layout.tsx
      sidebar.tsx
      error-boundary.tsx
    dashboard/                   # (existing, restyled)
    settings/                    # (existing, restyled)
    activity/                    # (existing, restyled)
    about/                       # (existing, restyled)
  plugins/
    cortex/                      # (existing, restyled)
    db-inspector/                # (existing, restyled)
    nebula/                      # (existing, restyled)
    textcraft/                   # (existing, restyled)
    code-review-bot/             # (existing, restyled)
    launchpad/                   # (existing, restyled)
    registry.ts                  # (unchanged)
  lib/
    utils.ts                     # cn() utility
    theme.ts                     # theme tokens + metadata
  assets/
    main.css                     # CSS variables + Tailwind config
    fonts/                       # Inter + JetBrains Mono
```

---

## 12. Success Criteria

- [ ] All 6 plugins fully migrated to shadcn/Animate-UI components
- [ ] All 4 system screens (Dashboard, Settings, Activity, About) migrated
- [ ] 9 shared components built and used across all applicable plugins
- [ ] Zero remaining Glass* component imports
- [ ] Zero Three.js / 3D component imports
- [ ] Command palette (Cmd+K) working across all routes
- [ ] Collapsible sidebar working with Cmd+B toggle
- [ ] Single theme (zenith-violet) applied consistently
- [ ] Theme architecture supports adding new themes via CSS variable blocks
- [ ] All existing functionality preserved (stores, IPC, logic untouched)
- [ ] prefers-reduced-motion respected on all animations
- [ ] Bundle size reduced (Three.js removal should save ~500KB+)
