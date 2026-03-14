# Project Roadmap

## Overview

| Phase | Name | Plans | Status | Progress |
|-------|------|-------|--------|----------|
| 1 | Foundation | 5 | In Progress | 2/5 |
| 2 | Mission Control & Activity Log | 3 | Planned | 0/3 |
| 3 | CodeReviewBot Plugin | 4 | 4/4 | Complete   | 2026-03-13 | 4 | DbInspector Plugin | 4 | Planned | 0/4 |
| 5 | AstroPatch Plugin | 7 | 4/4 | Complete   | 2026-03-09 | 6 | Polish & Production | 3 | Planned | 0/3 |
| 7 | Launchpad Plugin | 4 | Complete | 4/4 |
| 8 | Nebula Plugin | 6 | Complete | 6/6 |
| 9 | Nebula UX Polish | 4 | Complete | 4/4 |
| 10 | Settings UX Fix | 3 | Complete | 3/3 |
| 11 | 3/3 | Complete    | 2026-03-10 | 0/3 |
| 12 | TextCraft Plugin | 2 | Complete | 2/2 |
| 13 | CodebaseAnalyzer Plugin | 6 | In Progress | 1/6 |

## Phase 1: Foundation

**Goal:** Runnable Electron app with secure architecture, sidebar navigation, plugin registration, settings persistence, and AI agent configuration.

**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md -- Scaffold electron-vite project with secure BrowserWindow and typed contextBridge
- [ ] 01-02-PLAN.md -- App shell layout with sidebar navigation, React Router, window state persistence
- [x] 01-03-PLAN.md -- PluginDefinition type system and compiled-in plugin registry with stub views
- [ ] 01-04-PLAN.md -- Settings persistence via electron-store, IPC handlers, settings UI with auto-save
- [ ] 01-05-PLAN.md -- AI agent configuration table, test connection, per-plugin agent dropdown

## Phase 2: Mission Control & Activity Log

**Goal:** Mission Control dashboard as default landing view with responsive plugin summary cards, quick-action navigation, live activity feed, and a dedicated activity log with filtering.

**Requirements:** [DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, ACTV-01, ACTV-02, ACTV-03]

**Plans:** 3 plans

Plans:
- [ ] 02-01-PLAN.md -- Activity types and Zustand store with IPC persistence (data layer)
- [ ] 02-02-PLAN.md -- Dashboard UI components: MissionControl, PluginCard, ActivityFeed, StatusBadge
- [ ] 02-03-PLAN.md -- Routing wiring, sidebar icons, dedicated ActivityLog view, default view update

## Phase 3: CodeReviewBot Plugin

**Goal:** Working CodeReviewBot plugin: connect to Bitbucket via OAuth, browse PRs, view diffs, stream AI code review, post inline comments back to Bitbucket, and persist review history.

**Requirements:** [CRVW-01, CRVW-02, CRVW-03, CRVW-04, CRVW-05, CRVW-06, CRVW-07, CRVW-08]

**Plans:** 4 plans

Plans:
- [ ] 03-01-PLAN.md -- Install deps, Bitbucket OAuth flow, API client, token manager (main process)
- [ ] 03-02-PLAN.md -- AI streaming infrastructure with Vercel AI SDK and provider factory (main process)
- [ ] 03-03-PLAN.md -- IPC handlers, preload bridge, renderer types, review Zustand store
- [ ] 03-04-PLAN.md -- CodeReviewBot UI: PR list, diff viewer, review panel, history, registry swap

## Phase 4: DbInspector Plugin

**Goal:** Full SQL query console for the DbInspector plugin — CodeMirror 6 editor with schema-aware autocomplete, multi-tab management, query execution with results grid, MySQL support, saved queries, CSV/JSON export, and session persistence.

**Requirements:** [DBIS-01, DBIS-02, DBIS-03, DBIS-04, DBIS-05, DBIS-06, DBIS-07, DBIS-08, DBIS-09]

**Plans:** 4/4 plans complete

Plans:
- [ ] 04-01-PLAN.md -- MySQL driver, unified DB manager, query console types, new IPC handlers
- [ ] 04-02-PLAN.md -- CodeMirror 6 SQL editor, query tab management, execution store actions
- [ ] 04-03-PLAN.md -- Results grid with virtual scroll, export, saved queries panel
- [ ] 04-04-PLAN.md -- Wire query console into DbInspectorView, schema browser enhancements, visual verification

## Phase 5: AstroPatch Plugin

**Goal:** Automated patch generation and Jira integration.

## Phase 7: Launchpad Plugin

**Goal:** Cloud cost estimation plugin: select AWS/GCP/Azure, configure services and resources, calculate monthly/yearly costs, chat with AI for recommendations, and export estimation reports.

**Requirements:** [LNCH-01, LNCH-02, LNCH-03, LNCH-04, LNCH-05, LNCH-06, LNCH-07, LNCH-08, LNCH-09, LNCH-10]

**Plans:** 4/4 plans complete

Plans:
- [x] 07-01-PLAN.md -- Types, pricing catalogs (AWS/GCP/Azure), cost calculator, service equivalence map
- [x] 07-02-PLAN.md -- Zustand store, plugin registration, PDF generator + IPC handler + preload bridge
- [x] 07-03-PLAN.md -- Core estimator UI: LaunchpadView, ProviderSelector, ServiceCatalog, ResourceConfigurator, EstimationSummary
- [x] 07-04-PLAN.md -- AI Advisor, Estimation History, Comparison View, and visual verification

## Phase 8: Nebula Plugin

**Goal:** Notes & knowledge management plugin: minimal rich-text editor with tldraw drawings, local disk storage, AI-powered summarization, knowledge graph with note connections, natural-language search/Q&A over notes, voice recording with speaker-diarized transcription, and transcription-to-knowledge pipeline.

**Requirements:** [NEBL-01, NEBL-02, NEBL-03, NEBL-04, NEBL-05, NEBL-06, NEBL-07, NEBL-08, NEBL-09, NEBL-10, NEBL-11, NEBL-12]

**Plans:** 6/6 plans complete

Plans:
- [x] 08-01-PLAN.md -- Install deps, Nebula types, SQLite database manager with FTS5, note file storage
- [x] 08-02-PLAN.md -- Plugin registration, Zustand store, NebulaView 3-tab layout shell
- [x] 08-03-PLAN.md -- IPC handlers, preload bridge, Tiptap note editor, tldraw drawing canvas, note list CRUD
- [x] 08-04-PLAN.md -- AI summarization pipeline, knowledge graph edge inference, force-directed graph visualization
- [x] 08-05-PLAN.md -- Voice recording (MediaRecorder), OpenAI transcription with diarization, transcription-to-knowledge pipeline
- [x] 08-06-PLAN.md -- FTS5 search with highlights, AI Q&A over notes, visual verification checkpoint

## Phase 9: Nebula UX Polish

**Goal:** Improve the UX of the Nebula Notes section — enhance text notes editor, drawing canvas, and voice notes experience with better interactions, visual feedback, and usability refinements.

**Requirements:** [NEBL-01, NEBL-02, NEBL-03, NEBL-06, NEBL-07, NEBL-08]

**Plans:** 4/4 plans complete

Plans:
- [x] 09-01-PLAN.md -- Install deps, extend types/schema/IPC for pinning, content preview, and audio storage
- [x] 09-02-PLAN.md -- Rewrite NoteEditor with floating toolbar, inline title, tables, images, metadata, tags
- [x] 09-03-PLAN.md -- Split-view layout (flexbox), rewrite NoteList with pinning and context menus
- [x] 09-04-PLAN.md -- Voice FAB, transcription block with speaker labels, toast notifications, bug fixes

## Phase 10: Settings UX Fix

**Goal:** Unify the Settings UI with consistent design tokens — standardize all button radii, toggle switches, input focus styles, form containers, empty states, hover patterns, badges, and table rows across SettingsLayout, GeneralSettings, AIAgentsSettings, AgentRow, MCPSettings, AddCustomAgentForm, ConnectionListEditor, RepoListEditor, and PluginSettings. Visual-only — no logic changes.

**Plans:** 3/3 plans complete

Plans:
- [x] 10-01-PLAN.md -- Unify SettingsField.tsx design tokens (inputs, selects, toggle, buttons, password icon)
- [x] 10-02-PLAN.md -- Unify MCPSettings, AgentRow, AIAgentsSettings, AddCustomAgentForm styles
- [x] 10-03-PLAN.md -- Unify ConnectionListEditor, RepoListEditor, SettingsLayout, GeneralSettings, PluginSettings styles

## Phase 11: Full UI/UX Revamp

**Goal:** Comprehensive UI/UX overhaul across every screen — fix low text-to-background contrast, add purpose-driven color semantics (green/red for code diffs, status indicators, severity colors), introduce micro-interactions and entrance animations, and ensure every screen visually communicates its purpose. Covers Dashboard, CodeReviewBot, DbInspector, Launchpad, Nebula, Settings, Activity Log, About, sidebar, and stub plugins. Visual/animation only — no logic changes.

**Requirements:** [SHELL-07]

**Plans:** 3/3 plans complete

Plans:
- [ ] 11-01-PLAN.md -- Add semantic color tokens to CSS theme and fix broken Launchpad token references
- [ ] 11-02-PLAN.md -- Fix WCAG AA contrast violations and migrate to semantic colors across all views
- [ ] 11-03-PLAN.md -- Add entrance animations, stagger effects, and hover micro-interactions

## Phase 12: TextCraft Plugin

**Goal:** AI-powered text refinement plugin: three-panel layout with input editor, tone/style controls, and AI-rewritten output. Supports email, one-pager, and technical writing use cases with grammar correction, tone adjustment, and format transformation via configured AI agents.

**Requirements:** [TXCR-01, TXCR-02, TXCR-03, TXCR-04, TXCR-05, TXCR-06, TXCR-07, TXCR-08, TXCR-09, TXCR-10]

**Plans:** 2/2 plans complete

Plans:
- [x] 12-01-PLAN.md -- TextCraft types, Zustand store with AI streaming, plugin registration, sidebar icon
- [x] 12-02-PLAN.md -- Three-panel UI: InputPanel, ControlsPanel, OutputPanel with streaming and copy-to-clipboard

## Phase 13: CodebaseAnalyzer Plugin

**Goal:** Codebase analysis and documentation plugin — add repos with branch selection, auto-detect repo type (BE/FE/DE), generate cached documentation, visualize code flows interactively, browse code files, query codebase in plain English, export docs (MD/PDF/TXT), and extract HLD with Mermaid diagrams. BE repos get controller/API flow mapping, DE repos get trigger script mapping, FE repos get component tree visualization.

**Requirements:** [CBAN-01, CBAN-02, CBAN-03, CBAN-04, CBAN-05, CBAN-06, CBAN-07, CBAN-08, CBAN-09, CBAN-10, CBAN-11, CBAN-12, CBAN-13, CBAN-14]

**Plans:** 6 plans

Plans:
- [x] 13-01-PLAN.md -- Foundation: types, SQLite cache DB, git service, repo detector, plugin registration, IPC bridge, Zustand store
- [ ] 13-02-PLAN.md -- Analysis engine: TS/Java/Python parsers, FE component tree, DE pipeline detection, call graph builder
- [x] 13-03-PLAN.md -- Core UI: CodebaseAnalyzerView shell, repo management, insights layout with Overview + API list tabs
- [ ] 13-04-PLAN.md -- Flow visualization: React Flow interactive diagrams with custom nodes/edges, dagre auto-layout, entrance animations
- [ ] 13-05-PLAN.md -- Code section: file tree browser, CodeMirror code viewer with tabs, AI-powered natural language Q&A
- [ ] 13-06-PLAN.md -- Export and polish: HLD generation with Mermaid diagrams, MD/PDF/TXT export, animations, skeleton loaders, error handling

## Phase 6: Polish & Production

**Goal:** Production build, auto-updates, distribution.
