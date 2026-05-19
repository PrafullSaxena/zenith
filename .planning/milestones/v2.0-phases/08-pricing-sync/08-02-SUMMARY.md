---
phase: 08-pricing-sync
plan: "02"
subsystem: pricing-fetchers
tags: [azure, gcp, pricing-sync, cloud-billing, delta-sync, etag]
dependency_graph:
  requires:
    - 07-data-foundation/07-01 (pricing-db, RateRow type)
    - 07-data-foundation/07-02 (pricingRepository.upsertRates, credentials)
  provides:
    - fetchAzurePricing() — paginated Azure Retail Prices with lastModified delta
    - fetchGcpPricing() — GCP Cloud Billing SKU rates with graceful no-key skip and ETag delta
  affects:
    - 08-pricing-sync/08-03 (PricingSync orchestrator imports both fetchers)
tech_stack:
  added: []
  patterns:
    - Azure Retail Prices REST API (no auth, paginated via nextPageLink)
    - GCP Cloud Billing SKU API (API key auth, paginated via nextPageToken)
    - ETag-based delta sync (If-None-Match / 304 Not Modified)
    - lastModified datetime filter for Azure delta
    - Sidecar JSON meta files in app.getPath('userData')
    - Batched upsertRates (500 rows per transaction)
key_files:
  created:
    - src/main/pricing/fetchers/azure-fetcher.ts
    - src/main/pricing/fetchers/gcp-fetcher.ts
  modified: []
decisions:
  - Azure fetcher uses armRegionName in (...) filter to limit response to 12 target regions, reducing bandwidth
  - GCP ETag applied to first page only (ETag applies to full resource listing, not per-page)
  - GCP committed-use pricing left as a TODO stub (requires billing IAM permissions — deferred)
  - No new dependencies added — both fetchers use built-in Node https module
metrics:
  duration: "~2 min"
  completed: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 08 Plan 02: Azure and GCP Pricing Fetchers Summary

Azure and GCP cloud pricing fetchers with paginated REST API calls, provider-specific delta strategies (lastModified filter for Azure, ETag for GCP), graceful no-key skip for GCP, and batched SQLite upserts via PricingRepository.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Azure Retail Prices fetcher with lastModified delta | 3d96c52 | src/main/pricing/fetchers/azure-fetcher.ts |
| 2 | GCP Cloud Billing SKU fetcher with ETag delta and no-key fallback | 9aee8ed | src/main/pricing/fetchers/gcp-fetcher.ts |

## What Was Built

**azure-fetcher.ts:**
- Exports `fetchAzurePricing(): Promise<AzureFetchResult>`
- Covers 12 Azure regions (eastus, eastus2, westus, westus2, westeurope, northeurope, southeastasia, eastasia, japaneast, brazilsouth, canadacentral, australiaeast)
- Pagination via `nextPageLink` — fetches all pages in sequence
- Delta sync: reads `pricing-azure-meta.json` sidecar from `app.getPath('userData')`, appends `lastModified ge datetime'...'` filter on subsequent runs
- Maps `Items[]` to `RateRow` with `service_id: 'azure-vm'`, `rate_key: 'pricePerHour'`
- Upserts in batches of 500 via `pricingRepository.upsertRates()`
- Graceful error handling — returns `{ error: message }` on exception, never throws

**gcp-fetcher.ts:**
- Exports `fetchGcpPricing(): Promise<GcpFetchResult>`
- Covers 12 GCP regions (us-central1, us-east1, us-west1, europe-west1, europe-west4, asia-east1, asia-southeast1, asia-northeast1, southamerica-east1, australia-southeast1, northamerica-northeast1, asia-south1)
- SYNC-05: Early return `{ deltaSkipped: true }` when `CRED_GCP_API_KEY` is absent — no crash, no network
- SYNC-06: ETag delta — sends `If-None-Match` on first page, detects `304 Not Modified`, stores updated ETag in `pricing-gcp-meta.json` sidecar
- SYNC-08: Stub guard for committed-use pricing via `CRED_GCP_BILLING_ACCOUNT_ID` — TODO comment, no actual implementation
- Filters to only "Instance Core" and "Instance Ram" SKUs; maps to `pricePerCoreHour` / `pricePerGbHour` rate keys
- Converts GCP `{ units, nanos }` price format to float

## Requirements Addressed

| Req | Description | Status |
|-----|-------------|--------|
| SYNC-03 | Azure public Retail Prices API (no auth) | Done |
| SYNC-04 | GCP API key for Cloud Billing access | Done |
| SYNC-05 | Graceful skip when no GCP API key configured | Done |
| SYNC-06 | Delta sync — Azure lastModified, GCP ETag | Done |
| SYNC-08 | Committed-use pricing stub | Done (stub) |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] src/main/pricing/fetchers/azure-fetcher.ts exists
- [x] src/main/pricing/fetchers/gcp-fetcher.ts exists
- [x] Commit 3d96c52 exists (azure-fetcher)
- [x] Commit 9aee8ed exists (gcp-fetcher)
- [x] Zero TypeScript errors in fetchers/ directory (pre-existing errors in other files only)
- [x] GCP no-key early return present
- [x] Azure nextPageLink pagination loop present
- [x] Both sidecar meta file implementations present
