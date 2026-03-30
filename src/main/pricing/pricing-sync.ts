/**
 * pricing-sync.ts — PricingSync orchestrator with daily scheduler.
 *
 * Coordinates all cloud provider pricing fetches on a daily timer.
 * Runs ONLY in the main process.
 */

import { BrowserWindow } from 'electron'
import { pricingRepository } from './pricing-repository'
import { fetchAwsPricing } from './fetchers/aws-fetcher'

// ── Types ──────────────────────────────────────────────────────────────

export interface ProviderSyncResult {
  provider: 'aws' | 'gcp' | 'azure'
  status: 'success' | 'error' | 'skipped'
  servicesUpdated: number
  error?: string
  bytesDownloaded?: number
  deltaSkipped?: boolean
}

export interface SyncResult {
  startedAt: number
  completedAt: number
  providers: ProviderSyncResult[]
}

// ── Inline stubs — replaced by real fetchers once 08-02 files exist. ──
// These satisfy TypeScript at wave-1 compile time without dynamic imports.
const fetchAzurePricing = async (): Promise<{ servicesUpdated: number; deltaSkipped: boolean }> =>
  ({ servicesUpdated: 0, deltaSkipped: false })

const fetchGcpPricing = async (): Promise<{ servicesUpdated: number; deltaSkipped: boolean; skipped: true }> =>
  ({ servicesUpdated: 0, deltaSkipped: false, skipped: true })

// ── PricingSync class ──────────────────────────────────────────────────

export class PricingSync {
  private dailyTimer: NodeJS.Timeout | null = null
  private mainWindow: BrowserWindow | null = null

  /**
   * Call once during app startup. Attaches mainWindow for push notification.
   * Schedules daily sync: runs immediately if last sync was >23h ago, else
   * waits until 23h after last sync.
   */
  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow

    const syncStatus = pricingRepository.getSyncStatus('aws')
    const msSinceLastSync = syncStatus.lastSyncAt
      ? Date.now() - syncStatus.lastSyncAt
      : Infinity

    const TWENTY_THREE_HOURS = 23 * 60 * 60 * 1000
    const STARTUP_DELAY = 10 * 1000

    if (msSinceLastSync > TWENTY_THREE_HOURS) {
      // Run sync after a short startup delay
      setTimeout(() => {
        this.syncAll().catch((err) => {
          console.error('[PricingSync] syncAll error during startup:', err)
        })
      }, STARTUP_DELAY)
    } else {
      // Schedule next sync based on last sync time
      const msUntilNext = TWENTY_THREE_HOURS - msSinceLastSync
      this.scheduleNext(msUntilNext)
    }

    // Always schedule the daily recurring sync after 24h
    this.scheduleNext(24 * 60 * 60 * 1000)
  }

  /**
   * Register the window for launchpad:syncComplete push events.
   * Called when mainWindow becomes available (may differ from init timing).
   */
  setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow
  }

  /**
   * Run sync for all 3 providers. Results are isolated — one failure does
   * not abort others. Emits launchpad:syncComplete to renderer on completion.
   */
  async syncAll(): Promise<SyncResult> {
    const startedAt = Date.now()

    const [awsSettled, azureSettled, gcpSettled] = await Promise.allSettled([
      this.syncProvider('aws'),
      this.syncProvider('azure'),
      this.syncProvider('gcp')
    ])

    const providers: ProviderSyncResult[] = [
      awsSettled.status === 'fulfilled'
        ? awsSettled.value
        : { provider: 'aws', status: 'error', servicesUpdated: 0, error: String((awsSettled as PromiseRejectedResult).reason) },
      azureSettled.status === 'fulfilled'
        ? azureSettled.value
        : { provider: 'azure', status: 'error', servicesUpdated: 0, error: String((azureSettled as PromiseRejectedResult).reason) },
      gcpSettled.status === 'fulfilled'
        ? gcpSettled.value
        : { provider: 'gcp', status: 'error', servicesUpdated: 0, error: String((gcpSettled as PromiseRejectedResult).reason) }
    ]

    const result: SyncResult = {
      startedAt,
      completedAt: Date.now(),
      providers
    }

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('launchpad:syncComplete', result)
    }

    return result
  }

  /**
   * Sync a single provider. Delegates to the appropriate fetcher.
   * Writes result to pricing_sync_log via pricingRepository.logSync()
   */
  async syncProvider(provider: 'aws' | 'gcp' | 'azure'): Promise<ProviderSyncResult> {
    try {
      let servicesUpdated = 0
      let deltaSkipped = false
      let bytesDownloaded: number | undefined

      if (provider === 'aws') {
        const result = await fetchAwsPricing()
        if (result.error) {
          pricingRepository.logSync(provider, 'error', 0, result.error)
          return { provider, status: 'error', servicesUpdated: 0, error: result.error, deltaSkipped: result.deltaSkipped }
        }
        servicesUpdated = result.servicesUpdated
        deltaSkipped = result.deltaSkipped
        bytesDownloaded = result.bytesDownloaded
      } else if (provider === 'azure') {
        const result = await fetchAzurePricing()
        servicesUpdated = result.servicesUpdated
        deltaSkipped = result.deltaSkipped
      } else if (provider === 'gcp') {
        const result = await fetchGcpPricing()
        servicesUpdated = result.servicesUpdated
        deltaSkipped = result.deltaSkipped

        if (result.skipped) {
          pricingRepository.logSync(provider, 'skipped', 0, null)
          return { provider, status: 'skipped', servicesUpdated: 0, deltaSkipped: true }
        }
      }

      pricingRepository.logSync(provider, 'success', servicesUpdated, null)
      return { provider, status: 'success', servicesUpdated, deltaSkipped, bytesDownloaded }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      pricingRepository.logSync(provider, 'error', 0, errorMessage)
      return { provider, status: 'error', servicesUpdated: 0, error: errorMessage }
    }
  }

  private scheduleNext(delayMs: number): void {
    this.clearSchedule()
    this.dailyTimer = setTimeout(() => {
      this.syncAll().catch((err) => {
        console.error('[PricingSync] scheduled syncAll error:', err)
      })
      // Re-schedule after each run
      this.scheduleNext(24 * 60 * 60 * 1000)
    }, delayMs)
  }

  private clearSchedule(): void {
    if (this.dailyTimer !== null) {
      clearTimeout(this.dailyTimer)
      this.dailyTimer = null
    }
  }
}

// ── Singleton export ────────────────────────────────────────────────────

export const pricingSync = new PricingSync()
