# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Live, accurate cloud cost estimation with regional pricing and a comprehensive service catalog.
**Current focus:** Phase 7 — Data Foundation (pricing.db, PricingRepository, IPC handlers, credentials)

## Current Position

Phase: 7 — Data Foundation
Plan: 07-01 complete — ready for 07-02
Status: Plan 07-01 executed — pricing-db.ts, pricing-repository.ts, credentials.ts created
Last activity: 2026-03-30 — 07-01 data foundation layer complete

Progress: [█░░░░░░░░░] 5% (v2.0 milestone)

## Performance Metrics

**v1.0 UI Revamp (completed):**
- Total plans completed: 14
- Average duration: 3 min
- Total execution time: 0.7 hours

**v2.0 Launchpad Enhancement:**
- Total plans completed: 1
- Average duration: 2 min
- Total execution time: ~2 min

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

### Pending Todos

- Call initPricingDb() in main/index.ts app startup (handled in 07-02)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-30
Stopped at: Completed 07-data-foundation/07-01-PLAN.md
Resume file: .planning/phases/07-data-foundation/07-02-PLAN.md
