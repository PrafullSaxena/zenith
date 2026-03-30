# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Live, accurate cloud cost estimation with regional pricing and a comprehensive service catalog.
**Current focus:** Phase 7 — Data Foundation (pricing.db, PricingRepository, IPC handlers, credentials)

## Current Position

Phase: 7 — Data Foundation
Plan: —
Status: Roadmap created — ready to begin Phase 7
Last activity: 2026-03-30 — v2.0 roadmap finalized, phases 7-12 written

Progress: [░░░░░░░░░░] 0% (v2.0 milestone)

## Performance Metrics

**v1.0 UI Revamp (completed):**
- Total plans completed: 14
- Average duration: 3 min
- Total execution time: 0.7 hours

**v2.0 Launchpad Enhancement:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

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

### Pending Todos

- Phase 7 plans need to be written (07-01-PLAN.md)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-30
Stopped at: Roadmap created for v2.0, Phase 7 is next
Resume file: .planning/ROADMAP.md (Phase 7 detail section)
