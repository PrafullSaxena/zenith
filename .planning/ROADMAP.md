# Project Roadmap

## Overview

| Phase | Name | Plans | Status | Progress |
|-------|------|-------|--------|----------|
| 1 | Foundation | 5 | In Progress | 2/5 |
| 2 | Mission Control & Activity Log | 3 | Planned | 0/3 |
| 3 | CodeReviewBot Plugin | 4 | Planned | 0/4 |
| 4 | DbInspector Plugin | 5 | Planned | 0/5 |
| 5 | AstroPatch Plugin | 7 | 4/4 | Complete   | 2026-03-09 | 6 | Polish & Production | 3 | Planned | 0/3 |
| 7 | Launchpad Plugin | 4 | Complete | 4/4 |
| 8 | Nebula Plugin | 6 | Complete | 6/6 |
| 9 | Nebula UX Polish | 4 | Complete | 4/4 |

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

**Goal:** Database inspection and query tooling.

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

## Phase 6: Polish & Production

**Goal:** Production build, auto-updates, distribution.
