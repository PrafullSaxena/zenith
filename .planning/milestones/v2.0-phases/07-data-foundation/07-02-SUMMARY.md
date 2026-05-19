---
phase: 07-data-foundation
plan: "02"
subsystem: database
tags: [sqlite, better-sqlite3, electron, ipc, preload, contextBridge, pricing, seed]

# Dependency graph
requires:
  - phase: 07-01
    provides: pricing-db.ts, pricing-repository.ts, credentials.ts — the full data layer this plan wires up
provides:
  - seed.ts — idempotent seeder that populates pricing.db from hardcoded TS catalogs on first launch
  - launchpad:getCatalog IPC handler returning ServiceCategory[] from pricing.db
  - launchpad:getPricing IPC handler returning RateMap for given provider/region/serviceIds
  - launchpad:saveCredentials IPC handler encrypting GCP/AWS credentials via safeStorage
  - window.api.launchpad.getCatalog, getPricing, saveCredentials exposed via contextBridge
  - initPricingDb() + seedPricingDb() called at module load in ipc-handlers.ts
affects:
  - 07-03-sync
  - 07-04-ui
  - all renderer code using window.api.launchpad.*

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Seed pattern: isSeeded() guard + idempotent upsert loop called at module load"
    - "IPC data channel pattern: provider allowlist validation + typed args check before repository call"
    - "Preload typed exposure: each channel gets explicit return type annotation in contextBridge"

key-files:
  created:
    - src/main/pricing/seed.ts
  modified:
    - src/main/ipc-handlers.ts
    - src/preload/index.ts
    - tsconfig.node.json

key-decisions:
  - "tsconfig.node.json extended to include renderer data and types files so seed.ts can import AWS/GCP/Azure catalogs in the main process"
  - "Rate extraction uses pricePerHour from select option objects — the only price property in current catalogs"
  - "Seed region per provider: us-east-1 (AWS), us-central1 (GCP), eastus (Azure)"

patterns-established:
  - "DB-from-TS seed pattern: renderer catalog TS files imported by main process seed.ts; isSeeded() prevents double-write on every app start"

requirements-completed: [DATA-03, IPC-01, IPC-05, IPC-06]

# Metrics
duration: 10min
completed: 2026-03-30
---

# Phase 7 Plan 02: IPC Wiring and Seed Summary

**seed.ts populates pricing.db from hardcoded TS catalogs; three launchpad IPC handlers (getCatalog, getPricing, saveCredentials) registered and exposed via contextBridge**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-30T08:40:00Z
- **Completed:** 2026-03-30T08:49:42Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created seed.ts: idempotent seeder that imports AWS/GCP/Azure TS catalogs, writes regions, services, and pricePerHour rates to pricing.db on first launch; isSeeded() guard prevents double-write on subsequent starts
- Added three new IPC handlers to ipc-handlers.ts: launchpad:getCatalog (returns ServiceCategory[]), launchpad:getPricing (returns RateMap), launchpad:saveCredentials (encrypts GCP/AWS keys via safeStorage); initPricingDb() + seedPricingDb() wired at module load
- Updated preload/index.ts: window.api.launchpad now exposes getCatalog, getPricing, saveCredentials with typed signatures alongside existing exportPdf

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seed.ts — populate pricing.db from hardcoded TS catalogs** - `480165d` (feat)
2. **Task 2: Register launchpad IPC handlers and wire initPricingDb + seedPricingDb into app startup** - `4e91e20` (feat)
3. **Task 3: Expose launchpad IPC channels in preload** - `74d45e3` (feat)

## Files Created/Modified
- `src/main/pricing/seed.ts` - seedPricingDb() iterating all 3 providers; seedProvider() helper with upsertRegion/upsertService/upsertRates
- `src/main/ipc-handlers.ts` - 4 new imports, module-level DB init, 3 new launchpad IPC handlers with validation
- `src/preload/index.ts` - window.api.launchpad extended with getCatalog, getPricing, saveCredentials
- `tsconfig.node.json` - include paths extended to cover renderer data/types files needed by seed.ts

## Decisions Made
- tsconfig.node.json needed to include renderer catalog/type files so the main process compiler can resolve seed.ts imports — added `src/renderer/src/data/cloud-pricing/**/*` and `src/renderer/src/types/launchpad.ts` to the include list (deviation Rule 3 — blocking issue)
- Only `pricePerHour` is extracted from select options because that is the only numeric price property present in all three catalogs
- Module-level initialization (`initPricingDb()` + `seedPricingDb()`) placed after lazy instance declarations to follow the existing pattern in the file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended tsconfig.node.json include paths for renderer data files**
- **Found during:** Task 1 (seed.ts creation)
- **Issue:** seed.ts imports renderer catalog TS files (aws.ts, gcp.ts, azure.ts, types.ts) but tsconfig.node.json only included `src/main/**/*` and `src/preload/**/*` — TypeScript error TS6307 on all catalog imports
- **Fix:** Added `src/renderer/src/data/cloud-pricing/**/*` and `src/renderer/src/types/launchpad.ts` to the include array in tsconfig.node.json
- **Files modified:** tsconfig.node.json
- **Verification:** npx tsc --noEmit --project tsconfig.node.json passes with no errors in seed.ts or pricing files
- **Committed in:** 480165d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for seed.ts to compile. tsconfig.node.json is the correct fix since the catalog data files are pure data with no DOM/renderer dependencies — safe to compile in node context.

## Issues Encountered
None beyond the tsconfig blocking issue described above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- pricing.db is seeded on first launch; window.api.launchpad.getCatalog, getPricing, saveCredentials are all accessible from the renderer without TypeScript errors
- 07-03 (sync) can now assume all three IPC channels and the data layer are ready
- 07-04 (UI) can use window.api.launchpad.getCatalog to build the service catalog and window.api.launchpad.getPricing for rate lookups

---
*Phase: 07-data-foundation*
*Completed: 2026-03-30*

## Self-Check: PASSED

- FOUND: src/main/pricing/seed.ts
- FOUND: src/main/ipc-handlers.ts (launchpad:getCatalog, launchpad:getPricing, launchpad:saveCredentials)
- FOUND: src/preload/index.ts (getCatalog, getPricing, saveCredentials in window.api.launchpad)
- FOUND: tsconfig.node.json (renderer data files included)
- FOUND: Task commits 480165d, 4e91e20, 74d45e3
