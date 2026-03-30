/**
 * pricing-db.ts — SQLite database singleton for the Launchpad pricing layer.
 *
 * Uses better-sqlite3 (synchronous API) with WAL mode.
 * Provides initPricingDb() for schema creation and getPricingDb() for access.
 *
 * This module runs ONLY in the main process.
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

// ── Row shapes ─────────────────────────────────────────────────────────

export interface RateRow {
  service_id: string
  provider: string
  region: string
  rate_key: string
  value: number
  unit?: string
  tier?: string
  fetched_at: number
}

// ── Singleton ──────────────────────────────────────────────────────────

let db: Database.Database | null = null

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Initialize the pricing SQLite database.
 * Creates all tables and indexes if they do not exist (idempotent).
 * Must be called once during app startup before getPricingDb().
 */
export function initPricingDb(): void {
  const dbPath = path.join(app.getPath('userData'), 'pricing.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_services (
      id TEXT NOT NULL, provider TEXT NOT NULL, category TEXT NOT NULL,
      name TEXT NOT NULL, description TEXT, config_schema TEXT NOT NULL,
      equivalence_id TEXT, updated_at INTEGER NOT NULL,
      PRIMARY KEY (id, provider)
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id TEXT NOT NULL, provider TEXT NOT NULL, region TEXT NOT NULL,
      rate_key TEXT NOT NULL, value REAL NOT NULL, unit TEXT, tier TEXT,
      fetched_at INTEGER NOT NULL,
      UNIQUE(service_id, provider, region, rate_key, tier)
    );
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rates_lookup ON pricing_rates(provider, region, service_id);
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rates_service ON pricing_rates(service_id, provider);
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_regions (
      provider TEXT NOT NULL, region_id TEXT NOT NULL, display_name TEXT NOT NULL,
      PRIMARY KEY (provider, region_id)
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL,
      status TEXT NOT NULL, services_updated INTEGER, error TEXT,
      started_at INTEGER NOT NULL, completed_at INTEGER
    );
  `)
}

/**
 * Returns the initialized pricing database instance.
 * Throws if called before initPricingDb().
 */
export function getPricingDb(): Database.Database {
  if (db === null) {
    throw new Error('PricingDb not initialized — call initPricingDb() first')
  }
  return db
}
