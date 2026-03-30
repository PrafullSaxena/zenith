---
phase: 09-calculator-store
plan: "02"
subsystem: pricing
tags: [typescript, pricing, zustand, region-picker, ipc, electron]

# Dependency graph
requires:
  - phase: 09-01
    provides: calculator.ts pure function API (calculateTotalCost/RateMap), empty-RateMap callers

provides:
  - launchpad-store.ts with pricingCache state, loadRatesForService (lazy IPC), setRegion (instant recalc, persisted), refreshPricingCache, syncComplete listener integration
  - EstimationSummary.tsx region Select dropdown — 12 regions per provider, instant cost recalc
  - LaunchpadView.tsx onSyncComplete registration

affects: [launchpad-store, EstimationSummary, LaunchpadView, index.d.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy rate loading: loadRatesForService called from addService; merges per-service rates into shared cache"
    - "Module-level memoCache (Map) + stableHash for request dedup: same serviceId+config+region reuses result"
    - "Instant region recalc: setRegion updates cache.region only, clears memo, no IPC — calculateTotalCost is pure"
    - "Region persistence: settings.get/set launchpad.defaultRegion.{provider} on setProvider/setRegion"
    - "syncComplete push listener: onSyncComplete → refreshPricingCache invalidates and re-fetches all selected service rates"
    - "Pricing unavailable fallback: per-service check pricingCache.rates[serviceId] before rendering cost"

key-files:
  created: []
  modified:
    - src/renderer/src/stores/launchpad-store.ts
    - src/renderer/src/plugins/launchpad/EstimationSummary.tsx
    - src/renderer/src/plugins/launchpad/LaunchpadView.tsx
    - src/preload/index.d.ts

key-decisions:
  - "index.d.ts extended with full launchpad API surface (getPricing, onSyncComplete, syncPricing, getSyncStatus, saveCredentials, getRegions) — was missing despite preload implementation existing since phase 08"
  - "calculateTotalCost called directly in EstimationSummary component for full result.items (line items display) — acceptable because it is a pure function; store getTotalCost returns only totals"
  - "Region dropdown renders 12 hardcoded regions per provider — matches the 12 regions seeded and synced by the pricing pipeline"
  - "pricingCache.rates merges per-service on loadRatesForService (not replace) — preserves rates for other services already loaded"

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 09 Plan 02: Calculator Store Summary

**pricingCache wired into launchpad-store with lazy IPC rate loading, instant setRegion recalc, syncComplete listener, and region Select dropdown in EstimationSummary**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T18:40:57Z
- **Completed:** 2026-03-30T18:45:22Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- launchpad-store: PricingCache interface added to store with `rates/region/lastFetched/status`; `loadRatesForService` lazy-fetches IPC rates on first service add, merges into shared cache; `setRegion` updates region instantly (no IPC), persists via settings, clears memo cache; `refreshPricingCache` re-fetches all selected service rates (used by syncComplete); `getTotalCost` now reads real DB rates from pricingCache
- Module-level `memoCache` Map + `stableHash` utility prevents duplicate IPC calls for same serviceId+config+region
- `setProvider` extended to load persisted region from `settings.get('launchpad.defaultRegion.{provider}')` on provider selection
- EstimationSummary: region Select dropdown added to header with 36 region options (12 per provider: AWS/GCP/Azure); changing region calls `setRegion` — instant recalc, no spinner; `calculateTotalCost` called in-component for full line items; "Pricing unavailable" shown per-service when `pricingCache.rates` is null
- LaunchpadView: `useEffect` registers `window.api.launchpad.onSyncComplete` → `refreshPricingCache` on mount, returns unsubscribe cleanup

## Task Commits

Each task was committed atomically:

1. **Task 1: Update launchpad-store — pricingCache, lazy loading, memoization, setRegion, syncComplete** - `2df53b9` (feat)
2. **Task 2: Add region picker to EstimationSummary + wire syncComplete listener in LaunchpadView** - `cdd5882` (feat)

## Files Created/Modified

- `src/renderer/src/stores/launchpad-store.ts` - Added PricingCache interface, pricingCache state, loadRatesForService, setRegion, refreshPricingCache; updated getTotalCost, saveEstimation, exportPdf to use pricingCache; addService triggers loadRatesForService; setProvider loads persisted region
- `src/renderer/src/plugins/launchpad/EstimationSummary.tsx` - Added region Select dropdown with REGION_OPTIONS (12×3 provider regions); pricingCache-driven cost display; "Pricing unavailable" fallback; removed direct empty-RateMap calculateTotalCost call
- `src/renderer/src/plugins/launchpad/LaunchpadView.tsx` - Added refreshPricingCache selector; new useEffect registers onSyncComplete listener with cleanup
- `src/preload/index.d.ts` - Added full launchpad API type declarations: getPricing, onSyncComplete, syncPricing, getSyncStatus, saveCredentials, getRegions

## Decisions Made

- **index.d.ts was missing launchpad API types**: The preload implementation had all 6 new methods since phase 08, but the type declaration file only declared `exportPdf`. This caused TypeScript to reject `window.api.launchpad.getPricing` etc. Fixed as Rule 3 (blocking issue).
- **calculateTotalCost in component**: For line items display, `calculateTotalCost` is called directly in `EstimationSummary` using `pricingCache` from the store. This is intentional — it's a pure function and the store's `getTotalCost` only returns totals.
- **Hardcoded 12-region lists**: Region options match the 12 regions the pricing pipeline seeds/syncs per provider. No dynamic fetching needed for the dropdown.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing launchpad API types to index.d.ts**
- **Found during:** Task 1 (implementing loadRatesForService using window.api.launchpad.getPricing)
- **Issue:** `src/preload/index.d.ts` declared `launchpad` with only `exportPdf`. All new phase-08 methods (getPricing, onSyncComplete, syncPricing, getSyncStatus, saveCredentials, getRegions) were implemented in preload/index.ts but never added to the type declarations. TypeScript would reject all new store IPC calls.
- **Fix:** Added complete type declarations for all 6 missing launchpad methods, matching exact signatures from preload/index.ts.
- **Files modified:** src/preload/index.d.ts
- **Committed in:** 2df53b9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking type declaration gap)
**Impact on plan:** Required fix — zero errors would not have been achievable without it.

## Issues Encountered

None beyond the type declaration gap — TypeScript compiled cleanly after each change.

## User Setup Required

None.

## Next Phase Readiness

- launchpad-store is fully wired: rates loaded from pricing.db via IPC on first service add; region changes are instant; sync events trigger cache refresh
- EstimationSummary shows live regional pricing when rates are available, gracefully falls back to "Pricing unavailable" during loading
- All requirements REGION-02 through REGION-05 and CALC-02 through CALC-06 satisfied
- No blockers

---
*Phase: 09-calculator-store*
*Completed: 2026-03-30*
