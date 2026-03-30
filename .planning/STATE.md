# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Live, accurate cloud cost estimation with regional pricing and a comprehensive service catalog.
**Current focus:** Phase 8 — Pricing Sync (Azure fetcher, GCP fetcher, PricingSync orchestrator)

## Current Position

Phase: 9 — Calculator Store
Plan: 09-02 complete — pricingCache wired into store; lazy IPC rate loading; setRegion instant recalc; region picker in EstimationSummary
Status: Plan 09-02 executed — DB rates connected to calculator; region Select dropdown live
Last activity: 2026-03-30 — 09-02 calculator store integration complete

Progress: [██░░░░░░░░] 8% (v2.0 milestone)

## Performance Metrics

**v1.0 UI Revamp (completed):**
- Total plans completed: 14
- Average duration: 3 min
- Total execution time: 0.7 hours

**v2.0 Launchpad Enhancement:**
- Total plans completed: 5
- Average duration: ~4 min
- Total execution time: ~23 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key decisions for v2.0:

- Separate pricing.db (isolated from nebula.db/cortex.db, easy to wipe/reseed)
- GCP requires free API key (Cloud Billing API returns 403 without auth)
- Top 12 regions per provider synced by default (~95% coverage)
- Recharts for all visualizations (treemap, donut, bar, line)
- Lazy rate loading — only fetch rates for selected services
- Seed from hardcoded TypeScript on first launch (zero-network on first run)
- Delta sync — only changed rates fetched on subsequent syncs
- Memoized calculator (serviceId + config hash + region as cache key)
- @tanstack/react-virtual for ServiceCatalog list virtualization
- [Phase 07-data-foundation]: PricingRepository calls getPricingDb() per method (not constructor) to allow import before init
- [Phase 07-data-foundation]: CloudProvider type defined locally in pricing-repository.ts to maintain main/renderer separation
- [Phase 07-data-foundation]: Dedicated 'zenith-launchpad-credentials' electron-store isolates Launchpad credentials from other plugin credentials
- [Phase 07-data-foundation]: tsconfig.node.json include extended to cover renderer catalog/type files — required for seed.ts to import AWS/GCP/Azure TS catalogs in the main process
- [Phase 07-data-foundation]: Seed region per provider: us-east-1 (AWS), us-central1 (GCP), eastus (Azure)
- [Phase 08-pricing-sync]: Azure armRegionName filter limits API response to 12 target regions; GCP ETag applied to first page only; no new dependencies (built-in Node https)
- [Phase 08-pricing-sync]: AWS delta check uses pricing-aws-meta.json sidecar (userData path) rather than DB column — simpler, no schema migration required
- [Phase 08-pricing-sync]: SYNC-07 Cost Explorer skipped with TODO stub — @aws-sdk/client-pricing not in package.json, no new deps added in this plan
- [Phase 08]: initPricingSync() exported from ipc-handlers.ts and called post-window-creation; onSyncComplete() returns unsubscribe fn (contextBridge-safe pattern)
- [Phase 09-calculator-store]: calculator.ts keeps SelectOption.pricePerHour as primary price for compute/db/k8s — rates RateMap is fallback for services that used hardcoded constants
- [Phase 09-calculator-store]: GCP skip detection updated from result.skipped to result.deltaSkipped && result.servicesUpdated === 0 to match real GcpFetchResult shape
- [Phase 09-calculator-store]: Callers (launchpad-store, EstimationSummary, ComparisonView) pass empty RateMap {} — actual DB rate injection in subsequent plan
- [Phase 09-calculator-store]: index.d.ts extended with full launchpad API surface — was missing despite preload implementation existing since phase 08
- [Phase 09-calculator-store]: Region dropdown uses 12 hardcoded regions per provider — matches the 12 regions seeded and synced by the pricing pipeline

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-30
Stopped at: Completed 09-calculator-store/09-02-PLAN.md
Resume file: Next plan in phase 09-calculator-store
