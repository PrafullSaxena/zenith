/**
 * aws-fetcher.ts — AWS bulk JSON pricing fetcher.
 *
 * Downloads per-region AWS EC2 pricing JSON (one URL per region),
 * performs a delta check via a sidecar file, and upserts rates into
 * pricing_rates via pricingRepository.
 *
 * Per-region URLs are ~5-15MB each vs the global index (~300-500MB),
 * which prevents OOM / RangeError: Array buffer allocation failed.
 *
 * Optional: If AWS credentials are present, reserved pricing metadata
 * could be fetched via Cost Explorer. Requires @aws-sdk/client-pricing.
 *
 * Runs ONLY in the main process.
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { RateRow } from '../pricing-db'
import { pricingRepository } from '../pricing-repository'
import { hasCredential, CRED_AWS_ACCESS_KEY_ID, CRED_AWS_SECRET_ACCESS_KEY } from '../credentials'

// ── Types ──────────────────────────────────────────────────────────────

export interface AwsFetchResult {
  servicesUpdated: number
  deltaSkipped: boolean
  bytesDownloaded: number
  error?: string
}

// ── Constants ──────────────────────────────────────────────────────────

/**
 * Per-region pricing URL template. Each file is ~5-15MB vs the global
 * index (~300-500MB). Fetching per-region avoids OOM on Buffer.concat.
 */
const AWS_REGION_PRICING_URL = (region: string): string =>
  `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/${region}/index.json`

const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2',
  'ap-northeast-1', 'sa-east-1', 'ca-central-1', 'ap-south-1'
]

const AWS_REGION_TO_LOCATION: Record<string, string> = {
  'us-east-1': 'US East (N. Virginia)',
  'us-east-2': 'US East (Ohio)',
  'us-west-1': 'US West (N. California)',
  'us-west-2': 'US West (Oregon)',
  'eu-west-1': 'Europe (Ireland)',
  'eu-central-1': 'Europe (Frankfurt)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-southeast-2': 'Asia Pacific (Sydney)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  'sa-east-1': 'South America (Sao Paulo)',
  'ca-central-1': 'Canada (Central)',
  'ap-south-1': 'Asia Pacific (Mumbai)'
}

/** EC2 service id used in the seed catalog */
const EC2_SERVICE_ID = 'ec2-on-demand'

// ── Sidecar meta file ──────────────────────────────────────────────────

/**
 * Tracks per-region publicationDate so we can skip regions that haven't
 * been updated since the last sync.
 */
interface AwsMeta {
  regionDates: Record<string, string>
}

function getMetaFilePath(): string {
  return path.join(app.getPath('userData'), 'pricing-aws-meta.json')
}

function readMeta(): AwsMeta | null {
  try {
    const raw = fs.readFileSync(getMetaFilePath(), 'utf-8')
    return JSON.parse(raw) as AwsMeta
  } catch {
    return null
  }
}

function writeMeta(meta: AwsMeta): void {
  try {
    fs.writeFileSync(getMetaFilePath(), JSON.stringify(meta, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[aws-fetcher] Failed to write meta sidecar:', err)
  }
}

// ── HTTP download helper ────────────────────────────────────────────────

function downloadJson(url: string): Promise<{ body: string; bytesDownloaded: number }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let bytesDownloaded = 0

    const request = https.get(url, { timeout: 60_000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        downloadJson(res.headers.location)
          .then(resolve)
          .catch(reject)
        return
      }

      if (res.statusCode && res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from AWS pricing endpoint`))
        return
      }

      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        bytesDownloaded += chunk.length
      })

      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8')
        resolve({ body, bytesDownloaded })
      })

      res.on('error', reject)
    })

    request.on('error', reject)
    request.on('timeout', () => {
      request.destroy()
      reject(new Error('AWS pricing request timed out'))
    })
  })
}

// ── Bulk JSON type shapes (partial) ────────────────────────────────────

interface AwsBulkJson {
  publicationDate?: string
  products?: Record<string, AwsProduct>
  terms?: {
    OnDemand?: Record<string, Record<string, AwsTerm>>
  }
}

interface AwsProduct {
  sku: string
  productFamily?: string
  attributes?: {
    instanceType?: string
    operatingSystem?: string
  }
}

interface AwsTerm {
  priceDimensions?: Record<string, AwsPriceDimension>
}

interface AwsPriceDimension {
  unit?: string
  pricePerUnit?: {
    USD?: string
  }
}

// ── Per-region fetch helper ─────────────────────────────────────────────

/**
 * Fetch and parse pricing for a single region. Returns the number of rate
 * rows upserted and the publicationDate found in the response.
 */
async function fetchRegion(
  region: string,
  knownDate: string | undefined,
  now: number
): Promise<{ rateRows: RateRow[]; publicationDate: string; bytesDownloaded: number; skipped: boolean }> {
  const url = AWS_REGION_PRICING_URL(region)
  const { body, bytesDownloaded } = await downloadJson(url)

  let data: AwsBulkJson
  try {
    data = JSON.parse(body) as AwsBulkJson
  } catch {
    throw new Error(`Failed to parse AWS pricing JSON for region ${region}`)
  }

  const publicationDate = data.publicationDate ?? ''

  // Delta check: skip region if publicationDate hasn't changed
  if (knownDate && publicationDate && knownDate === publicationDate) {
    return { rateRows: [], publicationDate, bytesDownloaded, skipped: true }
  }

  const products = data.products ?? {}
  const onDemandTerms = data.terms?.OnDemand ?? {}

  // Build SKU → price map
  const skuToPrice = new Map<string, number>()
  for (const [sku, termVariants] of Object.entries(onDemandTerms)) {
    for (const term of Object.values(termVariants)) {
      const dims = term.priceDimensions ?? {}
      for (const dim of Object.values(dims)) {
        const usdStr = dim.pricePerUnit?.USD
        if (usdStr !== undefined) {
          const usd = parseFloat(usdStr)
          if (!isNaN(usd) && usd > 0) {
            skuToPrice.set(sku, usd)
          }
        }
      }
    }
  }

  // Collect rate rows — per-region JSON contains only Compute Instance products
  const rateRows: RateRow[] = []
  for (const product of Object.values(products)) {
    if (product.productFamily !== 'Compute Instance') continue

    const price = skuToPrice.get(product.sku)
    if (price === undefined) continue

    rateRows.push({
      service_id: EC2_SERVICE_ID,
      provider: 'aws',
      region,
      rate_key: 'pricePerHour',
      value: price,
      unit: 'Hrs',
      tier: 'onDemand',
      fetched_at: now
    })
  }

  return { rateRows, publicationDate, bytesDownloaded, skipped: false }
}

// ── Main export ─────────────────────────────────────────────────────────

export async function fetchAwsPricing(): Promise<AwsFetchResult> {
  try {
    const meta = readMeta()
    const regionDates: Record<string, string> = meta?.regionDates ?? {}
    const updatedRegionDates: Record<string, string> = { ...regionDates }

    const now = Date.now()
    let totalRateRows = 0
    let totalBytesDownloaded = 0
    let allSkipped = true

    // Fetch each region sequentially to avoid concurrent heap pressure.
    // Each per-region JSON is ~5-15MB; sequential fetch + GC keeps memory low.
    for (const region of AWS_REGIONS) {
      try {
        const { rateRows, publicationDate, bytesDownloaded, skipped } = await fetchRegion(
          region,
          regionDates[region],
          now
        )

        totalBytesDownloaded += bytesDownloaded

        if (!skipped && rateRows.length > 0) {
          allSkipped = false

          // Upsert in batches of 500
          const BATCH_SIZE = 500
          for (let i = 0; i < rateRows.length; i += BATCH_SIZE) {
            pricingRepository.upsertRates(rateRows.slice(i, i + BATCH_SIZE))
          }
          totalRateRows += rateRows.length
        } else if (skipped) {
          // Count skipped bytes (HEAD-only cost) but don't clear allSkipped
        }

        if (publicationDate) {
          updatedRegionDates[region] = publicationDate
        }
      } catch (regionErr) {
        // Log per-region errors but continue with remaining regions
        console.warn(`[aws-fetcher] Failed to fetch region ${region}:`, regionErr)
      }
    }

    // Ensure all 12 regions exist in pricing_regions
    for (const region of AWS_REGIONS) {
      const displayName = AWS_REGION_TO_LOCATION[region] ?? region
      pricingRepository.upsertRegion('aws', region, displayName)
    }

    // Persist updated region dates
    writeMeta({ regionDates: updatedRegionDates })

    // Optional Cost Explorer reserved pricing enhancement (SYNC-07)
    if (
      hasCredential(CRED_AWS_ACCESS_KEY_ID) &&
      hasCredential(CRED_AWS_SECRET_ACCESS_KEY)
    ) {
      // TODO: SYNC-07 — install @aws-sdk/client-pricing to enable reserved pricing enhancement
      // @aws-sdk/client-pricing is not currently in package.json.
      // Once installed, use AWS Signature V4 signed requests to fetch reserved instance rates
      // from https://ce.us-east-1.amazonaws.com/ and merge them into pricing_rates with tier='reserved'.
    }

    return {
      servicesUpdated: totalRateRows,
      deltaSkipped: allSkipped,
      bytesDownloaded: totalBytesDownloaded
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    return { servicesUpdated: 0, deltaSkipped: false, bytesDownloaded: 0, error: errorMessage }
  }
}
