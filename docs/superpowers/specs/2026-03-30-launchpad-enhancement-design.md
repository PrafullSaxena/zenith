# Launchpad Enhancement Design
**Date:** 2026-03-30
**Author:** Prafull Saxena
**Status:** Approved — ready for implementation

---

## Overview

Transform the Launchpad cloud cost estimator from a static, hardcoded tool into a live, data-driven pricing engine. The enhancement covers four pillars: live pricing data (hybrid public sync + optional credentials), regional pricing as a first-class input, an expanded service catalog (~100 services across AWS/GCP/Azure), and a rich visualization layer.

---

## 1. Architecture

The core change is introducing a **data layer** between the UI and pricing data. Pricing flows through main process → SQLite → IPC → renderer. The renderer never imports hardcoded data files directly.

```
┌─────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                      │
│                                                          │
│  LaunchpadStore ──► usePricing() hook                   │
│       │                    │                            │
│       ▼                    ▼                            │
│  Calculator (pure)   IPC: launchpad:*                   │
└──────────────────────────────┬──────────────────────────┘
                               │ IPC
┌──────────────────────────────▼──────────────────────────┐
│                    MAIN PROCESS                          │
│                                                          │
│  PricingRepository ◄──── pricing.db (SQLite)            │
│       │                                                  │
│  PricingSync                                             │
│  ├── PublicFetcher  ──► AWS bulk JSON / Azure Retail API │
│  └── CredentialFetcher ──► GCP API key / AWS reserved   │
└─────────────────────────────────────────────────────────┘
```

### New IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `launchpad:getPricing` | renderer → main | Fetch rates for provider + region + services |
| `launchpad:syncPricing` | renderer → main | Trigger manual sync |
| `launchpad:getSyncStatus` | renderer → main | Last sync time, next sync, per-provider status |
| `launchpad:getRegions` | renderer → main | Available regions per provider |
| `launchpad:saveCredentials` | renderer → main | Store encrypted API keys |
| `launchpad:getCatalog` | renderer → main | Full service catalog from DB |
| `launchpad:syncComplete` | main → renderer | Push notification when sync finishes |

### What Gets Removed
The hardcoded `src/renderer/src/data/cloud-pricing/aws.ts`, `gcp.ts`, `azure.ts` become seed-only files (used to populate DB on first launch). The renderer stops importing them directly.

---

## 2. SQLite Schema

New dedicated database: `pricing.db` (separate from `nebula.db` and `cortex.db`).

```sql
-- Service definitions (replaces hardcoded catalog TypeScript)
CREATE TABLE pricing_services (
  id             TEXT NOT NULL,
  provider       TEXT NOT NULL,       -- 'aws' | 'gcp' | 'azure'
  category       TEXT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  config_schema  TEXT NOT NULL,       -- JSON: ConfigSchema
  equivalence_id TEXT,                -- canonical cross-provider ID
  updated_at     INTEGER NOT NULL,
  PRIMARY KEY (id, provider)
);

-- Per-region pricing rates
CREATE TABLE pricing_rates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id  TEXT NOT NULL,
  provider    TEXT NOT NULL,
  region      TEXT NOT NULL,
  rate_key    TEXT NOT NULL,          -- e.g. 'pricePerHour', 'pricePerGb'
  value       REAL NOT NULL,
  unit        TEXT,
  tier        TEXT,                   -- 'onDemand' | 'reserved1yr'
  fetched_at  INTEGER NOT NULL,
  UNIQUE(service_id, provider, region, rate_key, tier)
);

-- Performance indexes
CREATE INDEX idx_rates_lookup ON pricing_rates(provider, region, service_id);
CREATE INDEX idx_rates_service ON pricing_rates(service_id, provider);

-- Available regions per provider
CREATE TABLE pricing_regions (
  provider     TEXT NOT NULL,
  region_id    TEXT NOT NULL,
  display_name TEXT NOT NULL,
  PRIMARY KEY (provider, region_id)
);

-- Sync history & status
CREATE TABLE pricing_sync_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  provider         TEXT NOT NULL,
  status           TEXT NOT NULL,     -- 'success' | 'partial' | 'error'
  services_updated INTEGER,
  error            TEXT,
  started_at       INTEGER NOT NULL,
  completed_at     INTEGER
);
```

### PricingRepository Interface

```typescript
class PricingRepository {
  getCatalog(provider: CloudProvider): ServiceCategory[]
  getRates(serviceIds: string[], provider: CloudProvider, region: string): RateMap
  getRegions(provider: CloudProvider): Region[]
  getSyncStatus(provider: CloudProvider): SyncStatus
  upsertRates(rates: RateRow[]): void
  seedFromFallback(): void   // populates DB from hardcoded data if empty
}
```

### Credentials Storage
Credentials stored via Electron `safeStorage` + `electron-store` (same pattern as agent API keys):

```typescript
'launchpad.credentials.gcp.apiKey'          // required for live GCP pricing
'launchpad.credentials.aws.accessKeyId'     // optional, reserved pricing
'launchpad.credentials.aws.secretAccessKey' // optional, reserved pricing
'launchpad.credentials.gcp.billingAccountId'// optional, committed use pricing
```

---

## 3. PricingSync Service

Runs in the main process. Initialized at app startup. Daily sync schedule by default.

### Pricing Sources

| Provider | Tier | Source | Auth |
|----------|------|--------|------|
| AWS | Public | AWS Bulk Pricing JSON (`pricing.us-east-1.amazonaws.com`) | None |
| Azure | Public | Azure Retail Prices API (`prices.azure.com/api/retail/prices`) | None |
| GCP | API Key | Cloud Billing API (`cloudbilling.googleapis.com/v1/services`) | Free API key required |
| AWS | Optional | Cost Explorer API | Access key + secret |
| GCP | Optional | Billing Account API | Billing account ID |

> **Note:** GCP's Cloud Billing API returns 403 without an API key. Users provide a free GCP API key in settings. Without it, GCP uses seeded/fallback data.

### Sync Flow

```
app startup
  → PricingSync.init()
    → DB empty? → seedFromFallback() (instant, synchronous)
    → schedule daily sync job
    → if lastSync > 24h ago → triggerSync() immediately in background

triggerSync(provider)
  → fetch public pricing data (delta: only changed since lastSync)
  → parse + normalize to RateRow[]
  → upsert into pricing_rates
  → if credentials present → fetch premium pricing (reserved/committed)
  → log to pricing_sync_log
  → emit launchpad:syncComplete → renderer refreshes pricingCache
```

### Delta Sync Strategy
- **AWS**: Bulk pricing JSON includes `publicationDate` — skip re-fetch if unchanged
- **Azure**: Use `$filter=lastModified ge <date>` in Retail Prices API
- **GCP**: Compare ETag headers per service SKU

First sync: full fetch (~18k rows, background).
Subsequent syncs: delta, typically 50–200 changed rows/day.

---

## 4. Regional Pricing

Region is a first-class input to every cost calculation.

### Default Regions

| Provider | Default Region |
|----------|---------------|
| AWS | `us-east-1` |
| GCP | `us-central1` |
| Azure | `eastus` |

### Synced Regions (top 12 per provider)

**AWS:** us-east-1, us-east-2, us-west-1, us-west-2, eu-west-1, eu-central-1, ap-southeast-1, ap-southeast-2, ap-northeast-1, sa-east-1, ca-central-1, ap-south-1

**GCP:** us-central1, us-east1, us-west1, europe-west1, europe-west4, asia-east1, asia-southeast1, asia-northeast1, southamerica-east1, australia-southeast1, northamerica-northeast1, asia-south1

**Azure:** eastus, eastus2, westus, westus2, westeurope, northeurope, southeastasia, eastasia, japaneast, brazilsouth, canadacentral, australiaeast

"Sync all regions" available in settings for full coverage.

### UI
Region picker in EstimationSummary header. Single region applies to entire estimation. Changing region triggers instant recalculation from cached rates — no re-fetch needed.

---

## 5. Calculator (Pure Function)

The calculator becomes a pure function. No internal imports from data files.

### New Signature

```typescript
calculateTotalCost(
  selections: ServiceSelection[],
  rates: RateMap,
  region: string
): CostResult

calculateServiceCost(
  serviceId: string,
  config: ResourceConfig,
  rates: ServiceRates,
  region: string
): ServiceCostResult

// RateMap shape
type RateMap = Record<string, Record<string, number>>
// { 'ec2': { 'pricePerHour.t3.small': 0.0208, ... } }
```

### Store: pricingCache

```typescript
{
  pricingCache: {
    rates: RateMap | null,
    region: string,
    lastFetched: number,
    status: 'idle' | 'loading' | 'ready' | 'stale'
  }
}
```

### Fallback Chain
1. DB rates (live synced) → use if available
2. Seeded fallback rates → use if DB empty or sync failed
3. "Pricing unavailable" shown in UI → if both fail

### Memoization
Cache key: `${serviceId}:${hashConfig(config)}:${region}`
Only recalculate services whose config or region changed. Grand total = sum of cached results.

---

## 6. Service Catalog (~100 Services)

Catalog is DB-driven. Defined in `pricing_services` table, seeded from existing TypeScript on first launch, updated via sync. New services can be added via sync without a code deploy.

### Full Service List

#### Compute
| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Virtual Machines | EC2 | Compute Engine | Virtual Machines |
| Serverless Functions | Lambda | Cloud Functions | Azure Functions |
| Containers (Managed) | Fargate | Cloud Run | Container Apps |
| Kubernetes | EKS | GKE | AKS |
| PaaS / App Hosting | Elastic Beanstalk | App Engine | App Service |
| Batch Processing | AWS Batch | Cloud Batch | Azure Batch |

#### Storage
| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Object Storage | S3 | Cloud Storage | Blob Storage |
| Block Storage | EBS | Persistent Disk | Managed Disks |
| File Storage | EFS | Filestore | Azure Files |
| Cold / Archive | S3 Glacier | Cloud Archive | Archive Storage |
| Data Lake | S3 + Glue | Cloud Storage + Dataproc | Data Lake Storage |

#### Database
| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Managed Relational | RDS | Cloud SQL | Azure SQL |
| NoSQL / Document | DynamoDB | Firestore | Cosmos DB |
| In-Memory Cache | ElastiCache | Memorystore | Cache for Redis |
| Data Warehouse | Redshift | BigQuery | Azure Synapse |
| Wide Column | — | Bigtable | — |
| Globally Distributed | Aurora Global | Spanner | Cosmos DB multi-region |
| Managed PostgreSQL | RDS PostgreSQL | AlloyDB | Azure DB for PostgreSQL |
| Managed MySQL | RDS MySQL | Cloud SQL MySQL | Azure DB for MySQL |

#### Network
| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| CDN | CloudFront | Cloud CDN | Azure CDN |
| DNS | Route 53 | Cloud DNS | Azure DNS |
| Load Balancer | ALB/NLB | Cloud Load Balancing | Azure Load Balancer |
| API Gateway | API Gateway | Apigee | API Management |
| NAT Gateway | NAT Gateway | Cloud NAT | NAT Gateway |
| DDoS / WAF | Shield + WAF | Cloud Armor | Azure DDoS + WAF |
| Data Transfer | Data Transfer | Egress | Bandwidth |

#### ML / AI
| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| ML Platform | SageMaker | Vertex AI | Azure ML |
| LLM / Gen AI | Bedrock | Gemini API | Azure OpenAI |
| Vision API | Rekognition | Vision API | AI Vision |
| NLP / Language | Comprehend | Natural Language API | AI Language |
| Translation | Translate | Translation API | Translator |
| Document AI | Textract | Document AI | Form Recognizer |

#### Analytics & Streaming
| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Stream Processing | Kinesis | Pub/Sub | Event Hubs |
| ETL / Data Pipeline | Glue | Dataflow | Data Factory |
| Query Service | Athena | BigQuery | Synapse Serverless |
| Managed Spark | EMR | Dataproc | HDInsight |
| BI / Dashboards | QuickSight | Looker | Power BI Embedded |

#### Messaging / Integration
| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Message Queue | SQS | Cloud Tasks | Service Bus |
| Pub/Sub Messaging | SNS | Pub/Sub | Event Grid |
| Workflow Orchestration | Step Functions | Cloud Workflows | Logic Apps |

#### Security & Identity
| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Secrets Management | Secrets Manager | Secret Manager | Key Vault |
| Certificate Manager | ACM | Certificate Manager | App Service Certs |

### UI: Virtualized List
Use `@tanstack/react-virtual` for ServiceCatalog list rendering.
In-memory search index built on catalog load — no DB query on keystroke.

---

## 7. Visualization Layer

Add **Recharts** (`npm install recharts`) as new dependency.

### Charts

#### A. Treemap (Cost Distribution)
Replaces current fallback bar chart in EstimationSummary.
Color by category. Hover: service name + monthly cost + % of total.

#### B. Donut Chart (Category Breakdown)
Sits alongside treemap in EstimationSummary.
Shows % split by category (Compute, Storage, Database, etc.).

#### C. Grouped Bar Chart (Provider Comparison)
Replaces static text table in ComparisonView.
One group per service family, three bars per group (AWS/GCP/Azure).
Green = cheapest per row.

#### D. Trend Line (History Tab)
Plots saved estimations over time.
Each point = one saved estimation. Hover: name + total cost breakdown.

All charts use CSS custom properties for dark theme compatibility.

---

## 8. Settings & Credentials UI

### A. Settings Panel (Zenith Settings → Plugins → Launchpad)

- Sync frequency selector (Daily / Weekly / Manual)
- Default region per provider
- Manual "Sync Now" button
- Provider status: Live / No Key / Stale
- Credentials section: AWS keys, GCP API key, GCP billing account
- All credential fields masked; Edit/Clear per field
- GCP API key labeled "Required for live pricing" with setup link

### B. Sync Status Badge (Launchpad Header)

```
● Live      prices current (synced 2h ago)
◑ Partial   AWS/Azure live, GCP needs API key
○ Cached    using fallback data
⚠ Stale    last sync failed 3 days ago
```

Clicking opens popover with per-provider detail + link to settings.

### C. Region Persistence

```typescript
'launchpad.defaultRegion.aws'   → 'us-east-1'
'launchpad.defaultRegion.gcp'   → 'us-central1'
'launchpad.defaultRegion.azure' → 'eastus'
```

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Select a service (load rates) | < 5ms |
| Config change (recalculate) | < 2ms |
| Region switch (re-fetch selected) | < 20ms |
| Initial catalog render (100 services) | < 16ms (virtualized) |
| Search filter | < 10ms (in-memory) |
| Background sync (delta) | 2–5s, no UI impact |

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Separate `pricing.db` | Keeps pricing data isolated from Nebula/Cortex, easier to wipe/reseed |
| GCP requires API key | GCP Cloud Billing API returns 403 without auth — free key, but required |
| Top 12 regions per provider | Covers ~95% of real-world usage, keeps DB size manageable |
| Recharts over d3 | Declarative React API, works in Electron renderer, all required chart types in one package |
| Lazy rate loading | Only load rates for selected services, not full 18k-row table |
| Seed from hardcoded on first launch | Zero-network-dependency on first run, sync happens in background |

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Azure EA/MCA pricing | Requires Azure portal auth, not API-accessible |
| Real-time cloud account import | Out of scope for v1 — cost estimation, not monitoring |
| Custom pricing overrides | Deferred to v2 |
| Cost allocation tags | Deferred to v2 |
| All regions (30+ per provider) | Top 12 covers 95% of usage; full sync available on demand |

---
*Spec written: 2026-03-30*
