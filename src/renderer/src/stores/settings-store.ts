import { create } from 'zustand'

interface SettingsState {
  settings: Record<string, unknown>
  isLoading: boolean
  loadSettings: () => Promise<void>
  getSetting: (key: string) => unknown
  setSetting: (key: string, value: unknown) => Promise<void>
  resetSettings: (namespace: string) => Promise<void>
}

/**
 * Resolve a dot-notation path in a nested object.
 * e.g. resolvePath({ a: { b: 1 } }, 'a.b') => 1
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Set a value at a dot-notation path in a nested object (immutably).
 * Returns a new object with the value set at the specified path.
 */
function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.')
  if (parts.length === 1) {
    return { ...obj, [parts[0]]: value }
  }

  const [head, ...rest] = parts
  const child = (obj[head] && typeof obj[head] === 'object') ? obj[head] as Record<string, unknown> : {}
  return {
    ...obj,
    [head]: setPath(child, rest.join('.'), value)
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  isLoading: true,

  loadSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api.settings.getAll()
      set({ settings: settings ?? {}, isLoading: false })
    } catch (err) {
      console.error('[settings-store] Failed to load settings:', err)
      set({ isLoading: false })
    }
  },

  getSetting: (key: string) => {
    return resolvePath(get().settings, key)
  },

  setSetting: async (key: string, value: unknown) => {
    // Optimistic local update
    set((state) => ({
      settings: setPath(state.settings, key, value)
    }))
    // Persist via IPC
    try {
      await window.api.settings.set(key, value)
    } catch (err) {
      console.error('[settings-store] Failed to persist setting:', key, err)
    }
  },

  resetSettings: async (namespace: string) => {
    await window.api.settings.reset(namespace)
    // Reload all settings after reset
    const settings = await window.api.settings.getAll()
    set({ settings })
  }
}))
