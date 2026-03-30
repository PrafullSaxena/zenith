---
phase: 09-calculator-store
plan: "01"
subsystem: pricing
tags: [typescript, pricing, calculator, azure, gcp, electron]

# Dependency graph
requires:
  - phase: 08-pricing-sync
    provides: azure-fetcher.ts and gcp-fetcher.ts with AzureFetchResult/GcpFetchResult shapes

provides:
  - pricing-sync.ts with real static imports of fetchAzurePricing and fetchGcpPricing
  - calculator.ts pure function API: calculateTotalCost(selections, RateMap, region) and calculateServiceCost(serviceId, config, ServiceRates, region)
  - RateMap type exported from calculator.ts for launchpad-store consumers

affects: [launchpad-store, EstimationSummary, ComparisonView, 09-calculator-store]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RateMap pattern: DB rates injected into calculator as Record<serviceId, Record<rateKey, number>>"
    - "Hardcoded fallback defaults: rates map empty → falls back to known public pricing constants"
    - "Inline stub replacement: real fetcher imports replace compile-time stubs from wave-1"

key-files:
  created: []
  modified:
    - src/main/pricing/pricing-sync.ts
    - src/renderer/src/data/cloud-pricing/calculator.ts
    - src/renderer/src/stores/launchpad-store.ts
    - src/renderer/src/plugins/launchpad/EstimationSummary.tsx
    - src/renderer/src/plugins/launchpad/ComparisonView.tsx

key-decisions:
  - "calculator.ts keeps SelectOption.pricePerHour as primary price source for compute/db/k8s — rates map is fallback for services that used hardcoded constants"
  - "data-transfer case now uses rates['pricePerGb'] ?? 0.09 (provider-neutral); provider branch on catalog.provider removed"
  - "GCP no-key skip: real GcpFetchResult uses deltaSkipped not a separate skipped field; syncProvider gcp branch updated accordingly"
  - "Callers (launchpad-store, EstimationSummary, ComparisonView) pass empty RateMap {} for now — actual DB rates injected in subsequent phase"

patterns-established:
  - "RateMap injection: serviceId → rateKey → value; empty map produces correct results via hardcoded defaults"
  - "calculator.ts is fully catalog-free: zero imports of aws.ts, gcp.ts, azure.ts, ProviderCatalog"

requirements-completed: [CALC-01]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 09 Plan 01: Calculator Store Summary

**pricing-sync.ts wired to real Azure/GCP fetchers; calculator refactored to RateMap-driven pure function with no ProviderCatalog dependency**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T18:33:23Z
- **Completed:** 2026-03-30T18:38:07Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- pricing-sync.ts now imports fetchAzurePricing and fetchGcpPricing via static imports; inline stubs removed; azure/gcp branches handle error, deltaSkipped, and bytesDownloaded from real fetcher shapes
- calculator.ts public API completely decoupled from ProviderCatalog — new RateMap parameter with hardcoded rate fallbacks preserves all existing math results
- All 14 math helper functions (calcComputeInstance, calcObjectStorage, calcServerlessFunction, calcManagedDatabase, calcCapacityUnits, calcBlockStorage, calcManagedDisk, calcDataTransfer, calcApiGateway, calcCloudRun, calcCosmosDb, calcKubernetesCluster, calcServerlessContainer) preserved unchanged in their internal logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix pricing-sync.ts — replace inline stubs with real fetcher imports** - `36e7723` (feat)
2. **Task 2: Refactor calculator.ts to pure function — RateMap-driven, no catalog param** - `87de309` (feat)

**Plan metadata:** (docs commit - see below)

## Files Created/Modified

- `src/main/pricing/pricing-sync.ts` - Added static imports for fetchAzurePricing and fetchGcpPricing; removed inline stubs; updated azure/gcp branches to handle real result shapes
- `src/renderer/src/data/cloud-pricing/calculator.ts` - Full refactor: RateMap-driven API, ProviderCatalog removed, 14 helpers preserved, data-transfer provider-neutral
- `src/renderer/src/stores/launchpad-store.ts` - Updated all 3 calculateTotalCost call sites to new API (empty RateMap, empty region)
- `src/renderer/src/plugins/launchpad/EstimationSummary.tsx` - Updated calculateTotalCost call; removed getCatalog import
- `src/renderer/src/plugins/launchpad/ComparisonView.tsx` - Updated calculateServiceCost call; removed unused catalog variable

## Decisions Made

- **SelectOption.pricePerHour as primary**: Compute instances, managed DBs, k8s node types, and serverless containers continue to read price directly from embedded SelectOption.pricePerHour — the rates map provides fallback for services that previously used hardcoded numeric constants.
- **GCP skip condition updated**: The old stub returned `{ skipped: true }`, but the real `GcpFetchResult` uses `deltaSkipped`. The gcp branch condition was corrected to `result.deltaSkipped && result.servicesUpdated === 0` — matching the real no-API-key graceful fallback.
- **Callers pass empty RateMap**: launchpad-store and UI components pass `{}` as rates for now. Actual DB rate injection is scoped to a future plan in this phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GCP skip condition updated to match real GcpFetchResult shape**
- **Found during:** Task 1 (pricing-sync.ts stub replacement)
- **Issue:** Old stub returned `{ skipped: true }` but real `GcpFetchResult` does not have a `skipped` field — it uses `deltaSkipped: true` when no API key. The old `if (result.skipped)` check would never fire with the real fetcher.
- **Fix:** Changed gcp branch condition to `if (result.deltaSkipped && result.servicesUpdated === 0)` which matches the real no-key return path.
- **Files modified:** src/main/pricing/pricing-sync.ts
- **Verification:** TypeScript compiles cleanly; grep confirms no stubs remain.
- **Committed in:** 36e7723 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Updated callers of calculateTotalCost/calculateServiceCost**
- **Found during:** Task 2 (calculator.ts refactor)
- **Issue:** launchpad-store.ts, EstimationSummary.tsx, and ComparisonView.tsx all called the old `catalog`-parameter API. TypeScript would fail without updating them.
- **Fix:** Updated all 3 files to new RateMap-based API (empty map + empty region as temporary callers until DB rate injection is added).
- **Files modified:** launchpad-store.ts, EstimationSummary.tsx, ComparisonView.tsx
- **Verification:** TypeScript compiles with zero errors across all files.
- **Committed in:** 87de309 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 missing critical caller update)
**Impact on plan:** Both fixes were required for correctness and compilability. No scope creep.

## Issues Encountered

None — TypeScript compiled cleanly after each change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- pricing-sync.ts is fully wired: Azure and GCP pricing will actually be fetched at runtime
- calculator.ts is ready to receive real DB rates when launchpad-store adds rate loading via IPC
- RateMap type is exported for consumption by future store enhancements
- No blockers

---
*Phase: 09-calculator-store*
*Completed: 2026-03-30*
