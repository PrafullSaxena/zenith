/**
 * Zustand store for the Launchpad cloud cost estimator plugin.
 *
 * Manages cloud provider selection, service selections, resource configs,
 * estimation history, AI advisor sessions, and PDF export.
 *
 * Follows the same patterns as db-store.ts:
 *  - IPC calls via window.api.settings.* for history persistence
 *  - AI streaming via window.api.ai.startAnalysis + IPC event listeners
 *  - Token tracking via useTokenStore
 */

import { create } from 'zustand'
import type {
  CloudProvider,
  ServiceSelection,
  ResourceConfig,
  EstimationEntry,
  EstimationExport,
  AiAdvisorSession,
  AiSuggestion,
  LaunchpadTab
} from '../types/launchpad'
import { calculateTotalCost } from '../data/cloud-pricing/calculator'
import { getCatalog } from '../data/cloud-pricing/index'
import { useTokenStore } from './token-store'

// ── Constants ───────────────────────────────────────────────────────

const HISTORY_STORAGE_KEY = 'launchpad.estimationHistory'
const MAX_HISTORY_ENTRIES = 50

// ── AI System Prompt ─────────────────────────────────────────────────

const LAUNCHPAD_AI_SYSTEM_PROMPT = `You are a cloud infrastructure cost advisor. The user wants help choosing cloud services and estimating costs for their project.

Analyze the user's requirements and suggest an appropriate cloud setup. Be specific about service choices and configurations.

When you have a concrete recommendation, output it as a JSON block in this format:

\`\`\`suggestions
{
  "provider": "aws",
  "services": [
    {
      "serviceId": "ec2",
      "config": {
        "instanceType": "t3.micro",
        "usageHoursPerMonth": 730,
        "quantity": 1
      }
    }
  ]
}
\`\`\`

Supported providers: "aws", "gcp", "azure"

For AWS service IDs: ec2, lambda, s3, ebs, rds, dynamodb, data-transfer-out, cloudfront, api-gateway
For GCP service IDs: compute-engine, cloud-functions, cloud-storage, persistent-disk, cloud-sql, firestore, gcp-data-transfer-out, cloud-cdn, cloud-run
For Azure service IDs: azure-vm, azure-functions, blob-storage, premium-ssd, azure-sql, cosmos-db, azure-data-transfer-out, azure-cdn, app-service

Only include the suggestions block when you have a specific recommendation. Explain your reasoning before or after the block.`

// ── Suggestion parser ────────────────────────────────────────────────

/**
 * Parse structured AI suggestions from a code-fenced block.
 * Returns null on any failure — lenient parsing, never throws.
 */
function parseSuggestions(rawText: string): AiSuggestion | null {
  try {
    const match = /```suggestions\s*([\s\S]*?)```/.exec(rawText)
    if (!match) return null
    const parsed = JSON.parse(match[1].trim()) as AiSuggestion
    // Basic validation
    if (!parsed.provider || !Array.isArray(parsed.services)) return null
    return parsed
  } catch {
    return null
  }
}

// ── Store interface ──────────────────────────────────────────────────

interface LaunchpadStore {
  // State
  provider: CloudProvider | null
  selectedServices: ServiceSelection[]
  activeTab: LaunchpadTab
  history: EstimationEntry[]
  aiSession: AiAdvisorSession | null
  pendingSuggestions: AiSuggestion | null
  comparisonProviders: CloudProvider[]

  // Computed getters
  getCurrentCatalog: () => ReturnType<typeof getCatalog> | null
  getTotalCost: () => { monthly: number; yearly: number }

  // Actions
  setProvider: (provider: CloudProvider) => void
  setActiveTab: (tab: LaunchpadTab) => void
  addService: (categoryId: string, serviceId: string) => void
  removeService: (serviceId: string) => void
  updateServiceConfig: (serviceId: string, config: ResourceConfig) => void
  saveEstimation: (name: string) => Promise<void>
  loadHistory: () => Promise<void>
  loadEstimation: (entry: EstimationEntry) => void
  deleteHistoryEntry: (id: string) => Promise<void>
  clearEstimation: () => void
  startAiChat: (question: string, agentId: string, model: string, command?: string) => Promise<void>
  cancelAiChat: () => void
  applySuggestions: () => void
  dismissSuggestions: () => void
  setComparisonProviders: (providers: CloudProvider[]) => void
  exportPdf: () => Promise<string | null>
}

// ── Store creation ───────────────────────────────────────────────────

export const useLaunchpadStore = create<LaunchpadStore>((set, get) => ({
  // ── Initial state ────────────────────────────────────────────────

  provider: null,
  selectedServices: [],
  activeTab: 'estimator',
  history: [],
  aiSession: null,
  pendingSuggestions: null,
  comparisonProviders: [],

  // ── Computed getters ─────────────────────────────────────────────

  getCurrentCatalog: () => {
    const { provider } = get()
    if (!provider) return null
    return getCatalog(provider)
  },

  getTotalCost: () => {
    const { provider, selectedServices } = get()
    if (!provider || selectedServices.length === 0) {
      return { monthly: 0, yearly: 0 }
    }
    const catalog = getCatalog(provider)
    const result = calculateTotalCost(selectedServices, catalog)
    return { monthly: result.totalMonthly, yearly: result.totalYearly }
  },

  // ── Actions ──────────────────────────────────────────────────────

  setProvider: (provider) => {
    set({ provider, selectedServices: [] })
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab })
  },

  addService: (categoryId, serviceId) => {
    const { provider, selectedServices } = get()
    if (!provider) return

    // Don't add duplicates
    if (selectedServices.some((s) => s.serviceId === serviceId)) return

    const catalog = getCatalog(provider)
    // Find service to get default config values from configSchema
    let defaultConfig: ResourceConfig = {}
    for (const category of catalog.categories) {
      if (category.id === categoryId) {
        const service = category.services.find((s) => s.id === serviceId)
        if (service) {
          for (const [key, field] of Object.entries(service.configSchema)) {
            if (field.default !== undefined) {
              defaultConfig[key] = field.default
            }
          }
          break
        }
      }
    }

    const newSelection: ServiceSelection = {
      serviceId,
      categoryId,
      config: defaultConfig
    }

    set({ selectedServices: [...selectedServices, newSelection] })
  },

  removeService: (serviceId) => {
    set({
      selectedServices: get().selectedServices.filter((s) => s.serviceId !== serviceId)
    })
  },

  updateServiceConfig: (serviceId, config) => {
    set({
      selectedServices: get().selectedServices.map((s) =>
        s.serviceId === serviceId ? { ...s, config } : s
      )
    })
  },

  saveEstimation: async (name) => {
    const { provider, selectedServices } = get()
    if (!provider) return

    const catalog = getCatalog(provider)
    const result = calculateTotalCost(selectedServices, catalog)

    const entry: EstimationEntry = {
      id: `est-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      provider,
      savedAt: new Date().toISOString(),
      services: selectedServices,
      totalMonthly: result.totalMonthly,
      totalYearly: result.totalYearly
    }

    const updated = [entry, ...get().history].slice(0, MAX_HISTORY_ENTRIES)
    set({ history: updated })
    await window.api.settings.set(HISTORY_STORAGE_KEY, updated)
  },

  loadHistory: async () => {
    try {
      const raw = await window.api.settings.get(HISTORY_STORAGE_KEY)
      const history = Array.isArray(raw) ? (raw as EstimationEntry[]) : []
      set({ history: history.slice(0, MAX_HISTORY_ENTRIES) })
    } catch {
      set({ history: [] })
    }
  },

  loadEstimation: (entry) => {
    set({
      provider: entry.provider,
      selectedServices: entry.services,
      activeTab: 'estimator'
    })
  },

  deleteHistoryEntry: async (id) => {
    const updated = get().history.filter((e) => e.id !== id)
    set({ history: updated })
    await window.api.settings.set(HISTORY_STORAGE_KEY, updated)
  },

  clearEstimation: () => {
    set({
      provider: null,
      selectedServices: [],
      pendingSuggestions: null
    })
  },

  startAiChat: async (question, agentId, model, command) => {
    const sessionId = `launchpad-ai-${Date.now()}`
    const session: AiAdvisorSession = {
      sessionId,
      status: 'streaming',
      rawText: '',
      question
    }
    set({ aiSession: session })

    try {
      // Set up streaming listeners
      window.api.ai.onStreamChunk((data) => {
        const current = get().aiSession
        if (!current || current.sessionId !== data.sessionId) return
        const rawText = current.rawText + data.chunk
        set({ aiSession: { ...current, rawText } })
      })

      window.api.ai.onStreamDone((data) => {
        const current = get().aiSession
        if (!current || current.sessionId !== data.sessionId) return

        // Parse suggestions from completed response
        const suggestions = parseSuggestions(current.rawText)
        set({
          aiSession: { ...current, status: 'complete' },
          pendingSuggestions: suggestions
        })

        // Capture token usage
        const tokensUsed = data.usage
          ? data.usage.totalTokens
          : Math.max(1, Math.ceil(current.rawText.length / 4))
        const isEstimated = data.usage ? data.usage.isEstimated : true
        useTokenStore.getState().addEntry({
          sessionId: data.sessionId,
          providerId: agentId,
          providerName: model,
          tokensUsed,
          isEstimated
        })

        window.api.ai.removeStreamListeners()
      })

      window.api.ai.onStreamError((data) => {
        const current = get().aiSession
        if (!current || current.sessionId !== data.sessionId) return
        set({ aiSession: { ...current, status: 'error', error: data.error } })
        window.api.ai.removeStreamListeners()
      })

      // Start AI analysis with launchpad-specific system prompt
      await window.api.ai.startAnalysis(
        agentId,
        model,
        LAUNCHPAD_AI_SYSTEM_PROMPT,
        question,
        sessionId,
        command
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start AI chat'
      set({ aiSession: { ...session, status: 'error', error: message } })
    }
  },

  cancelAiChat: () => {
    const current = get().aiSession
    if (current && current.status === 'streaming') {
      window.api.ai.cancelAnalysis(current.sessionId)
      set({ aiSession: { ...current, status: 'idle' } })
      window.api.ai.removeStreamListeners()
    }
  },

  applySuggestions: () => {
    const { pendingSuggestions } = get()
    if (!pendingSuggestions) return

    // Convert AI suggestion services to ServiceSelection format
    const services: ServiceSelection[] = pendingSuggestions.services.map((s) => ({
      serviceId: s.serviceId,
      categoryId: '', // UI will resolve categoryId on render
      config: s.config
    }))

    set({
      provider: pendingSuggestions.provider,
      selectedServices: services,
      pendingSuggestions: null,
      activeTab: 'estimator'
    })
  },

  dismissSuggestions: () => {
    set({ pendingSuggestions: null })
  },

  setComparisonProviders: (providers) => {
    set({ comparisonProviders: providers })
  },

  exportPdf: async () => {
    const { provider, selectedServices, aiSession } = get()
    if (!provider) return null

    const catalog = getCatalog(provider)
    const result = calculateTotalCost(selectedServices, catalog)

    // Build line items for PDF from calculator results
    const serviceConfigMap: Record<string, ResourceConfig> = {}
    for (const sel of selectedServices) {
      serviceConfigMap[sel.serviceId] = sel.config
    }

    const lineItems: EstimationExport['lineItems'] = result.items.map((item) => ({
      serviceName: item.serviceName,
      configSummary: Object.entries(serviceConfigMap[item.serviceId] ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(', '),
      monthly: item.monthly,
      yearly: item.yearly
    }))

    const estimation: EstimationExport = {
      name: 'Cloud Cost Estimation',
      provider,
      lineItems,
      totalMonthly: result.totalMonthly,
      totalYearly: result.totalYearly,
      aiRecommendations: aiSession?.rawText || undefined
    }

    try {
      const response = await window.api.launchpad.exportPdf(estimation)
      return response.filePath
    } catch (err) {
      console.error('[launchpad-store] PDF export failed:', err)
      return null
    }
  }
}))
