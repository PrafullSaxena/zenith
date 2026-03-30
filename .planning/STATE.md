# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Live, accurate cloud cost estimation with regional pricing and a comprehensive service catalog.
**Current focus:** Phase 8 — Pricing Sync (Azure fetcher, GCP fetcher, PricingSync orchestrator)

## Current Position

Phase: 12 — Settings Polish
Plan: 12-02 complete — SyncStatusBadge in Launchpad header with per-provider popover
Status: Phase 12 complete — all plans executed (12-01, 12-02)
Last activity: 2026-03-31 — 12-02 settings-polish complete

Progress: [██░░░░░░░░] 9% (v2.0 milestone)

## Performance Metrics

**v1.0 UI Revamp (completed):**
- Total plans completed: 14
- Average duration: 3 min
- Total execution time: 0.7 hours

**v2.0 Launchpad Enhancement:**
- Total plans completed: 7
- Average duration: ~4 min
- Total execution time: ~29 min

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
- [Phase 09-calculator-store]: Composite memoCache key covers all active selections joined with '|' plus region — single Map lookup per getTotalCost invocation
- [Phase 09-calculator-store]: electron.d.ts (renderer-side) takes precedence over preload/index.d.ts for Window.api types — phase-08 API additions must be mirrored in electron.d.ts
- [Phase 10-service-catalog]: 8-category canonical structure (compute, storage, database, networking, mlai, analytics, messaging, security) — all 3 providers mirror this; no separate containers category
- [Phase 10-service-catalog]: azure managed-disk and data-transfer IDs preserved in azure.ts to avoid breaking existing equivalences
- [Phase 10-service-catalog]: bedrock and sagemaker both map to vertex-ai for GCP equivalence; kinesis and sns both map to pub-sub
- [Phase 10-service-catalog]: equivalence table in ComparisonView renders unconditionally — cost comparison cards are conditional on selections
- [Phase 10-service-catalog]: DISPLAY_NAMES in getProviderServiceName covers legacy 'managed-disk' ID to avoid lookup misses
- [Phase 10-02-service-catalog]: getCatalog declared inline in electron.d.ts — main-process types must not be imported from renderer
- [Phase 10-02-service-catalog]: dbCatalog parallel searchIndex string[] enables O(n) in-memory filter — no object traversal per keystroke
- [Phase 10-02-service-catalog]: loadDbCatalog triggered from setProvider and ServiceCatalog useEffect — catalog loads on any provider change regardless of component mount state
- [Phase 11-visualizations]: recharts ^3.8.1 for all chart components; center label as CSS overlay div; enrichedItems join pattern for categoryId propagation
- [Phase 11-02-visualizations]: cheapest-bar Cell highlight via useMemo Map; muted brand colors for non-cheapest bars; _provider metadata keys in trend chart data for tooltip access; connectNulls=false on trend lines shows gaps explicitly
- [Phase 12-settings-polish]: Custom plugin settings panel via pluginId detection in PluginSettings — avoids new SettingsFieldType, keeps LaunchpadSettings self-contained
- [Phase 12-settings-polish]: getCredentialMasked uses unicode bullets + last 4 chars — never sends full secret to renderer; provider staleness threshold = 2x sync frequency
- [Phase 12-settings-polish]: formatRelativeTime extracted to shared utils.ts — single source of truth for SyncStatusBadge and LaunchpadSettings
- [Phase 12-settings-polish]: SyncStatusBadge always rendered regardless of provider selection — sync health visible even before choosing a provider

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-31
Stopped at: Completed 12-settings-polish/12-02-PLAN.md (phase complete)
Resume file: Next phase
