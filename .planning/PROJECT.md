# Zenith

## What This Is

Zenith is a desktop developer toolkit (Electron + React) that combines multiple AI-augmented plugins in a unified app: **Launchpad** (live cloud cost estimation across AWS, GCP, Azure), **CodeReviewBot** (Bitbucket PR review with AI annotations and user comments), **Cortex** (codebase intelligence), **DB Inspector** (PostgreSQL/MySQL), **Nebula** (rich note-taking with Excalidraw drawing), and **TextCraft** (AI writing). Every plugin runs on the same shadcn/ui + Animate-UI component library with zenith-violet theming.

## Core Value

Reduce the friction of common developer workflows through AI-augmented tooling — all in a single, fast, consistent desktop app.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — v1.0 UI Revamp -->

- ✓ Full UI migrated from Glass Design System to shadcn/ui + Animate-UI — v1.0
- ✓ 9 shared cross-plugin components (RichTextEditor, ChatInterface, DataTable, CodeEditor, etc.) — v1.0
- ✓ AppLayout, Sidebar (collapsible, drag-reorder), PluginShell, CommandPalette — v1.0
- ✓ All 6 plugins + 4 system screens migrated to shared component library — v1.0
- ✓ Three.js/Glass legacy removed (3D views deleted, bundle ~500KB smaller) — v1.0

<!-- Shipped and confirmed valuable — v2.0 Launchpad Enhancement -->

- ✓ PricingRepository + pricing.db (SQLite) data layer — v2.0
- ✓ Live pricing sync: AWS bulk JSON + Azure Retail API (public), GCP API key — v2.0
- ✓ Delta sync strategy — v2.0
- ✓ Regional pricing for 12 regions per provider — v2.0
- ✓ 100-service DB-driven catalog with virtualized list and instant filtering — v2.0
- ✓ Recharts visualizations: treemap, donut, comparison bar, history trend — v2.0
- ✓ Cross-provider service equivalences (~25 families) — v2.0
- ✓ Settings UI: credentials (masked), sync status badge, provider health — v2.0
- ✓ CodeReviewBot user comments: inline composer, persistence, AI prompt injection — v2.0

### Active

<!-- v3.0 Task Groomer Plugin scope -->

- [ ] Global hotkey (Cmd/Ctrl+Shift+D) popup for instant task capture
- [ ] Clipboard detection on popup open (URL, Jira ID, error text auto-paste)
- [ ] Dumpyard plugin screen: two-column view (ungroomed + groomed)
- [ ] Task lifecycle: Dump → Groomed → Done / Delegated / Aborted
- [ ] Task aging: stale indicator after 3+ days in Dump
- [ ] AI grooming agent (scheduled + on-demand): priority score, action suggestion, Jira link, evidence summary
- [ ] Research-mode grooming: mini-summary + links from Google, Confluence, Jira for complex tasks
- [ ] Re-groom on demand per task
- [ ] Post-grooming digest view (prioritized task list)
- [ ] Jira integration: read for enrichment, push to Jira via button
- [ ] Confluence integration: read relevant pages as evidence
- [ ] Google Search integration: fetch supporting links for research tasks
- [ ] Task persistence (SQLite) + grooming schedule config in Settings

### Out of Scope

- Light mode — dark-only
- Two-way Jira sync — push-on-click is sufficient for v1 Task Groomer
- Slack as Task Groomer evidence source — deferred to v4
- Push to Google Calendar — deferred to v4
- Custom pricing overrides (Launchpad) — deferred
- Cost allocation tags (Launchpad) — deferred
- Mobile/web access — Electron-first

## Context

- **Branch:** feature/ui-revamp-air-2
- **Shipped specs:** docs/superpowers/specs/2026-03-27-full-ui-revamp-design.md (v1.0), docs/superpowers/specs/2026-03-30-launchpad-enhancement-design.md (v2.0)
- **Stack:** React 19, Tailwind v4, Framer Motion 12, Zustand 5, React Router 7, Electron 39, better-sqlite3, electron-store, Recharts, @tanstack/react-virtual
- **DBs:** nebula.db (notes + FTS5), cortex.db (cache), pricing.db (cloud rates — seeded from TS catalogs, live-synced), tasks.db (Task Groomer — WAL mode, 14-column schema)
- **LOC:** ~62,400 TypeScript (as of v2.0 completion)
- **IPC channels:** ~84 channels covering all plugin ↔ main-process communication (4 taskgroomer:* added in Phase 14)
- **Stores:** 13 Zustand stores (all plugin + system state)

## Constraints

- **No breaking changes:** Estimation history, PDF export, AI advisor must continue working across updates
- **Seed fallback:** App boots on first launch without network (pricing seeded from hardcoded TS data)
- **Credentials security:** API keys via Electron safeStorage
- **Performance:** Rate lookup < 5ms, catalog render < 16ms, search < 10ms

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| shadcn/ui + Animate-UI over Glass | Modern SaaS aesthetic, better community support, future-proof | ✓ Good |
| Dark only, single theme | Reduces scope; CSS vars support future themes | ✓ Good |
| Replace all 3D with 2D | Smaller bundle, better accessibility, less maintenance | ✓ Good |
| 9 shared components | Eliminated ~15 duplicate implementations across plugins | ✓ Good |
| Violet accent hsl(263 70% 58%) | User approved after visual reference review | ✓ Good |
| Inter + JetBrains Mono | Better readability at small sizes, standard dev-tool fonts | ✓ Good |
| Bottom-up migration (Foundation → Tokens → Shared → Screens) | Low risk, max parallelism in execution | ✓ Good |
| Separate pricing.db | Keeps pricing isolated from Nebula/Cortex, easy to wipe/reseed | ✓ Good |
| GCP requires API key | Cloud Billing API returns 403 without auth — free key, user-provided | ✓ Good |
| Top 12 regions per provider | Covers ~95% usage, keeps DB size manageable | ✓ Good |
| Recharts for visualization | Declarative React API, works in Electron renderer, all chart types in one lib | ✓ Good |
| Lazy rate loading per service | Only load rates for selected services — no 18k-row full load | ✓ Good |
| Seed from hardcoded on first launch | Zero network dependency on first run; sync runs in background | ✓ Good |
| Task Groomer as standalone Zenith plugin (v3.0) | Self-contained, consistent with other plugins; hotkey scope is global | ✓ Good |
| tasks.db 14-column schema with nullable grooming metadata from day one | Eliminates migrations when Phase 18 AI agent writes results; all columns present but NULL until groomed | ✓ Good |
| Task interface declared locally in electron.d.ts (not imported from main) | Preserves contextBridge isolation — renderer types live in renderer types | ✓ Good |
| PluginId union extended explicitly as string literal union in plugin.ts | Compiler catches typos at use sites; inferred union from array const is fragile | ✓ Good |

---
*Last updated: 2026-05-20 after Phase 14 (Data Foundation)*
