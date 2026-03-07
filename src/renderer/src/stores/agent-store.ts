import { create } from 'zustand'
import type { AgentProvider, AgentProviderPersist } from '../types/agent'
import { DEFAULT_PROVIDERS } from '../types/agent'

interface AgentStoreState {
  providers: AgentProvider[]
  isLoading: boolean
  loadProviders: () => Promise<void>
  testConnection: (providerId: string) => Promise<void>
  setApiKey: (providerId: string, apiKey: string) => Promise<void>
  addCustomProvider: (
    provider: Omit<AgentProvider, 'status' | 'isCustom' | 'hasApiKey'>
  ) => Promise<void>
  removeCustomProvider: (providerId: string) => Promise<void>
  getConfiguredProviders: () => AgentProvider[]
}

/**
 * Persist providers to settings (excluding runtime-only fields).
 */
async function persistProviders(providers: AgentProvider[]): Promise<void> {
  const serializable: AgentProviderPersist[] = providers.map(
    ({ status: _status, hasApiKey: _hasApiKey, ...rest }) => rest
  )
  await window.api.settings.set('agents.providers', serializable)
}

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  providers: [],
  isLoading: true,

  loadProviders: async () => {
    set({ isLoading: true })
    try {
      // Load saved providers from settings
      const saved = (await window.api.settings.get('agents.providers')) as
        | AgentProviderPersist[]
        | null

      // Build a map of saved providers by id for quick lookup
      const savedMap = new Map<string, AgentProviderPersist>()
      if (Array.isArray(saved)) {
        for (const p of saved) {
          savedMap.set(p.id, p)
        }
      }

      // Merge defaults with saved state — defaults are always present
      const merged: AgentProvider[] = DEFAULT_PROVIDERS.map((def) => {
        const s = savedMap.get(def.id)
        if (s) {
          return {
            ...def,
            model: s.model || def.model,
            baseUrl: s.baseUrl || def.baseUrl,
            command: s.command || def.command,
            status: 'not-configured' as const,
            hasApiKey: false
          }
        }
        return { ...def }
      })

      // Add custom providers from saved state
      if (Array.isArray(saved)) {
        const defaultIds = new Set(DEFAULT_PROVIDERS.map((d) => d.id))
        for (const s of saved) {
          if (!defaultIds.has(s.id)) {
            merged.push({
              ...s,
              status: 'not-configured',
              hasApiKey: false
            })
          }
        }
      }

      // Probe each provider for availability
      const probed = await Promise.all(
        merged.map(async (provider) => {
          if (provider.type === 'cli' && provider.command) {
            // CLI agent — check if the binary is available on PATH
            try {
              const result = await window.api.app.probeCli(provider.command)
              return {
                ...provider,
                status: result.available ? ('connected' as const) : ('not-configured' as const)
              }
            } catch {
              return provider
            }
          } else if (provider.requiresApiKey) {
            // Cloud/SDK agent — check if API key is stored
            try {
              const hasKey = await window.api.credentials.has(provider.id)
              return { ...provider, hasApiKey: hasKey }
            } catch {
              return provider
            }
          }
          return provider
        })
      )

      set({ providers: probed, isLoading: false })
    } catch (err) {
      console.error('[agent-store] Failed to load providers:', err)
      // Fall back to defaults so UI isn't stuck on "Loading providers..."
      set({ providers: DEFAULT_PROVIDERS.map((d) => ({ ...d })), isLoading: false })
    }
  },

  testConnection: async (providerId: string) => {
    // Set status to 'testing'
    set((state) => ({
      providers: state.providers.map((p) =>
        p.id === providerId ? { ...p, status: 'testing' as const } : p
      )
    }))

    const provider = get().providers.find((p) => p.id === providerId)
    if (!provider) return

    let newStatus: AgentProvider['status'] = 'not-configured'

    if (provider.type === 'cli' && provider.command) {
      // CLI agent — probe the binary
      try {
        const result = await window.api.app.probeCli(provider.command)
        newStatus = result.available ? 'connected' : 'failed'
      } catch {
        newStatus = 'failed'
      }
    } else if (provider.requiresApiKey) {
      // Cloud/custom: check if API key is set
      newStatus = provider.hasApiKey ? 'connected' : 'not-configured'
    } else {
      // Local: mark as connected
      newStatus = 'connected'
    }

    // Update status in store
    set((state) => ({
      providers: state.providers.map((p) =>
        p.id === providerId ? { ...p, status: newStatus } : p
      )
    }))
  },

  setApiKey: async (providerId: string, apiKey: string) => {
    await window.api.credentials.set(providerId, apiKey)

    set((state) => ({
      providers: state.providers.map((p) =>
        p.id === providerId ? { ...p, hasApiKey: true } : p
      )
    }))

    // Persist updated providers
    await persistProviders(get().providers)
  },

  addCustomProvider: async (
    provider: Omit<AgentProvider, 'status' | 'isCustom' | 'hasApiKey'>
  ) => {
    const newProvider: AgentProvider = {
      ...provider,
      id: `custom-${Date.now()}`,
      status: 'not-configured',
      isCustom: true,
      hasApiKey: false
    }

    set((state) => ({
      providers: [...state.providers, newProvider]
    }))

    await persistProviders(get().providers)
  },

  removeCustomProvider: async (providerId: string) => {
    const provider = get().providers.find((p) => p.id === providerId)
    if (!provider || !provider.isCustom) return

    set((state) => ({
      providers: state.providers.filter((p) => p.id !== providerId)
    }))

    await persistProviders(get().providers)
  },

  getConfiguredProviders: () => {
    return get().providers.filter((p) => p.status === 'connected' || p.hasApiKey)
  }
}))
