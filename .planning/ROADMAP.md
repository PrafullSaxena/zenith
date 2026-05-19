# Roadmap: Zenith

## Milestones

- ✅ **v1.0 + v2.0 — UI Revamp + Launchpad Enhancement** — Phases 1-13 (shipped 2026-05-20)
- 📋 **v3.0 — Task Groomer Plugin** — Phases 14-20 (planned)

## Phases

<details>
<summary>✅ v1.0 + v2.0 — UI Revamp + Launchpad Enhancement (Phases 1-13) — SHIPPED 2026-05-20</summary>

See full details: `.planning/milestones/v2.0-ROADMAP.md`

- [x] **Phase 1: Foundation** — Install deps, configure theming tokens, fonts, cn() utility (2026-03-27)
- [x] **Phase 2: Token Layer** — All shadcn/Animate-UI base components with zenith-violet theming (2026-03-27)
- [x] **Phase 3: Shared Components** — 9 cross-plugin components, AppLayout, Sidebar, PluginShell, CommandPalette (2026-03-26)
- [x] **Phase 4: Screen Migration** — All 6 plugins + 4 system screens migrated to shared component library (2026-03-30)
- [x] **Phase 5: 3D Removal & Cleanup** — Glass components, Three.js code, old dependencies deleted (2026-05-19)
- [x] **Phase 6: Polish** — Micro-interactions, empty states, command palette, a11y audit (2026-03-30)
- [x] **Phase 7: Data Foundation** — pricing.db, PricingRepository, IPC handlers, credential storage (2026-03-30)
- [x] **Phase 8: Pricing Sync** — AWS/Azure/GCP live sync, delta strategy, push notifications (2026-03-30)
- [x] **Phase 9: Calculator & Store** — Pure calculator, pricingCache, lazy loading, region picker (2026-03-30)
- [x] **Phase 10: Service Catalog** — 100-service DB-driven catalog, virtualized list, search, cross-provider equivalences (2026-03-30)
- [x] **Phase 11: Visualizations** — Recharts treemap, donut, comparison bar, history trend line (2026-03-30)
- [x] **Phase 12: Settings & Polish** — Credentials UI, sync status badge, provider health, region persistence (2026-03-30)
- [x] **Phase 13: CodeReviewBot User Comments** — Inline composer, user comment persistence, AI prompt injection (2026-04-04)

</details>

### 📋 v3.0 — Task Groomer Plugin (Planned)

- [x] **Phase 14: Data Foundation** — SQLite task store, IPC handlers, electron-store for grooming schedule config (completed 2026-05-19)
- [x] **Phase 15: Capture** — Global hotkey registration, popup window, clipboard auto-detect (completed 2026-05-19)
- [x] **Phase 16: Dumpyard View** — Plugin screen, task cards, status transitions, aging indicator (completed 2026-05-19)
- [ ] **Phase 17: Integrations** — Jira, Confluence, Google API clients + credential storage
- [ ] **Phase 18: AI Grooming Engine** — Grooming agent, scheduling, per-task output (priority, evidence, research mini-summary)
- [ ] **Phase 19: Re-groom + Digest** — On-demand re-groom per task, post-grooming digest view
- [ ] **Phase 20: Settings & Polish** — Grooming schedule config, Jira push button, UI polish

## Phase Details

### Phase 14: Data Foundation
**Goal**: The Task Groomer has a persistent task database in the main process, a repository API, and IPC channels wired — app boots and tasks persist across restarts
**Depends on**: Phase 13
**Requirements**: TDATA-01, TDATA-02
**Plans:** 2/2 plans complete
**Success Criteria** (what must be TRUE):
  1. A task captured via any method persists to tasks.db and survives app restart
  2. Task CRUD (create, read, update status, delete) works via IPC from renderer
  3. Grooming schedule preference persists in electron-store

Plans:
- [ ] 14-01-PLAN.md — TaskDatabase class + four taskgroomer:* IPC handlers in main process
- [ ] 14-02-PLAN.md — Preload bridge, ElectronAPI types, plugin registry entry + placeholder view

### Phase 15: Capture
**Goal**: The user can capture a task from anywhere in the app (or OS, via global hotkey) using a lightweight popup; clipboard content is auto-detected and pre-filled
**Depends on**: Phase 14
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-04
**Plans:** 3/3 plans complete
**Success Criteria** (what must be TRUE):
  1. Pressing Cmd/Ctrl+Shift+D from any Zenith screen opens the capture popup within 150ms
  2. Submitting text in the popup creates a task in Dumpyard status and closes the popup
  3. If clipboard contains a URL, Jira ticket ID, or error text, it is auto-pasted into the input on popup open

Plans:
- [ ] 15-01-PLAN.md — Main process: capture-window.ts + globalShortcut hotkey + capture IPC handlers
- [ ] 15-02-PLAN.md — Renderer: CapturePopup component + CSS + /capture route in App.tsx
- [ ] 15-03-PLAN.md — Preload bridge + electron.d.ts types + full compile verification

### Phase 16: Dumpyard View
**Goal**: The Task Groomer plugin screen shows all tasks (ungroomed and groomed) with status controls and stale indicators; users can move tasks through their lifecycle
**Depends on**: Phase 15
**Requirements**: DUMP-01, DUMP-02, DUMP-03, DUMP-04
**Plans:** 3/3 plans complete
**Success Criteria** (what must be TRUE):
  1. The plugin screen shows two sections: Dumpyard (Dump status) and Groomed tasks
  2. Each task card shows: text, status badge, creation time, stale indicator (if 3+ days in Dump)
  3. User can change any task's status via a dropdown or button (Dump / Groomed / Done / Delegated / Aborted)

Plans:
- [ ] 16-01-PLAN.md — Zustand store (task-groomer-store.ts) with IPC wiring, stale detection helpers
- [ ] 16-02-PLAN.md — TaskCard + StatusDropdown components (compact row, colored badge, dropdown)
- [ ] 16-03-PLAN.md — TaskGroomerView (replace placeholder) + TaskSidePanel + human verification

### Phase 17: Integrations
**Goal**: Jira, Confluence, and Google API clients are wired with credential storage; they can be queried from the grooming agent
**Depends on**: Phase 16
**Requirements**: INT-01, INT-02, INT-03, INT-04, TDATA-03
**Plans:** 2/4 plans executed
**Success Criteria** (what must be TRUE):
  1. Jira credentials stored encrypted; calling the Jira client returns issues matching a query string
  2. Confluence client returns page content for a query; credentials stored the same way
  3. Google Search client returns ranked links for a query (API key stored encrypted)
  4. All three clients handle missing credentials gracefully (return empty, not crash)

Plans:
- [ ] 17-01-PLAN.md — Integrations credential store (safeStorage wrappers, key constants)
- [ ] 17-02-PLAN.md — Jira + Confluence API clients (search, direct key lookup, skip sentinel)
- [ ] 17-03-PLAN.md — Web search client (Gemini CLI → Playwright DuckDuckGo fallback)
- [ ] 17-04-PLAN.md — IPC wiring (integrations:* handlers), preload bridge, Settings UI (TaskGroomerSettings)

### Phase 18: AI Grooming Engine
**Goal**: The AI grooming agent processes all Dump tasks, assigns priorities, enriches with evidence from Jira/Confluence/Google, and writes results back to the DB — runs on schedule and on-demand
**Depends on**: Phase 17
**Requirements**: GROOM-01, GROOM-02, GROOM-03, GROOM-04
**Success Criteria** (what must be TRUE):
  1. Running the grooming agent (scheduled or manual) processes all Dump tasks and sets their status to Groomed
  2. Each groomed task has: priority (P1/P2/P3), suggested action (do/delegate/defer/delete), linked Jira ticket (if found), evidence summary
  3. Research-mode tasks (complex/ambiguous) include a mini-summary with relevant links from Google, Confluence, and Jira
  4. Grooming schedule runs at the user-configured time without requiring app focus

### Phase 19: Re-groom + Digest
**Goal**: Users can request a fresh AI analysis on any individual task; after each grooming run a digest view shows all newly groomed tasks in priority order
**Depends on**: Phase 18
**Requirements**: GROOM-05, GROOM-06
**Success Criteria** (what must be TRUE):
  1. A "Re-groom" button on any task triggers fresh AI analysis and updates the task's enrichment data
  2. After each grooming run, a digest view renders all newly groomed tasks sorted by priority with their evidence summaries

### Phase 20: Settings & Polish
**Goal**: Grooming schedule is configurable in Settings; Jira push works via single button; UI is polished and production-ready
**Depends on**: Phase 19
**Requirements**: DATA-02, INT-04
**Success Criteria** (what must be TRUE):
  1. Zenith Settings has a Task Groomer section: configure grooming schedule time, view integration connection status
  2. A "Push to Jira" button on any groomed task creates a Jira ticket and shows a success confirmation

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1-13 (v1.0 + v2.0) | 42/42 | ✅ Complete | 2026-05-20 |
| 14. Data Foundation | 2/2 | Complete    | 2026-05-19 |
| 15. Capture | 0/? | Complete    | 2026-05-19 |
| 16. Dumpyard View | 3/3 | Complete    | 2026-05-19 |
| 17. Integrations | 2/4 | In Progress|  |
| 18. AI Grooming Engine | 0/? | Not started | — |
| 19. Re-groom + Digest | 0/? | Not started | — |
| 20. Settings & Polish | 0/? | Not started | — |

---
*Roadmap updated: 2026-05-20 — Phase 17 planned (4 plans)*
