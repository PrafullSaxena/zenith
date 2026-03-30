# Zenith

## Current Milestone: v2.0 — Launchpad Enhancement

**Goal:** Transform Launchpad from a static hardcoded cost estimator into a live, data-driven pricing engine with regional pricing, an expanded 100-service catalog, and rich visualizations.

**Target features:**
- Live pricing data via hybrid public sync + optional credentials (AWS/Azure public, GCP API key)
- Regional pricing as first-class input (12 regions per provider)
- Expanded service catalog: ~100 services across 8 categories for all 3 providers
- Rich visualization layer: treemap, donut chart, comparison bars, history trend (Recharts)
- PricingRepository + pricing.db (SQLite) data layer in main process
- Virtualized service catalog list + memoized calculator for performance
- Settings UI: credentials management, sync status badge, region persistence

## What This Is

A Zenith desktop developer toolkit combining a modern UI (shadcn/ui + Animate-UI, completed in v1.0) with a powerful Launchpad cloud cost estimator backed by live pricing data, regional rates, and a comprehensive 100-service catalog across AWS, GCP, and Azure.

## Core Value

**Every plugin must use the same shared component library.** A ChatInterface in Cortex must be identical to one in DB Inspector. A ContentRenderer in TextCraft must work the same in Launchpad. Consistency through reuse, not duplication.

## Requirements

### Validated

<!-- Existing capabilities that must be preserved -->

- ✓ 6 plugins functional: Cortex, CodeReviewBot, DbInspector, Launchpad, Nebula, TextCraft — existing
- ✓ 4 core pages: Dashboard, Activity Log, About, Settings — existing
- ✓ Sidebar with drag-reorder and icon navigation — existing
- ✓ Real-time theme switching via data-theme attribute — existing
- ✓ 13 Zustand stores managing all plugin + system state — existing
- ✓ ~80 IPC channels for main process communication — existing
- ✓ AI streaming via Vercel AI SDK + CLI providers — existing
- ✓ Bitbucket OAuth integration — existing
- ✓ PostgreSQL + MySQL database inspection — existing
- ✓ Tiptap rich text editor in Nebula — existing
- ✓ CodeMirror 6 SQL editor in DB Inspector — existing
- ✓ React Flow diagrams in Cortex — existing
- ✓ Mermaid diagram rendering — existing

### Active

<!-- v2.0 Launchpad Enhancement scope -->

- [ ] PricingRepository class backed by pricing.db (SQLite) in main process
- [ ] PricingSync service: AWS bulk JSON + Azure Retail API (public), GCP API key
- [ ] Delta sync strategy: only fetch changed rates on subsequent syncs
- [ ] Regional pricing: 12 regions per provider stored as first-class rows
- [ ] Calculator refactored to pure function (RateMap input, no hardcoded imports)
- [ ] pricingCache in launchpad-store with lazy rate loading per selected service
- [ ] Expanded catalog: ~100 services across 8 categories, DB-driven
- [ ] Virtualized ServiceCatalog list (@tanstack/react-virtual)
- [ ] In-memory search index for instant catalog filtering
- [ ] Memoized calculator (cache key: serviceId + config hash + region)
- [ ] 6 new IPC channels: getPricing, syncPricing, getSyncStatus, getRegions, saveCredentials, getCatalog
- [ ] Recharts visualization: treemap, donut, comparison bar chart, history trend line
- [ ] Region picker in EstimationSummary header
- [ ] Sync status badge in Launchpad header
- [ ] Settings panel: credentials (masked), sync frequency, default regions

### Out of Scope

- Light mode — dark-only
- Azure EA/MCA pricing — requires portal auth, not API-accessible
- Real-time cloud account import — cost estimation only, not monitoring
- Custom pricing overrides — deferred to v3
- Cost allocation tags — deferred to v3
- All 30+ regions per provider — top 12 covers 95% usage; full sync on demand

## Context

- **Branch:** feature/ui-revamp-air-2
- **Approved spec (v2.0):** docs/superpowers/specs/2026-03-30-launchpad-enhancement-design.md
- **Approved spec (v1.0):** docs/superpowers/specs/2026-03-27-full-ui-revamp-design.md
- **Current stack:** React 19, Tailwind v4, Framer Motion 12, Zustand 5, React Router 7, Electron 39, better-sqlite3, electron-store
- **Existing DBs:** nebula.db (notes + FTS5), cortex.db (cache) — pricing.db will be new
- **Pricing data location:** src/renderer/src/data/cloud-pricing/ (to become seed-only)
- **GCP API note:** Cloud Billing API requires API key even for public prices (free key, user-provided)

## Constraints

- **New dependency:** Recharts (charts), @tanstack/react-virtual (virtualization)
- **No breaking changes:** Existing estimation history, PDF export, AI advisor must continue working
- **Seed fallback:** App must work on first launch without network (seed from hardcoded data)
- **Credentials security:** API keys via safeStorage (same pattern as agent keys)
- **Performance:** Rate lookup < 5ms, catalog render < 16ms, search < 10ms

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| shadcn/ui + Animate-UI over keeping Glass | User wants modern SaaS aesthetic, better community support, future-proof | ✓ Good |
| Dark only, single theme | Reduces scope, architecture supports future themes via CSS vars | ✓ Good |
| Replace all 3D with 2D | Reduces bundle size, improves accessibility, less maintenance | ✓ Good |
| 9 shared components | Eliminates ~15 duplicate implementations across plugins | ✓ Good |
| Violet accent hsl(263 70% 58%) | User approved after visual reference review | ✓ Good |
| Inter + JetBrains Mono | Better readability at small sizes, standard SaaS/dev tool fonts | ✓ Good |
| Bottom-up migration (Approach A) | Foundation → tokens → shared → screens. Low risk, max parallelism | ✓ Good |
| Separate pricing.db | Keeps pricing data isolated from Nebula/Cortex, easier to wipe/reseed | — Pending |
| GCP requires API key | GCP Cloud Billing API returns 403 without auth — free key, user-provided | — Pending |
| Top 12 regions per provider | Covers ~95% of usage, keeps DB size manageable | — Pending |
| Recharts for visualization | Declarative React API, works in Electron renderer, all chart types in one package | — Pending |
| Lazy rate loading | Only load rates for selected services, not full 18k-row table | — Pending |
| Seed from hardcoded on first launch | Zero-network-dependency on first run, sync in background | — Pending |

---
*Last updated: 2026-03-30 after v2.0 milestone start*
