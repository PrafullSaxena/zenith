/**
 * seed.ts — Populate pricing.db from hardcoded TypeScript catalogs on first launch.
 *
 * Reads the existing renderer-side TS catalogs and writes them to pricing.db via
 * PricingRepository. Safe to call on every app startup — isSeeded() prevents double-write.
 *
 * This module runs ONLY in the main process.
 */

import { pricingRepository } from './pricing-repository'
import type { CloudProvider, ServiceEntry } from './pricing-repository'
import type { RateRow } from './pricing-db'
import { AWS_CATALOG, AWS_REGIONS } from '../../renderer/src/data/cloud-pricing/aws'
import { GCP_CATALOG, GCP_REGIONS } from '../../renderer/src/data/cloud-pricing/gcp'
import { AZURE_CATALOG, AZURE_REGIONS } from '../../renderer/src/data/cloud-pricing/azure'
import type { ProviderCatalog } from '../../renderer/src/data/cloud-pricing/types'

// Canonical seed region per provider (used as the region for seeded rate rows)
const SEED_REGION: Record<CloudProvider, string> = {
  aws: 'us-east-1',
  gcp: 'us-central1',
  azure: 'eastus'
}

/**
 * Seed a single provider's catalog and rates into the DB.
 * Skips the provider entirely if already seeded (isSeeded returns true).
 */
function seedProvider(
  catalog: ProviderCatalog,
  regions: { value: string; label: string }[],
  provider: CloudProvider
): void {
  if (pricingRepository.isSeeded(provider)) {
    return
  }

  // Seed regions
  for (const region of regions) {
    pricingRepository.upsertRegion(provider, region.value, region.label)
  }

  const seedRegion = SEED_REGION[provider]
  const now = Date.now()

  // Seed services and extract rates from configSchema
  for (const category of catalog.categories) {
    for (const service of category.services) {
      const serviceEntry: ServiceEntry = {
        id: service.id,
        provider,
        category: category.name,
        name: service.name,
        description: service.description ?? null,
        configSchema: JSON.stringify(service.configSchema),
        equivalenceId: null,
        updatedAt: now
      }

      pricingRepository.upsertService(serviceEntry)

      // Extract rates from configSchema select fields that have pricePerHour
      const rates: RateRow[] = []

      for (const [fieldName, field] of Object.entries(service.configSchema)) {
        if (field.type !== 'select' || !field.options) continue

        for (const option of field.options) {
          // Only extract options with a numeric pricePerHour
          const priceOption = option as { value: string; pricePerHour?: number }
          if (typeof priceOption.pricePerHour === 'number') {
            rates.push({
              service_id: service.id,
              provider,
              region: seedRegion,
              rate_key: `${fieldName}.${priceOption.value}`,
              value: priceOption.pricePerHour,
              unit: 'USD/hr',
              tier: 'onDemand',
              fetched_at: now
            })
          }
        }
      }

      if (rates.length > 0) {
        pricingRepository.upsertRates(rates)
      }
    }
  }
}

/**
 * Seed all three provider catalogs into pricing.db.
 *
 * Idempotent — safe to call on every app startup.
 * The isSeeded() check inside seedProvider prevents double-write.
 */
export function seedPricingDb(): void {
  seedProvider(AWS_CATALOG, AWS_REGIONS, 'aws')
  seedProvider(GCP_CATALOG, GCP_REGIONS, 'gcp')
  seedProvider(AZURE_CATALOG, AZURE_REGIONS, 'azure')
}
