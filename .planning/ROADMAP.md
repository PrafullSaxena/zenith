# Project Roadmap

## Overview

| Phase | Name | Plans | Status | Progress |
|-------|------|-------|--------|----------|
| 1 | Foundation | 5 | In Progress | 2/5 |
| 2 | Mission Control & Activity Log | 3 | Planned | 0/3 |
| 3 | CodeReviewBot Plugin | 4 | Planned | 0/4 |
| 4 | DbInspector Plugin | 5 | Planned | 0/5 |
| 5 | AstroPatch Plugin | 7 | Planned | 0/7 |
| 6 | Polish & Production | 3 | Planned | 0/3 |

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

## Phase 6: Polish & Production

**Goal:** Production build, auto-updates, distribution.
