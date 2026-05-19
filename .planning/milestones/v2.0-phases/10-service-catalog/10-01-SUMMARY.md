---
phase: 10-service-catalog
plan: "01"
subsystem: ui
tags: [catalog, cloud-pricing, aws, gcp, azure, service-equivalences]

# Dependency graph
requires:
  - phase: 09-calculator-store
    provides: calculator store wired to pricing data; memoCache read/write path active
provides:
  - AWS_CATALOG with 8 categories and 34 services (including mlai, analytics, messaging, security)
  - GCP_CATALOG with 8 categories and 34 services (mirroring AWS structure)
  - AZURE_CATALOG with 8 categories and 34 services (mirroring AWS structure)
  - SERVICE_EQUIVALENCES with 25 cross-provider families (up from 11)
affects: [service-catalog-ui, comparison-view, calculator-store, seed-ts]

# Tech tracking
tech-stack:
  added: []
  patterns: ["8-category canonical structure: compute, storage, database, networking, mlai, analytics, messaging, security across all 3 providers"]

key-files:
  created: []
  modified:
    - src/renderer/src/data/cloud-pricing/aws.ts
    - src/renderer/src/data/cloud-pricing/gcp.ts
    - src/renderer/src/data/cloud-pricing/azure.ts
    - src/renderer/src/data/cloud-pricing/equivalences.ts

key-decisions:
  - "eks and fargate stay in Compute (no separate containers category) — AWS, GCP, Azure all use 8 canonical categories"
  - "api-gateway moved from 'serverless' to 'messaging' category in AWS catalog"
  - "azure managed-disk and data-transfer service IDs preserved to avoid breaking existing equivalences"
  - "bedrock and sagemaker both map to vertex-ai for GCP equivalence (different use cases, closest available)"
  - "kinesis and sns both map to pub-sub for GCP (Pub/Sub covers both streaming and notifications)"

patterns-established:
  - "8-category canonical structure: compute, storage, database, networking, mlai, analytics, messaging, security — all 3 providers must mirror this structure"
  - "New service IDs use provider-prefixed kebab-case (azure-nat-gateway, cloud-nat) to avoid cross-provider collision"

requirements-completed: [CAT-01, CAT-02, CAT-04]

# Metrics
duration: 7min
completed: 2026-03-31
---

# Phase 10 Plan 01: Service Catalog Expansion Summary

**Expanded all 3 cloud provider catalogs from ~17 to ~34 services across 8 canonical categories, growing cross-provider equivalences from 11 to 25 families**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-31T00:27:17Z
- **Completed:** 2026-03-31T00:34:28Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Rewrote AWS_CATALOG to 8 categories (compute, storage, database, networking, mlai, analytics, messaging, security) with 34 services; merged eks/fargate into Compute, moved api-gateway to Messaging
- Rewrote GCP_CATALOG and AZURE_CATALOG to match the same 8-category structure with ~34 services each; no separate containers category in any provider
- Expanded SERVICE_EQUIVALENCES from 11 to 25 families covering ML/AI, analytics, messaging, and security service groups

## Task Commits

1. **Task 1: Expand AWS_CATALOG to 8 categories with ~34 services** - `f536ede` (feat)
2. **Task 2: Expand GCP and Azure catalogs to 8 categories each** - `038bf89` (feat)
3. **Task 3: Expand SERVICE_EQUIVALENCES to ~25 families** - `0697d2a` (feat)

## Files Created/Modified
- `src/renderer/src/data/cloud-pricing/aws.ts` - 8 categories, 34 services; removed containers/serverless categories
- `src/renderer/src/data/cloud-pricing/gcp.ts` - 8 categories, 34 services; removed containers/serverless categories
- `src/renderer/src/data/cloud-pricing/azure.ts` - 8 categories, 34 services; removed containers/serverless categories
- `src/renderer/src/data/cloud-pricing/equivalences.ts` - 25 cross-provider service families (14 new added)

## Decisions Made
- eks/fargate (AWS), gke/cloud-run/cloud-run-jobs (GCP), aks/azure-container-instances (Azure) all placed in Compute — no separate containers category per plan spec
- `managed-disk` and `data-transfer` IDs preserved in azure.ts (not renamed to `premium-ssd`/`azure-data-transfer-out`) to avoid breaking existing equivalences in equivalences.ts
- bedrock maps to `vertex-ai` for GCP (closest available managed GenAI service); both sagemaker and bedrock map to vertex-ai intentionally
- kinesis and sns both map to `pub-sub` for GCP (Pub/Sub handles both streaming and notifications use cases)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved azure service IDs to avoid breaking equivalences**
- **Found during:** Task 2 (Azure catalog expansion)
- **Issue:** Plan description listed `azure-data-transfer-out` and `premium-ssd` as keep-existing IDs, but original azure.ts used `data-transfer` and `managed-disk` — renaming would silently break SERVICE_EQUIVALENCES lookups
- **Fix:** Kept original IDs `data-transfer` and `managed-disk` in azure.ts; plan's listed IDs were documentation artifacts not actual rename directives
- **Files modified:** src/renderer/src/data/cloud-pricing/azure.ts
- **Verification:** equivalences.ts reverse lookup for `ebs` and `data-transfer` still resolves correctly
- **Committed in:** 038bf89 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug prevention)
**Impact on plan:** Single fix prevented silent equivalence map breakage. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in unrelated files (AboutView.tsx, MissionControl.tsx, etc.) — out of scope, cataloged as pre-existing; none in catalog files

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 provider catalogs expanded to 8 canonical categories with ~34 services; ready for ServiceCatalog UI (plan 10-02)
- SERVICE_EQUIVALENCES at 25 families; ComparisonView cross-provider lookups will have richer coverage
- DB will re-seed from expanded TS catalogs on next app launch (seed.ts imports these catalogs directly)
- No blockers

---
*Phase: 10-service-catalog*
*Completed: 2026-03-31*

## Self-Check: PASSED

- aws.ts: FOUND
- gcp.ts: FOUND
- azure.ts: FOUND
- equivalences.ts: FOUND
- 10-01-SUMMARY.md: FOUND
- Commit f536ede: FOUND
- Commit 038bf89: FOUND
- Commit 0697d2a: FOUND
