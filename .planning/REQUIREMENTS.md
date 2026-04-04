# Requirements: Zenith v2.0 — Launchpad Enhancement

**Defined:** 2026-03-30
**Core Value:** Live, accurate cloud cost estimation with regional pricing and a comprehensive service catalog.
**Spec:** docs/superpowers/specs/2026-03-30-launchpad-enhancement-design.md

---

## v1 Requirements (This Milestone)

### Data Layer

- [x] **DATA-01**: Main process initializes `pricing.db` with `pricing_services`, `pricing_rates`, `pricing_regions`, and `pricing_sync_log` tables on app startup
- [x] **DATA-02**: `PricingRepository` class exposes `getCatalog()`, `getRates()`, `getRegions()`, `getSyncStatus()`, `upsertRates()`, and `seedFromFallback()` methods
- [x] **DATA-03**: App seeds `pricing.db` from existing hardcoded TypeScript data on first launch (zero network dependency)
- [x] **DATA-04**: DB queries use indexes on `(provider, region, service_id)` and `(service_id, provider)` for sub-millisecond lookups
- [x] **DATA-05**: Credentials (GCP API key, AWS keys, GCP billing account) stored encrypted via Electron `safeStorage`

### Pricing Sync

- [x] **SYNC-01**: `PricingSync` service initializes at app startup and schedules daily background sync
- [x] **SYNC-02**: AWS public pricing fetched from AWS Bulk Pricing JSON (no auth required)
- [x] **SYNC-03**: Azure public pricing fetched from Azure Retail Prices API (no auth required)
- [x] **SYNC-04**: GCP pricing fetched from Cloud Billing API using user-provided free API key
- [x] **SYNC-05**: Without GCP API key, GCP uses seeded/cached data (no crash, graceful degradation)
- [x] **SYNC-06**: Delta sync strategy: only changed rates fetched on subsequent syncs (ETag/lastModified comparison)
- [x] **SYNC-07**: Optional AWS reserved pricing via Cost Explorer API (requires access key + secret)
- [x] **SYNC-08**: Optional GCP committed use pricing via Billing Account API (requires billing account ID)
- [x] **SYNC-09**: Sync failures logged to `pricing_sync_log`; partial failures don't block other providers
- [x] **SYNC-10**: Main process emits `launchpad:syncComplete` IPC push to renderer when sync finishes

### Regional Pricing

- [x] **REGION-01**: Top 12 regions per provider synced and stored as first-class rows in `pricing_rates`
- [x] **REGION-02**: Default regions set per provider: AWS `us-east-1`, GCP `us-central1`, Azure `eastus`
- [x] **REGION-03**: Region picker displayed in EstimationSummary header; single region applies to entire estimation
- [x] **REGION-04**: Changing region triggers instant cost recalculation from cached rates (no re-fetch)
- [x] **REGION-05**: Selected region persisted per provider in settings (`launchpad.defaultRegion.*`)

### IPC Channels

- [x] **IPC-01**: `launchpad:getPricing` — returns rates for selected services + provider + region from DB
- [x] **IPC-02**: `launchpad:syncPricing` — triggers manual sync, returns sync status
- [x] **IPC-03**: `launchpad:getSyncStatus` — returns last sync time, next sync, per-provider status
- [x] **IPC-04**: `launchpad:getRegions` — returns available regions per provider from DB
- [x] **IPC-05**: `launchpad:saveCredentials` — stores encrypted API keys via safeStorage
- [x] **IPC-06**: `launchpad:getCatalog` — returns full service catalog grouped by category from DB

### Calculator

- [x] **CALC-01**: Calculator refactored to pure function — accepts `RateMap`, `ServiceSelection[]`, `region` as inputs, no internal hardcoded imports
- [x] **CALC-02**: `launchpad-store` gains `pricingCache` field: `{ rates: RateMap, region, lastFetched, status }`
- [x] **CALC-03**: Rates loaded lazily — only fetched for currently selected services, not entire catalog
- [x] **CALC-04**: Calculator results memoized with cache key `${serviceId}:${hashConfig(config)}:${region}`
- [x] **CALC-05**: Fallback chain: DB rates → seeded fallback → "pricing unavailable" shown in UI
- [x] **CALC-06**: `pricingCache` refreshed automatically when `launchpad:syncComplete` event received

### Service Catalog

- [x] **CAT-01**: Catalog expanded to ~100 services across 8 categories: Compute, Storage, Database, Network, ML/AI, Analytics & Streaming, Messaging/Integration, Security & Identity
- [x] **CAT-02**: All 3 providers (AWS, GCP, Azure) have equivalent coverage per category
- [x] **CAT-03**: Catalog served from `pricing_services` DB table (not hardcoded TypeScript imports)
- [x] **CAT-04**: Cross-provider equivalence table expanded from 11 to ~25 service families for ComparisonView
- [x] **CAT-05**: `ServiceCatalog` list virtualized with `@tanstack/react-virtual` — renders only visible rows regardless of catalog size
- [x] **CAT-06**: In-memory search index built on catalog load — search filters with no DB query on each keystroke

### Visualizations

- [x] **VIZ-01**: `recharts` added as project dependency
- [x] **VIZ-02**: Treemap chart replaces current fallback bar chart in EstimationSummary — shows cost distribution by service, color-coded by category, hover shows cost + % of total
- [x] **VIZ-03**: Donut chart added to EstimationSummary showing spending split by category
- [x] **VIZ-04**: Grouped bar chart in ComparisonView replaces static text table — one group per service family, three bars (AWS/GCP/Azure), green = cheapest
- [x] **VIZ-05**: Trend line in History tab plots saved estimations over time — hover shows name + cost breakdown
- [x] **VIZ-06**: All charts use CSS custom properties for dark theme compatibility

### Settings & Credentials UI

- [x] **SET-01**: Launchpad settings panel added (Zenith Settings → Plugins → Launchpad): sync frequency, default region per provider, manual sync trigger
- [x] **SET-02**: Provider status displayed in settings: Live / No Key / Stale with last-sync timestamp
- [x] **SET-03**: Credentials section in settings: AWS access key + secret, GCP API key, GCP billing account — all masked, with Edit/Clear per field
- [x] **SET-04**: GCP API key labeled "Required for live pricing" with link to GCP Console setup
- [x] **SET-05**: Sync status badge in Launchpad plugin header: Live / Partial / Cached / Stale
- [x] **SET-06**: Clicking sync status badge opens popover with per-provider detail + link to settings

---

## Future Requirements (Deferred)

### v3 Candidates

- **FUTURE-01**: Custom pricing overrides per service
- **FUTURE-02**: Cost allocation tags / cost center mapping
- **FUTURE-03**: Real-time cloud account import (actual usage data)
- **FUTURE-04**: Budget alert thresholds with notifications
- **FUTURE-05**: Full 30+ region sync per provider (on-demand available, full auto deferred)
- **FUTURE-06**: Azure EA/MCA pricing (requires portal auth)
- **FUTURE-07**: Cost forecasting / monthly trend projection

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Azure EA/MCA pricing | Requires Azure portal auth, not API-accessible |
| Real-time cloud account import | Cost estimation only, not monitoring — v3 |
| Custom pricing overrides | Deferred to v3 |
| Cost allocation tags | Deferred to v3 |
| All 30+ regions auto-sync | Top 12 covers 95% usage; full sync on demand |
| Light mode | Dark-only across Zenith |
| Breaking existing features | History, PDF export, AI advisor must continue working |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 7 | Complete |
| DATA-02 | Phase 7 | Complete |
| DATA-03 | Phase 7 | Complete |
| DATA-04 | Phase 7 | Complete |
| DATA-05 | Phase 7 | Complete |
| SYNC-01 | Phase 8 | Complete |
| SYNC-02 | Phase 8 | Complete |
| SYNC-03 | Phase 8 | Complete |
| SYNC-04 | Phase 8 | Complete |
| SYNC-05 | Phase 8 | Complete |
| SYNC-06 | Phase 8 | Complete |
| SYNC-07 | Phase 8 | Complete |
| SYNC-08 | Phase 8 | Complete |
| SYNC-09 | Phase 8 | Complete |
| SYNC-10 | Phase 8 | Complete |
| REGION-01 | Phase 8 | Complete |
| REGION-02 | Phase 9 | Complete |
| REGION-03 | Phase 9 | Complete |
| REGION-04 | Phase 9 | Complete |
| REGION-05 | Phase 9 | Complete |
| IPC-01 | Phase 7 | Complete |
| IPC-02 | Phase 8 | Complete |
| IPC-03 | Phase 8 | Complete |
| IPC-04 | Phase 8 | Complete |
| IPC-05 | Phase 7 | Complete |
| IPC-06 | Phase 7 | Complete |
| CALC-01 | Phase 9 | Complete |
| CALC-02 | Phase 9 | Complete |
| CALC-03 | Phase 9 | Complete |
| CALC-04 | Phase 9 | Complete |
| CALC-05 | Phase 9 | Complete |
| CALC-06 | Phase 9 | Complete |
| CAT-01 | Phase 10 | Complete |
| CAT-02 | Phase 10 | Complete |
| CAT-03 | Phase 10 | Complete |
| CAT-04 | Phase 10 | Complete |
| CAT-05 | Phase 10 | Complete |
| CAT-06 | Phase 10 | Complete |
| VIZ-01 | Phase 11 | Complete |
| VIZ-02 | Phase 11 | Complete |
| VIZ-03 | Phase 11 | Complete |
| VIZ-04 | Phase 11 | Complete |
| VIZ-05 | Phase 11 | Complete |
| VIZ-06 | Phase 11 | Complete |
| SET-01 | Phase 12 | Complete |
| SET-02 | Phase 12 | Complete |
| SET-03 | Phase 12 | Complete |
| SET-04 | Phase 12 | Complete |
| SET-05 | Phase 12 | Complete |
| SET-06 | Phase 12 | Complete |
| UCM-01 | Phase 13 | Complete |
| UCM-02 | Phase 13 | Complete |
| UCM-03 | Phase 13 | Complete |
| UCM-04 | Phase 13 | Complete |
| UCM-05 | Phase 13 | Complete |
| UCM-06 | Phase 13 | Complete |

**Coverage:**
- v1 requirements: 52 total
- Mapped to phases: 52
- Unmapped: 0 ✓

### CodeReviewBot User Comments (Phase 13)

- [x] **UCM-01**: Clicking any diff line in PRDiffView opens an inline comment composer; user can type and save without triggering AI review
- [x] **UCM-02**: User comments are persisted locally (survive app restart); stored keyed by `{workspace}/{repoSlug}/{prId}/{file}/{line}`
- [x] **UCM-03**: User comments render inline on the diff with a distinct visual badge ("You" label, different accent color) separate from AI comment cards
- [x] **UCM-04**: When AI code review runs, existing user comments for the PR are injected into the AI prompt as prior annotations
- [x] **UCM-05**: After AI code review completes, the diff remains interactive — users can still add new comments to any line
- [x] **UCM-06**: User comments and AI review comments coexist on the same diff line without layout or z-index breakage

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-04-04 — Phase 13 UCM requirements added (CodeReviewBot User Comments)*
