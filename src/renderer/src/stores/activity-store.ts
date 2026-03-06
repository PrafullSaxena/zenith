import { create } from 'zustand'
import type { ActivityEntry } from '../types/activity'

interface ActivityStoreState {
  entries: ActivityEntry[]
  isLoading: boolean
  loadEntries: () => Promise<void>
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => Promise<void>
  clearEntries: () => Promise<void>
  getRecentEntries: (limit?: number) => ActivityEntry[]
  getEntriesByPlugin: (pluginId: string) => ActivityEntry[]
}

/** Maximum number of activity entries to retain. */
const MAX_ENTRIES = 500

/** Settings key used for IPC persistence via electron-store. */
const STORAGE_KEY = 'activity.log'

export const useActivityStore = create<ActivityStoreState>((set, get) => ({
  entries: [],
  isLoading: true,

  loadEntries: async () => {
    set({ isLoading: true })
    const raw = await window.api.settings.get(STORAGE_KEY)
    const entries = Array.isArray(raw) ? (raw as ActivityEntry[]) : []
    set({ entries, isLoading: false })
  },

  addEntry: async (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const timestamp = new Date().toISOString()
    const newEntry: ActivityEntry = { ...entry, id, timestamp }

    // Prepend new entry and cap at MAX_ENTRIES
    const updated = [newEntry, ...get().entries].slice(0, MAX_ENTRIES)

    // Optimistic local update
    set({ entries: updated })

    // Persist via IPC
    await window.api.settings.set(STORAGE_KEY, updated)
  },

  clearEntries: async () => {
    set({ entries: [] })
    await window.api.settings.set(STORAGE_KEY, [])
  },

  getRecentEntries: (limit = 20) => {
    return get().entries.slice(0, limit)
  },

  getEntriesByPlugin: (pluginId: string) => {
    return get().entries.filter((e) => e.pluginId === pluginId)
  }
}))
