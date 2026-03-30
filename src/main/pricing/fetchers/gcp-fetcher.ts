/**
 * gcp-fetcher.ts — GCP Cloud Billing SKU API fetcher for the Launchpad pricing layer.
 *
 * Fetches Compute Engine VM SKU rates for all 12 GCP regions.
 * Requires a GCP API key (Cloud Billing API enabled). Returns a graceful skip
 * result when no API key is configured — does NOT crash or make network requests.
 *
 * Supports ETag-based delta sync for unchanged pages (SYNC-06).
 * Includes a TODO stub for committed-use pricing (SYNC-08).
 *
 * This module runs ONLY in the main process.
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { IncomingMessage } from 'http'
import { app } from 'electron'
import { pricingRepository } from '../pricing-repository'
import { type RateRow } from '../pricing-db'
import {
  getCredential,
  hasCredential,
  CRED_GCP_API_KEY,
  CRED_GCP_BILLING_ACCOUNT_ID
} from '../credentials'

// ── GCP regions ────────────────────────────────────────────────────────

const GCP_REGIONS = [
  'us-central1',
  'us-east1',
  'us-west1',
  'europe-west1',
  'europe-west4',
  'asia-east1',
  'asia-southeast1',
  'asia-northeast1',
  'southamerica-east1',
  'australia-southeast1',
  'northamerica-northeast1',
  'asia-south1'
]

// ── GCP Compute Engine service ID ──────────────────────────────────────

const GCP_COMPUTE_SERVICE_ID = '6F81-5844-456A'

// ── Result shape ───────────────────────────────────────────────────────

export interface GcpFetchResult {
  servicesUpdated: number
  deltaSkipped: boolean
  bytesDownloaded: number
  error?: string
}

// ── HTTP helper with ETag support ──────────────────────────────────────

interface HttpResponse {
  statusCode: number
  body: string
  etag: string | null
}

function httpsGetWithEtag(url: string, ifNoneMatch?: string | null): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Accept: 'application/json'
    }
    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch
    }

    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers
    }

    const req = https.request(options, (res: IncomingMessage) => {
      const statusCode = res.statusCode ?? 0
      const etag = (res.headers['etag'] as string) ?? null

      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8')
        resolve({ statusCode, body, etag })
      })
      res.on('error', reject)
    })

    req.on('error', reject)
    req.end()
  })
}

// ── GCP SKU API response shapes ────────────────────────────────────────

interface GcpUnitPrice {
  units?: string
  nanos?: number
}

interface GcpTieredRate {
  unitPrice?: GcpUnitPrice
}

interface GcpPricingExpression {
  tieredRates?: GcpTieredRate[]
}

interface GcpPricingInfo {
  pricingExpression?: GcpPricingExpression
}

interface GcpSku {
  description?: string
  serviceRegions?: string[]
  pricingInfo?: GcpPricingInfo[]
}

interface GcpSkuResponse {
  skus?: GcpSku[]
  nextPageToken?: string
}

// ── Meta sidecar (ETag storage) ────────────────────────────────────────

interface GcpMeta {
  etag: string
}

function getMetaPath(): string {
  return path.join(app.getPath('userData'), 'pricing-gcp-meta.json')
}

function readMeta(): GcpMeta | null {
  const metaPath = getMetaPath()
  try {
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf-8')
      return JSON.parse(raw) as GcpMeta
    }
  } catch {
    // Ignore — treat as no meta
  }
  return null
}

function writeMeta(meta: GcpMeta): void {
  const metaPath = getMetaPath()
  fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf-8')
}

// ── Price conversion ───────────────────────────────────────────────────

function extractPrice(sku: GcpSku): number | null {
  const tieredRates = sku.pricingInfo?.[0]?.pricingExpression?.tieredRates
  if (!tieredRates || tieredRates.length === 0) return null

  const unitPrice = tieredRates[0].unitPrice
  if (!unitPrice) return null

  const units = parseInt(unitPrice.units ?? '0', 10)
  const nanos = unitPrice.nanos ?? 0
  return units + nanos / 1_000_000_000
}

// ── Main fetcher ───────────────────────────────────────────────────────

/**
 * Fetch GCP Compute Engine VM SKU pricing for all 12 configured regions.
 *
 * Returns { deltaSkipped: true } immediately when no GCP API key is configured
 * (SYNC-05 — no crash, no network request).
 *
 * Uses ETag-based delta detection for unchanged pages (SYNC-06).
 */
export async function fetchGcpPricing(): Promise<GcpFetchResult> {
  // SYNC-05: Graceful no-key fallback
  const apiKey = getCredential(CRED_GCP_API_KEY)
  if (!apiKey) {
    return { servicesUpdated: 0, deltaSkipped: true, bytesDownloaded: 0 }
  }

  try {
    const meta = readMeta()
    const storedEtag = meta?.etag ?? null

    const gcpRegionSet = new Set(GCP_REGIONS)
    const allRows: RateRow[] = []
    let bytesDownloaded = 0
    let pageToken: string | undefined = undefined
    let latestEtag: string | null = storedEtag
    let totalDeltaSkipped = 0
    let totalPages = 0

    // Paginate through all SKU pages
    do {
      let url = `https://cloudbilling.googleapis.com/v1/services/${GCP_COMPUTE_SERVICE_ID}/skus?key=${apiKey}`
      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`
      }

      // SYNC-06: Send If-None-Match on first page (ETag applies to full resource)
      const ifNoneMatch = totalPages === 0 ? storedEtag : null
      const response = await httpsGetWithEtag(url, ifNoneMatch)
      totalPages++

      if (response.statusCode === 304) {
        // Page not modified — count as delta skip for this page
        totalDeltaSkipped++
        break
      }

      bytesDownloaded += Buffer.byteLength(response.body, 'utf-8')

      // Update ETag from response
      if (response.etag) {
        latestEtag = response.etag
      }

      const parsed: GcpSkuResponse = JSON.parse(response.body)
      const skus = parsed.skus ?? []

      for (const sku of skus) {
        const description = sku.description ?? ''
        const serviceRegions = sku.serviceRegions ?? []

        // Only compute SKUs for our regions
        if (!description.includes('Instance Core') && !description.includes('Instance Ram')) {
          continue
        }

        const price = extractPrice(sku)
        if (price === null) continue

        // Intersect SKU regions with our GCP_REGIONS
        const matchingRegions = serviceRegions.filter((r) => gcpRegionSet.has(r))
        for (const region of matchingRegions) {
          allRows.push({
            service_id: 'gcp-compute-engine',
            provider: 'gcp',
            region,
            rate_key: description.includes('Core') ? 'pricePerCoreHour' : 'pricePerGbHour',
            value: price,
            unit: 'USD/hr',
            tier: 'onDemand',
            fetched_at: Date.now()
          })
        }
      }

      pageToken = parsed.nextPageToken
    } while (pageToken)

    // If no data (all pages skipped or no matching SKUs), return early
    if (allRows.length === 0 && totalDeltaSkipped > 0) {
      return { servicesUpdated: 0, deltaSkipped: true, bytesDownloaded }
    }

    // Upsert collected rows
    if (allRows.length > 0) {
      const BATCH_SIZE = 500
      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        pricingRepository.upsertRates(allRows.slice(i, i + BATCH_SIZE))
      }
    }

    // Update ETag in sidecar after successful fetch
    if (latestEtag) {
      writeMeta({ etag: latestEtag })
    }

    // SYNC-08: Optional committed-use pricing stub
    if (hasCredential(CRED_GCP_BILLING_ACCOUNT_ID)) {
      // TODO: SYNC-08 — fetch committed-use discounts from Cloud Billing API
      // Requires: https://cloudbilling.googleapis.com/v1/billingAccounts/{id}/budgets
      // Deferred: requires billing.budgets.get IAM permission
      // return committedUseRates
    }

    return {
      servicesUpdated: allRows.length,
      deltaSkipped: false,
      bytesDownloaded
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { servicesUpdated: 0, deltaSkipped: false, bytesDownloaded: 0, error }
  }
}
