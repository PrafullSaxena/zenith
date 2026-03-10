import Store from 'electron-store'

/**
 * Default settings structure. Seeded on first run.
 * Namespaces: general, plugins (per-plugin), agents (reserved for 01-05).
 */
const DEFAULTS: Record<string, unknown> = {
  general: {
    defaultView: 'dashboard',
    showWelcomeOnStart: true,
    workingDirectory: ''
  },
  plugins: {
    'code-review-bot': {
      bitbucketUsername: '',
      bitbucketAppPassword: ''
    },
    'db-inspector': {
      connections: []
    },
  },
  agents: {},
  reviewHistory: []
}

const store = new Store({ name: 'zenith-settings' })

// Seed defaults on first creation (empty store)
if (store.size === 0) {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    store.set(key, value)
  }
}

/**
 * Returns entire settings object.
 */
export function getSettings(): Record<string, unknown> {
  // JSON round-trip ensures a plain serializable object for IPC structured clone
  return JSON.parse(JSON.stringify(store.store)) as Record<string, unknown>
}

/**
 * Reads a single setting by dot-notation key.
 * e.g. 'plugins.code-review-bot.workspace'
 */
export function getSetting(key: string): unknown {
  return store.get(key)
}

/**
 * Writes a single setting by dot-notation key.
 * e.g. setSetting('general.defaultView', 'db-inspector')
 */
export function setSetting(key: string, value: unknown): void {
  store.set(key, value)
}

/**
 * Resets a namespace to its DEFAULTS subset.
 * e.g. resetSettings('plugins.code-review-bot') restores that plugin's defaults.
 * resetSettings('general') restores general defaults.
 */
export function resetSettings(namespace: string): void {
  // Walk DEFAULTS to find the matching subset
  const parts = namespace.split('.')
  let defaultSubset: unknown = DEFAULTS
  for (const part of parts) {
    if (defaultSubset && typeof defaultSubset === 'object' && part in defaultSubset) {
      defaultSubset = (defaultSubset as Record<string, unknown>)[part]
    } else {
      // No default defined for this namespace — clear it
      store.delete(namespace)
      return
    }
  }
  store.set(namespace, defaultSubset)
}

export { store as settingsStore }
