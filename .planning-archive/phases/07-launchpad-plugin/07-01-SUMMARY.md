---
phase: 07-launchpad-plugin
plan: 01
subsystem: data-foundation
tags: [typescript, cloud-pricing, aws, gcp, azure, cost-calculator, data-model]
dependency_graph:
  requires: []
  provides:
    - launchpad-types
    - aws-pricing-catalog
    - gcp-pricing-catalog
    - azure-pricing-catalog
    - cost-calculator-engine
    - service-equivalence-map
  affects:
    - 07-02-PLAN.md (Zustand store and IPC)
    - 07-03-PLAN.md (UI components)
    - 07-04-PLAN.md (PDF export and plugin registration)
tech_stack:
  added: []
  patterns:
    - Static curated pricing data as TypeScript modules (no runtime API calls)
    - try/catch wrapping on all calculator functions (never throws)
    - HOURS_PER_MONTH = 730 shared constant (no magic numbers)
key_files:
  created:
    - src/renderer/src/types/launchpad.ts
    - src/renderer/src/data/cloud-pricing/types.ts
    - src/renderer/src/data/cloud-pricing/aws.ts
    - src/renderer/src/data/cloud-pricing/gcp.ts
    - src/renderer/src/data/cloud-pricing/azure.ts
    - src/renderer/src/data/cloud-pricing/index.ts
    - src/renderer/src/data/cloud-pricing/calculator.ts
    - src/renderer/src/data/cloud-pricing/equivalences.ts
  modified: []
decisions:
  - "Static curated pricing embedded as TypeScript constants (not live API calls) — avoids AWS 300MB+ bulk JSON, GCP auth requirements, and network dependencies"
  - "HOURS_PER_MONTH = 730 exported from calculator.ts as single source of truth"
  - "Calculator dispatches by serviceId string switch (not catalog.provider) — cleaner dispatch, same serviceId is always unique per provider"
  - "pricePerHour encoded on SelectOption for compute tiers — avoids parallel lookup arrays and keeps pricing co-located with display label"
  - "Azure Premium SSD and Azure SQL stored as pricePerHour = monthlyPrice/730 for uniform calculation path"
metrics:
  duration: 5min
  completed: 2026-03-09
  tasks_completed: 2
  files_created: 8
  files_modified: 0
requirements:
  - LNCH-01
  - LNCH-02
  - LNCH-03
  - LNCH-04
  - LNCH-10
---

# Phase 07 Plan 01: Launchpad Data Foundation Summary

**One-liner:** TypeScript type system, curated AWS/GCP/Azure pricing catalogs (5 categories each), pure-arithmetic cost calculator, and 9-pair cross-provider equivalence map.

## What Was Built

Complete data foundation for the Launchpad cloud cost estimator plugin. No UI yet — this plan establishes all the types, pricing data, and calculation logic that every other component in the plugin depends on.

### src/renderer/src/types/launchpad.ts

Full TypeScript type system for the plugin:
- `CloudProvider = 'aws' | 'gcp' | 'azure'`
- `ServiceDefinition`, `ServiceCategory`, `ProviderCatalog` — catalog shape
- `ConfigField`, `ConfigSchema`, `SelectOption` — form/config schema types
- `ResourceConfig`, `ServiceSelection` — user configuration
- `ServiceCostResult`, `CostLineItem` — calculation output
- `EstimationEntry`, `EstimationExport` — history and PDF export
- `AiAdvisorSession`, `AiSuggestion` — AI advisor chat
- `LaunchpadTab` — tab navigation

### src/renderer/src/data/cloud-pricing/aws.ts

`AWS_CATALOG` with 5 categories and 9 services. Pricing as of 2026-01 (us-east-1):
- **Compute:** EC2 (8 instance types: t3.micro to c5.xlarge), Lambda
- **Storage:** S3 Standard, EBS gp3
- **Database:** RDS (db.t3.micro/small/m5.large, multi-AZ option), DynamoDB
- **Networking:** Data Transfer Out, CloudFront
- **Serverless:** API Gateway

### src/renderer/src/data/cloud-pricing/gcp.ts

`GCP_CATALOG` with 5 categories and 9 services. Pricing as of 2026-01 (us-central1):
- **Compute:** Compute Engine (6 machine types: e2-standard-2 to c2-standard-8), Cloud Functions
- **Storage:** Cloud Storage Standard, Persistent Disk SSD
- **Database:** Cloud SQL (3 tiers, HA option), Firestore
- **Networking:** Data Transfer Out, Cloud CDN
- **Serverless:** Cloud Run

### src/renderer/src/data/cloud-pricing/azure.ts

`AZURE_CATALOG` with 5 categories and 9 services. Pricing as of 2026-01 (East US):
- **Compute:** Azure VM (6 sizes: B2s to F2s_v2), Azure Functions
- **Storage:** Blob Storage Hot, Premium SSD Managed Disk (P10-P40 tiers)
- **Database:** Azure SQL (S1-P1 DTU tiers), Cosmos DB (RU/s provisioned)
- **Networking:** Data Transfer Out, Azure CDN
- **Serverless:** App Service (B1-P2v3 tiers)

### src/renderer/src/data/cloud-pricing/index.ts

Central re-export hub with `getCatalog(provider)` helper and `PROVIDER_INFO` display metadata (names, icons, brand colors).

### src/renderer/src/data/cloud-pricing/calculator.ts

Pure TypeScript cost calculation engine:
- `HOURS_PER_MONTH = 730` — single shared constant, no magic numbers anywhere
- `calculateServiceCost(serviceId, config, catalog)` — dispatches to 9 calculation strategies covering all 20+ service types across all 3 providers
- `calculateTotalCost(selections, catalog)` — sums multi-service estimates with per-service breakdown
- All logic wrapped in try/catch — never throws, always returns valid result

Verified calculations:
- EC2 t3.micro: `0.0104 * 730 * 1 = $7.59/month` (correct)
- RDS db.t3.micro: `0.017 * 730 = $12.41/month` (correct)
- S3 100GB + 10GB transfer: `(100 * 0.023) + (10 * 0.09) = $3.20/month` (correct)
- Lambda 1M req @ $0.20/M + 200K GB-s: `$3.53/month` (correct)

### src/renderer/src/data/cloud-pricing/equivalences.ts

Cross-provider service equivalence map:
- `SERVICE_EQUIVALENCES` — 9 service groups mapped across all 3 providers
- `getEquivalentServiceId(sourceId, targetProvider)` — direct + reverse lookup
- `findCanonicalId(serviceId)` — reverse lookup from any provider-specific ID
- `getAllEquivalents(serviceId)` — returns all 3 provider IDs for a service

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

Minor implementation decisions within scope:
1. **`app-service` calculation reuses `calcComputeInstance`** — App Service tiers store `pricePerHour` on their SelectOption, same as compute VMs. Clean reuse.
2. **Cosmos DB uses a minimum 400 RU/s floor** — Azure enforces this minimum in production. The calculator mirrors this behavior for realistic estimates.
3. **`void HOURS_PER_MONTH` in aws.ts removed** — The constant is defined in calculator.ts (as plan specifies), not aws.ts. The comment in aws.ts was unnecessary and was not added.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Types and provider catalogs | `0b1e341` | `launchpad.ts`, `types.ts`, `aws.ts`, `gcp.ts`, `azure.ts`, `index.ts` |
| Task 2: Calculator and equivalences | `630d299` | `calculator.ts`, `equivalences.ts` |

## Self-Check: PASSED

All required files created and verified:
- `src/renderer/src/types/launchpad.ts` — FOUND
- `src/renderer/src/data/cloud-pricing/types.ts` — FOUND
- `src/renderer/src/data/cloud-pricing/aws.ts` — FOUND (contains AWS_CATALOG)
- `src/renderer/src/data/cloud-pricing/gcp.ts` — FOUND (contains GCP_CATALOG)
- `src/renderer/src/data/cloud-pricing/azure.ts` — FOUND (contains AZURE_CATALOG)
- `src/renderer/src/data/cloud-pricing/index.ts` — FOUND (getCatalog, PROVIDER_INFO)
- `src/renderer/src/data/cloud-pricing/calculator.ts` — FOUND (calculateServiceCost, calculateTotalCost, HOURS_PER_MONTH)
- `src/renderer/src/data/cloud-pricing/equivalences.ts` — FOUND (SERVICE_EQUIVALENCES, 9 pairs)

TypeScript compilation: PASS (zero errors)
Each catalog has exactly 5 categories: PASS (AWS 5, GCP 5, Azure 5)
Calculator produces non-zero results for compute/storage/database: PASS (verified)
HOURS_PER_MONTH = 730 used consistently: PASS
Service equivalence covers 9 pairs across all 3 providers: PASS
