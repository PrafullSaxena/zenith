/**
 * SyncStatusBadge -- Compact badge for aggregate sync health in the Launchpad header.
 *
 * Displays a colored pill (Live / Partial / Cached / Stale) and opens a popover
 * with per-provider sync detail on click. Includes a "Manage in Settings" link.
 *
 * Refreshes automatically via onSyncComplete listener.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../../stores/settings-store'
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@renderer/components/ui/popover'
import { formatRelativeTime } from './utils'

// ── Types ──────────────────────────────────────────────────────────────

interface SyncStatusEntry {
  provider: 'aws' | 'gcp' | 'azure'
  lastSyncAt: number | null
  status: string | null
  servicesUpdated: number | null
  error: string | null
}

interface CredentialEntry {
  set: boolean
  masked: string | null
}

type CredentialStatus = Record<string, CredentialEntry>

type AggregateStatus = 'Live' | 'Partial' | 'Cached' | 'Stale'

type ProviderHealth = 'live' | 'stale' | 'noKey' | 'never'

// ── Constants ──────────────────────────────────────────────────────────

const FREQUENCY_MS: Record<string, number> = {
  '6h': 21_600_000,
  '12h': 43_200_000,
  daily: 86_400_000,
  weekly: 604_800_000,
  manual: Infinity
}

const PROVIDER_LABELS: Record<string, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure'
}

const BADGE_STYLES: Record<
  AggregateStatus,
  { dot: string; bg: string; text: string }
> = {
  Live: {
    dot: 'bg-green-500',
    bg: 'bg-green-500/10 border-green-500/20',
    text: 'text-green-400'
  },
  Partial: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400'
  },
  Cached: {
    dot: 'bg-gray-500',
    bg: 'bg-gray-500/10 border-gray-500/20',
    text: 'text-gray-400'
  },
  Stale: {
    dot: 'bg-red-500',
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-400'
  }
}

const HEALTH_DOT: Record<ProviderHealth, string> = {
  live: 'bg-green-500',
  stale: 'bg-red-500',
  noKey: 'bg-gray-500',
  never: 'bg-gray-500'
}

const HEALTH_LABEL: Record<ProviderHealth, string> = {
  live: 'Live',
  stale: 'Stale',
  noKey: 'No Key',
  never: 'Never synced'
}

// ── Helpers ────────────────────────────────────────────────────────────

function classifyProvider(
  provider: string,
  syncEntry: SyncStatusEntry | undefined,
  credentialStatus: CredentialStatus,
  staleThresholdMs: number
): ProviderHealth {
  // GCP requires API key
  if (provider === 'gcp' && !credentialStatus.gcpApiKey?.set) return 'noKey'

  if (!syncEntry || syncEntry.lastSyncAt === null) {
    if (provider === 'aws' && !credentialStatus.awsAccessKeyId?.set) return 'noKey'
    return 'never'
  }

  const age = Date.now() - syncEntry.lastSyncAt
  return age <= staleThresholdMs ? 'live' : 'stale'
}

function aggregate(healthMap: Record<string, ProviderHealth>): AggregateStatus {
  const values = Object.values(healthMap)
  const allLive = values.every((h) => h === 'live')
  const someLive = values.some((h) => h === 'live')
  const allNever = values.every((h) => h === 'never')
  const allStale = values.every((h) => h === 'stale')

  if (allLive) return 'Live'
  if (allStale) return 'Stale'
  if (allNever) return 'Cached'
  if (someLive) return 'Partial'
  // Mix of noKey/never/stale without any live
  return 'Partial'
}

// ── Component ──────────────────────────────────────────────────────────

export default function SyncStatusBadge(): React.JSX.Element {
  const navigate = useNavigate()
  const { getSetting } = useSettingsStore()
  const [syncStatuses, setSyncStatuses] = useState<SyncStatusEntry[]>([])
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus>({})
  const [open, setOpen] = useState(false)

  const syncFrequency =
    (getSetting('plugins.launchpad.syncFrequency') as string) ?? 'daily'
  const frequencyMs = FREQUENCY_MS[syncFrequency] ?? FREQUENCY_MS.daily
  const staleThreshold = frequencyMs === Infinity ? FREQUENCY_MS.weekly * 2 : frequencyMs * 2

  // ── Data fetching ──────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const [credResult, syncResult] = await Promise.all([
        window.api.launchpad.getCredentialStatus(),
        window.api.launchpad.getSyncStatus()
      ])
      setCredentialStatus(credResult)
      if (syncResult.success && syncResult.statuses) {
        setSyncStatuses(syncResult.statuses)
      }
    } catch {
      // Silently ignore -- badge shows cached state
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    refresh()
  }, [refresh])

  // Live refresh on sync complete
  useEffect(() => {
    const unsubscribe = window.api.launchpad.onSyncComplete(() => {
      refresh()
    })
    return () => {
      unsubscribe()
    }
  }, [refresh])

  // ── Compute aggregate status ──────────────────────────────────────

  const providers = ['aws', 'gcp', 'azure'] as const
  const healthMap: Record<string, ProviderHealth> = {}
  for (const p of providers) {
    const entry = syncStatuses.find((s) => s.provider === p)
    healthMap[p] = classifyProvider(p, entry, credentialStatus, staleThreshold)
  }
  const status = aggregate(healthMap)
  const style = BADGE_STYLES[status]

  // ── Render ────────────────────────────────────────────────────────

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium cursor-pointer border transition-colors ${style.bg} ${style.text}`}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
          {status}
        </button>
      </PopoverTrigger>

      <PopoverContent side="bottom" align="end" className="w-64 p-3">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Sync Status
        </p>

        <div className="space-y-2">
          {providers.map((p) => {
            const entry = syncStatuses.find((s) => s.provider === p)
            const health = healthMap[p]
            return (
              <div key={p} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${HEALTH_DOT[health]}`}
                  />
                  <span className="text-xs font-medium text-foreground">
                    {PROVIDER_LABELS[p]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {HEALTH_LABEL[health]}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatRelativeTime(entry?.lastSyncAt ?? null)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-2 border-t border-white/6">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/settings?tab=launchpad')
            }}
            className="text-[11px] text-primary hover:text-primary/80 transition-colors"
          >
            Manage in Settings
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
