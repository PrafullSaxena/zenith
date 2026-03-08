/**
 * Token usage tracking store.
 *
 * Accumulates token consumption per AI session with provider attribution.
 * SDK providers report exact tokens; CLI providers use estimation (~4 chars/token).
 * Persisted via settings store for cross-session visibility on the dashboard.
 */

import { create } from 'zustand'

/** A single token usage entry from one AI session. */
export interface TokenUsageEntry {
  sessionId: string
  providerId: string
  providerName: string
  tokensUsed: number
  /** true for CLI providers where token count is estimated */
  isEstimated: boolean
  /** ISO 8601 timestamp */
  timestamp: string
}

interface TokenStoreState {
  entries: TokenUsageEntry[]
  isLoading: boolean

  loadEntries: () => Promise<void>
  addEntry: (entry: Omit<TokenUsageEntry, 'timestamp'>) => Promise<void>

  /** Sum of all tokensUsed across all entries. */
  getTotalTokens: () => number

  /** Tokens grouped by providerId → total. */
  getTokensByProvider: () => Record<string, { name: string; total: number; estimated: boolean }>

  /** Most recent N entries. */
  getRecentEntries: (limit?: number) => TokenUsageEntry[]
}

const STORAGE_KEY = 'tokens.usage'
const MAX_ENTRIES = 200

export const useTokenStore = create<TokenStoreState>((set, get) => ({
  entries: [],
  isLoading: true,

  loadEntries: async () => {
    set({ isLoading: true })
    try {
      const raw = await window.api.settings.get(STORAGE_KEY)
      const entries = Array.isArray(raw) ? (raw as TokenUsageEntry[]) : []
      set({ entries, isLoading: false })
    } catch {
      set({ entries: [], isLoading: false })
    }
  },

  addEntry: async (entry) => {
    const timestamp = new Date().toISOString()
    const newEntry: TokenUsageEntry = { ...entry, timestamp }

    const updated = [newEntry, ...get().entries].slice(0, MAX_ENTRIES)
    set({ entries: updated })
    await window.api.settings.set(STORAGE_KEY, updated)
  },

  getTotalTokens: () => {
    return get().entries.reduce((sum, e) => sum + e.tokensUsed, 0)
  },

  getTokensByProvider: () => {
    const map: Record<string, { name: string; total: number; estimated: boolean }> = {}
    for (const e of get().entries) {
      if (!map[e.providerId]) {
        map[e.providerId] = { name: e.providerName, total: 0, estimated: e.isEstimated }
      }
      map[e.providerId].total += e.tokensUsed
    }
    return map
  },

  getRecentEntries: (limit = 20) => {
    return get().entries.slice(0, limit)
  }
}))
