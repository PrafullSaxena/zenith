/**
 * azure-fetcher.ts — Azure Retail Prices API fetcher for the Launchpad pricing layer.
 *
 * Fetches VM pricing for all 12 Azure regions with pagination via nextPageLink.
 * Supports delta sync using lastModified filter (stored in a sidecar JSON file).
 *
 * This module runs ONLY in the main process.
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { pricingRepository } from '../pricing-repository'
import { type RateRow } from '../pricing-db'

// ── Azure regions ──────────────────────────────────────────────────────

const AZURE_REGIONS = [
  'eastus',
  'eastus2',
  'westus',
  'westus2',
  'westeurope',
  'northeurope',
  'southeastasia',
  'eastasia',
  'japaneast',
  'brazilsouth',
  'canadacentral',
  'australiaeast'
]

// ── Result shape ───────────────────────────────────────────────────────

export interface AzureFetchResult {
  servicesUpdated: number
  deltaSkipped: boolean
  bytesDownloaded: number
  error?: string
}

// ── HTTP helper ────────────────────────────────────────────────────────

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

// ── Azure API response shape ───────────────────────────────────────────

interface AzurePriceItem {
  armRegionName: string
  retailPrice: number
  unitOfMeasure: string
  skuName: string
}

interface AzurePriceResponse {
  Items: AzurePriceItem[]
  NextPageLink?: string | null
}

// ── Meta sidecar ───────────────────────────────────────────────────────

interface AzureMeta {
  lastSyncAt: string
}

function getMetaPath(): string {
  return path.join(app.getPath('userData'), 'pricing-azure-meta.json')
}

function readMeta(): AzureMeta | null {
  const metaPath = getMetaPath()
  try {
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf-8')
      return JSON.parse(raw) as AzureMeta
    }
  } catch {
    // Ignore — treat as no meta
  }
  return null
}

function writeMeta(meta: AzureMeta): void {
  const metaPath = getMetaPath()
  fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf-8')
}

// ── Main fetcher ───────────────────────────────────────────────────────

/**
 * Fetch Azure VM pricing for all 12 configured regions.
 * Uses lastModified delta filter on subsequent syncs.
 */
export async function fetchAzurePricing(): Promise<AzureFetchResult> {
  try {
    const meta = readMeta()
    const lastSyncAt = meta?.lastSyncAt ?? null

    // Build filter string
    const regionList = AZURE_REGIONS.map((r) => `'${r}'`).join(',')
    const baseFilter = `serviceName eq 'Virtual Machines' and armRegionName in (${regionList})`
    const dateFilter = lastSyncAt ? ` and lastModified ge datetime'${lastSyncAt}'` : ''
    const filter = baseFilter + dateFilter

    const baseUrl = `https://prices.azure.com/api/retail/prices?$filter=${encodeURIComponent(filter)}`

    let nextUrl: string | null = baseUrl
    const allItems: AzurePriceItem[] = []
    let bytesDownloaded = 0

    // Paginate through all results
    while (nextUrl !== null) {
      const body = await httpsGet(nextUrl)
      bytesDownloaded += Buffer.byteLength(body, 'utf-8')

      const parsed: AzurePriceResponse = JSON.parse(body)
      const items = parsed.Items ?? []
      allItems.push(...items)

      nextUrl = parsed.NextPageLink ?? null
    }

    // If delta returns zero items, that is valid — nothing changed
    if (allItems.length === 0) {
      // Still write meta to mark a fresh sync timestamp
      writeMeta({ lastSyncAt: new Date().toISOString() })
      return { servicesUpdated: 0, deltaSkipped: false, bytesDownloaded }
    }

    // Map items to RateRows
    const rows: RateRow[] = allItems
      .filter((item) => typeof item.retailPrice === 'number' && item.armRegionName)
      .map((item) => ({
        service_id: 'azure-vm',
        provider: 'azure',
        region: item.armRegionName,
        rate_key: 'pricePerHour',
        value: item.retailPrice,
        unit: 'USD/hr',
        tier: 'onDemand',
        fetched_at: Date.now()
      }))

    // Upsert in batches of 500
    const BATCH_SIZE = 500
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      pricingRepository.upsertRates(rows.slice(i, i + BATCH_SIZE))
    }

    // Update sidecar after successful upsert
    writeMeta({ lastSyncAt: new Date().toISOString() })

    return {
      servicesUpdated: rows.length,
      deltaSkipped: false,
      bytesDownloaded
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { servicesUpdated: 0, deltaSkipped: false, bytesDownloaded: 0, error }
  }
}
