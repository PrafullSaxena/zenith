/**
 * LaunchpadSettings — Custom settings panel for the Launchpad plugin.
 *
 * Three sections:
 *   1. Sync Preferences (frequency, default regions, manual sync)
 *   2. Credentials (masked display, inline edit, clear with confirmation)
 *   3. Provider Status (live/no-key/stale with colored dots)
 */
import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useSettingsStore } from '../../stores/settings-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@renderer/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'
import { formatRelativeTime } from './utils'

// ── Types ──────────────────────────────────────────────────────────────

interface CredentialEntry {
  set: boolean
  masked: string | null
}

type CredentialStatus = Record<string, CredentialEntry>

interface SyncStatusEntry {
  provider: 'aws' | 'gcp' | 'azure'
  lastSyncAt: number | null
  status: string | null
  servicesUpdated: number | null
  error: string | null
}

type CredentialKey = 'gcpApiKey' | 'awsAccessKeyId' | 'awsSecretAccessKey' | 'gcpBillingAccountId'

// ── Constants ──────────────────────────────────────────────────────────

const SYNC_FREQUENCY_OPTIONS = [
  { value: '6h', label: 'Every 6 hours' },
  { value: '12h', label: 'Every 12 hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'manual', label: 'Manual only' }
]

const CREDENTIAL_FIELDS: Array<{
  key: CredentialKey
  label: string
  provider: string
}> = [
  { key: 'awsAccessKeyId', label: 'AWS Access Key ID', provider: 'AWS' },
  { key: 'awsSecretAccessKey', label: 'AWS Secret Access Key', provider: 'AWS' },
  { key: 'gcpApiKey', label: 'GCP API Key', provider: 'GCP' },
  { key: 'gcpBillingAccountId', label: 'GCP Billing Account ID', provider: 'GCP' }
]

const REGION_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  aws: [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'eu-central-1', label: 'EU (Frankfurt)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'sa-east-1', label: 'South America (Sao Paulo)' },
    { value: 'ca-central-1', label: 'Canada (Central)' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' }
  ],
  gcp: [
    { value: 'us-central1', label: 'US Central (Iowa)' },
    { value: 'us-east1', label: 'US East (South Carolina)' },
    { value: 'us-west1', label: 'US West (Oregon)' },
    { value: 'europe-west1', label: 'Europe West (Belgium)' },
    { value: 'europe-west4', label: 'Europe West (Netherlands)' },
    { value: 'asia-east1', label: 'Asia East (Taiwan)' },
    { value: 'asia-southeast1', label: 'Asia Southeast (Singapore)' },
    { value: 'asia-northeast1', label: 'Asia Northeast (Tokyo)' },
    { value: 'southamerica-east1', label: 'South America East (Sao Paulo)' },
    { value: 'australia-southeast1', label: 'Australia Southeast (Sydney)' },
    { value: 'northamerica-northeast1', label: 'North America Northeast (Montreal)' },
    { value: 'asia-south1', label: 'Asia South (Mumbai)' }
  ],
  azure: [
    { value: 'eastus', label: 'East US (Virginia)' },
    { value: 'eastus2', label: 'East US 2 (Virginia)' },
    { value: 'westus', label: 'West US (California)' },
    { value: 'westus2', label: 'West US 2 (Washington)' },
    { value: 'westeurope', label: 'West Europe (Netherlands)' },
    { value: 'northeurope', label: 'North Europe (Ireland)' },
    { value: 'southeastasia', label: 'Southeast Asia (Singapore)' },
    { value: 'eastasia', label: 'East Asia (Hong Kong)' },
    { value: 'japaneast', label: 'Japan East (Tokyo)' },
    { value: 'brazilsouth', label: 'Brazil South (Sao Paulo)' },
    { value: 'canadacentral', label: 'Canada Central (Toronto)' },
    { value: 'australiaeast', label: 'Australia East (Sydney)' }
  ]
}

const DEFAULT_REGIONS: Record<string, string> = {
  aws: 'us-east-1',
  gcp: 'us-central1',
  azure: 'eastus'
}

const PROVIDER_LABELS: Record<string, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure'
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatExactTime(timestamp: number | null): string {
  if (timestamp === null) return 'Never synced'
  return new Date(timestamp).toLocaleString()
}

/** Determine provider status from sync data and credential presence */
function getProviderStatus(
  provider: string,
  syncEntry: SyncStatusEntry | undefined,
  credentialStatus: CredentialStatus,
  syncFrequency: string
): { status: 'live' | 'no-key' | 'stale'; label: string; dotClass: string } {
  // GCP requires API key
  if (provider === 'gcp' && !credentialStatus.gcpApiKey?.set) {
    return { status: 'no-key', label: 'No Key', dotClass: 'bg-gray-500' }
  }

  if (!syncEntry || syncEntry.lastSyncAt === null) {
    // Check if provider has any credentials set
    if (provider === 'aws' && !credentialStatus.awsAccessKeyId?.set) {
      return { status: 'no-key', label: 'No Key', dotClass: 'bg-gray-500' }
    }
    return { status: 'no-key', label: 'Never synced', dotClass: 'bg-gray-500' }
  }

  // Calculate staleness threshold (2x sync frequency)
  const frequencyMs: Record<string, number> = {
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    manual: 7 * 24 * 60 * 60 * 1000 // Default to weekly threshold for manual
  }
  const threshold = (frequencyMs[syncFrequency] ?? frequencyMs.daily) * 2
  const age = Date.now() - syncEntry.lastSyncAt

  if (age <= threshold) {
    return { status: 'live', label: 'Live', dotClass: 'bg-green-500' }
  }
  return { status: 'stale', label: 'Stale', dotClass: 'bg-amber-500' }
}

// ── Component ──────────────────────────────────────────────────────────

export default function LaunchpadSettings(): React.JSX.Element {
  const { getSetting, setSetting } = useSettingsStore()

  // Local state
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus>({})
  const [syncStatuses, setSyncStatuses] = useState<SyncStatusEntry[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [editingKey, setEditingKey] = useState<CredentialKey | null>(null)
  const [editValue, setEditValue] = useState('')

  // Settings-store backed values
  const syncFrequency =
    (getSetting('plugins.launchpad.syncFrequency') as string) ?? 'daily'
  const getDefaultRegion = (provider: string): string =>
    (getSetting(`plugins.launchpad.defaultRegion.${provider}`) as string) ??
    DEFAULT_REGIONS[provider]

  // ── Data fetching ──────────────────────────────────────────────────

  const refreshStatus = useCallback(async () => {
    try {
      const [credResult, syncResult] = await Promise.all([
        window.api.launchpad.getCredentialStatus(),
        window.api.launchpad.getSyncStatus()
      ])
      setCredentialStatus(credResult)
      if (syncResult.success && syncResult.statuses) {
        setSyncStatuses(syncResult.statuses)
      }
    } catch (err) {
      console.error('[LaunchpadSettings] Failed to fetch status:', err)
    }
  }, [])

  useEffect(() => {
    // Do NOT call loadSettings() here — the parent PluginSettings already loaded settings.
    // Calling it again sets isLoading=true on the shared store, which causes PluginSettings
    // to unmount this component (showing "Loading..."), creating an infinite mount/unmount loop.
    refreshStatus()
  }, [refreshStatus])

  // ── Handlers ───────────────────────────────────────────────────────

  const handleManualSync = async (): Promise<void> => {
    setIsSyncing(true)
    try {
      const result = await window.api.launchpad.syncPricing()
      if (result.success) {
        toast.success('Pricing sync complete')
      } else {
        toast.error(result.error ?? 'Sync failed')
      }
      await refreshStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveCredential = async (key: CredentialKey): Promise<void> => {
    if (!editValue.trim()) return
    try {
      await window.api.launchpad.saveCredentials({ [key]: editValue.trim() })
      setEditingKey(null)
      setEditValue('')
      await refreshStatus()
      toast.success('Credential saved')
    } catch (err) {
      toast.error('Failed to save credential')
    }
  }

  const handleDeleteCredential = async (key: CredentialKey): Promise<void> => {
    try {
      await window.api.launchpad.deleteCredential({ key })
      await refreshStatus()
      toast.success('Credential removed')
    } catch (err) {
      toast.error('Failed to remove credential')
    }
  }

  const handleOpenGcpConsole = (): void => {
    window.api.app.openExternal('https://console.cloud.google.com/apis/credentials')
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div>
      <h2 className="mb-2 text-sm font-medium text-foreground tracking-tight">Launchpad</h2>
      <p className="mb-6 text-xs text-muted-foreground">
        Cloud cost estimation with live pricing sync and credential management
      </p>

      <div className="space-y-6">
        {/* ── Section 1: Sync Preferences ──────────────────────────── */}
        <div className="rounded-xl border border-white/6 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-medium text-foreground">Sync Preferences</h3>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing && <Loader2 size={13} className="animate-spin" />}
              Manual Sync
            </button>
          </div>

          {/* Sync Frequency */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[12px] text-muted-foreground">
              Sync Frequency
            </label>
            <Select
              value={syncFrequency}
              onValueChange={(v) => setSetting('plugins.launchpad.syncFrequency', v)}
            >
              <SelectTrigger className="w-48 h-8 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYNC_FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Regions */}
          <div>
            <label className="mb-2 block text-[12px] text-muted-foreground">
              Default Region
            </label>
            <div className="flex gap-3">
              {(['aws', 'gcp', 'azure'] as const).map((provider) => (
                <div key={provider} className="flex-1">
                  <span className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {PROVIDER_LABELS[provider]}
                  </span>
                  <Select
                    value={getDefaultRegion(provider)}
                    onValueChange={(v) =>
                      setSetting(`plugins.launchpad.defaultRegion.${provider}`, v)
                    }
                  >
                    <SelectTrigger className="w-full h-8 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGION_OPTIONS[provider].map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 2: Credentials ──────────────────────────────── */}
        <div className="rounded-xl border border-white/6 bg-white/[0.04] p-5">
          <h3 className="text-[13px] font-medium text-foreground mb-4">Credentials</h3>

          <div className="space-y-3">
            {CREDENTIAL_FIELDS.map((field) => {
              const cred = credentialStatus[field.key]
              const isEditing = editingKey === field.key

              return (
                <div key={field.key}>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-medium text-foreground">
                        {field.label}
                      </span>
                      {!isEditing && (
                        <span className="ml-3 text-[12px] text-muted-foreground">
                          {cred?.set ? cred.masked : 'Not set'}
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCredential(field.key)
                            if (e.key === 'Escape') {
                              setEditingKey(null)
                              setEditValue('')
                            }
                          }}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="w-56 rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveCredential(field.key)}
                          className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition hover:bg-primary/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingKey(null)
                            setEditValue('')
                          }}
                          className="px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingKey(field.key)
                            setEditValue('')
                          }}
                          className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground hover:bg-white/4"
                        >
                          Edit
                        </button>
                        {cred?.set && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-red-400 hover:bg-red-500/10">
                                Clear
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove credential?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure? This will disable live pricing for{' '}
                                  {field.provider}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCredential(field.key)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </div>

                  {/* GCP API Key hint */}
                  {field.key === 'gcpApiKey' && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      Required for live pricing.{' '}
                      <button
                        onClick={handleOpenGcpConsole}
                        className="inline-flex items-center gap-0.5 text-primary/80 hover:text-primary transition"
                      >
                        Get API key
                        <ExternalLink size={10} />
                      </button>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Section 3: Provider Status ──────────────────────────── */}
        <div className="rounded-xl border border-white/6 bg-white/[0.04] p-5">
          <h3 className="text-[13px] font-medium text-foreground mb-4">Provider Status</h3>

          <TooltipProvider>
            <div className="flex gap-3">
              {(['aws', 'gcp', 'azure'] as const).map((provider) => {
                const syncEntry = syncStatuses.find((s) => s.provider === provider)
                const providerStatus = getProviderStatus(
                  provider,
                  syncEntry,
                  credentialStatus,
                  syncFrequency
                )

                return (
                  <div
                    key={provider}
                    className="flex-1 rounded-lg border border-white/6 bg-white/[0.03] p-3"
                  >
                    <div className="text-[12px] font-medium text-foreground mb-2">
                      {PROVIDER_LABELS[provider]}
                    </div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${providerStatus.dotClass}`}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {providerStatus.label}
                      </span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[11px] text-muted-foreground/60 cursor-default">
                          {formatRelativeTime(syncEntry?.lastSyncAt ?? null)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {formatExactTime(syncEntry?.lastSyncAt ?? null)}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
