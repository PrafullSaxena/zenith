# Project Roadmap

## Overview

| Phase | Name | Plans | Status | Progress |
|-------|------|-------|--------|----------|
| 1 | Foundation | 5 | In Progress | 1/5 |
| 2 | Mission Control & Activity Log | 4 | Planned | 0/4 |
| 3 | CodeReviewBot Plugin | 6 | Planned | 0/6 |
| 4 | DbInspector Plugin | 5 | Planned | 0/5 |
| 5 | AstroPatch Plugin | 7 | Planned | 0/7 |
| 6 | Polish & Production | 3 | Planned | 0/3 |

## Phase 1: Foundation

**Goal:** Runnable Electron app with secure architecture, sidebar navigation, plugin registration, settings persistence, and AI agent configuration.

**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md -- Scaffold electron-vite project with secure BrowserWindow and typed contextBridge
- [ ] 01-02-PLAN.md -- App shell layout with sidebar navigation, React Router, window state persistence
- [ ] 01-03-PLAN.md -- PluginDefinition type system and compiled-in plugin registry with stub views
- [ ] 01-04-PLAN.md -- Settings persistence via electron-store, IPC handlers, settings UI with auto-save
- [ ] 01-05-PLAN.md -- AI agent configuration table, test connection, per-plugin agent dropdown

## Phase 2: Mission Control & Activity Log

**Goal:** Main dashboard view with activity tracking.

## Phase 3: CodeReviewBot Plugin

**Goal:** Automated PR code review via Bitbucket + AI.

## Phase 4: DbInspector Plugin

**Goal:** Database inspection and query tooling.

## Phase 5: AstroPatch Plugin

**Goal:** Automated patch generation and Jira integration.

## Phase 6: Polish & Production

**Goal:** Production build, auto-updates, distribution.
