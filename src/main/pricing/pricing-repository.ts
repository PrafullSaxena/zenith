/**
 * pricing-repository.ts — PricingRepository class for the Launchpad pricing layer.
 *
 * This is the only way other main-process code should query pricing data.
 * Uses prepared statements and transactions via better-sqlite3 (synchronous API).
 *
 * This module runs ONLY in the main process.
 */

import { getPricingDb, type RateRow } from './pricing-db'

// ── Types ──────────────────────────────────────────────────────────────

export type CloudProvider = 'aws' | 'gcp' | 'azure'

export interface Region {
  regionId: string
  displayName: string
}

export interface ServiceEntry {
  id: string
  provider: CloudProvider
  category: string
  name: string
  description: string | null
  configSchema: string // raw JSON string
  equivalenceId: string | null
  updatedAt: number
}

export interface ServiceCategory {
  id: string
  name: string
  services: ServiceEntry[]
}

/** { [serviceId]: { [rateKey]: value } } */
export type RateMap = Record<string, Record<string, number>>

export interface SyncStatus {
  provider: CloudProvider
  lastSyncAt: number | null
  status: string | null
  servicesUpdated: number | null
  error: string | null
}

// ── Internal DB row shapes ─────────────────────────────────────────────

interface ServiceRow {
  id: string
  provider: string
  category: string
  name: string
  description: string | null
  config_schema: string
  equivalence_id: string | null
  updated_at: number
}

interface RegionRow {
  region_id: string
  display_name: string
}

interface RateDbRow {
  service_id: string
  rate_key: string
  value: number
}

interface SyncLogRow {
  provider: string
  status: string
  services_updated: number | null
  error: string | null
  started_at: number
  completed_at: number | null
}

interface CountRow {
  count: number
}

// ── PricingRepository class ────────────────────────────────────────────

export class PricingRepository {
  /**
   * Get full service catalog for a provider, grouped by category.
   */
  getCatalog(provider: CloudProvider): ServiceCategory[] {
    const db = getPricingDb()
    const rows = db
      .prepare<[string], ServiceRow>(
        `SELECT * FROM pricing_services WHERE provider = ? ORDER BY category, name`
      )
      .all(provider)

    const categoryMap = new Map<string, ServiceCategory>()

    for (const row of rows) {
      if (!categoryMap.has(row.category)) {
        // Derive category id from first word of category name lowercased
        const categoryId = row.category.split(/\s+/)[0].toLowerCase()
        categoryMap.set(row.category, { id: categoryId, name: row.category, services: [] })
      }

      const entry: ServiceEntry = {
        id: row.id,
        provider: row.provider as CloudProvider,
        category: row.category,
        name: row.name,
        description: row.description,
        configSchema: row.config_schema,
        equivalenceId: row.equivalence_id,
        updatedAt: row.updated_at
      }

      categoryMap.get(row.category)!.services.push(entry)
    }

    return Array.from(categoryMap.values())
  }

  /**
   * Get rates for specific services in a provider/region.
   * Returns RateMap: { [serviceId]: { [rateKey]: value } }
   */
  getRates(serviceIds: string[], provider: CloudProvider, region: string): RateMap {
    if (serviceIds.length === 0) return {}

    const db = getPricingDb()
    const placeholders = serviceIds.map(() => '?').join(',')
    const rows = db
      .prepare<unknown[], RateDbRow>(
        `SELECT service_id, rate_key, value FROM pricing_rates
         WHERE provider = ? AND region = ? AND service_id IN (${placeholders})`
      )
      .all(provider, region, ...serviceIds)

    const result: RateMap = {}
    for (const row of rows) {
      if (!result[row.service_id]) {
        result[row.service_id] = {}
      }
      result[row.service_id][row.rate_key] = row.value
    }

    return result
  }

  /**
   * Get all regions for a provider.
   */
  getRegions(provider: CloudProvider): Region[] {
    const db = getPricingDb()
    return db
      .prepare<[string], RegionRow>(
        `SELECT region_id, display_name FROM pricing_regions WHERE provider = ? ORDER BY region_id`
      )
      .all(provider)
      .map((row) => ({ regionId: row.region_id, displayName: row.display_name }))
  }

  /**
   * Get the most recent sync status for a provider.
   */
  getSyncStatus(provider: CloudProvider): SyncStatus {
    const db = getPricingDb()
    const row = db
      .prepare<[string], SyncLogRow>(
        `SELECT * FROM pricing_sync_log WHERE provider = ? ORDER BY started_at DESC LIMIT 1`
      )
      .get(provider)

    if (!row) {
      return { provider, lastSyncAt: null, status: null, servicesUpdated: null, error: null }
    }

    return {
      provider,
      lastSyncAt: row.started_at,
      status: row.status,
      servicesUpdated: row.services_updated,
      error: row.error
    }
  }

  /**
   * Upsert a batch of rate rows in a single transaction.
   */
  upsertRates(rates: RateRow[]): void {
    const db = getPricingDb()
    const insert = db.prepare(
      `INSERT OR REPLACE INTO pricing_rates
       (service_id, provider, region, rate_key, value, unit, tier, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const insertMany = db.transaction((rows: RateRow[]) => {
      for (const row of rows) {
        insert.run(
          row.service_id,
          row.provider,
          row.region,
          row.rate_key,
          row.value,
          row.unit ?? null,
          row.tier ?? null,
          row.fetched_at
        )
      }
    })

    insertMany(rates)
  }

  /**
   * Upsert a single service entry.
   */
  upsertService(service: ServiceEntry): void {
    const db = getPricingDb()
    db.prepare(
      `INSERT OR REPLACE INTO pricing_services
       (id, provider, category, name, description, config_schema, equivalence_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      service.id,
      service.provider,
      service.category,
      service.name,
      service.description,
      service.configSchema,
      service.equivalenceId,
      service.updatedAt
    )
  }

  /**
   * Upsert a region for a provider.
   */
  upsertRegion(provider: CloudProvider, regionId: string, displayName: string): void {
    const db = getPricingDb()
    db.prepare(
      `INSERT OR REPLACE INTO pricing_regions (provider, region_id, display_name) VALUES (?, ?, ?)`
    ).run(provider, regionId, displayName)
  }

  /**
   * Returns true if the provider has at least one service in the catalog.
   */
  isSeeded(provider: CloudProvider): boolean {
    const db = getPricingDb()
    const row = db
      .prepare<[string], CountRow>(
        `SELECT COUNT(*) as count FROM pricing_services WHERE provider = ?`
      )
      .get(provider)
    return (row?.count ?? 0) > 0
  }

  /**
   * Log a sync run result to pricing_sync_log.
   * Called by PricingSync.syncProvider() after each provider fetch completes.
   */
  logSync(provider: CloudProvider, status: string, servicesUpdated: number, error: string | null): void {
    const db = getPricingDb()
    db.prepare(`
      INSERT INTO pricing_sync_log (provider, status, services_updated, error, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(provider, status, servicesUpdated, error, Date.now(), Date.now())
  }

  /**
   * Stub — Called by seed.ts — see src/main/pricing/seed.ts
   * seed.ts calls upsertService/upsertRegion/upsertRates directly.
   */
  seedFromFallback(): void {
    // Called by seed.ts — see src/main/pricing/seed.ts
  }
}

// ── Singleton export ───────────────────────────────────────────────────

export const pricingRepository = new PricingRepository()
