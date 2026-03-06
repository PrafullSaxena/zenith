/**
 * AI Agent provider type definitions.
 * Used by the agent store and settings UI to manage AI providers.
 */

/** Connection status of an AI agent provider */
export type AgentStatus = 'connected' | 'failed' | 'not-configured' | 'testing'

/** Classification of agent provider */
export type AgentProviderType = 'cloud' | 'local' | 'custom'

/** Full agent provider configuration */
export interface AgentProvider {
  id: string // Unique identifier (e.g., 'claude', 'ollama', 'custom-xyz')
  name: string // Display name (e.g., 'Claude', 'Ollama')
  type: AgentProviderType // cloud, local, or custom
  baseUrl: string // API base URL (empty for cloud providers that use official SDK)
  model: string // Model identifier (e.g., 'claude-sonnet-4-20250514', 'llama3')
  status: AgentStatus // Current connection status
  isCustom: boolean // true for user-added providers
  requiresApiKey: boolean // Whether this provider needs an API key
  hasApiKey: boolean // Whether API key has been set (from credentials store)
}

/**
 * Serializable subset of AgentProvider for persistence.
 * Excludes runtime-only fields (status, hasApiKey) that are
 * reconstructed on load.
 */
export type AgentProviderPersist = Omit<AgentProvider, 'status' | 'hasApiKey'>

/**
 * Pre-listed default providers. Always present in the provider list;
 * user-saved state overrides status/model/baseUrl but cannot remove defaults.
 */
export const DEFAULT_PROVIDERS: AgentProvider[] = [
  {
    id: 'claude',
    name: 'Claude',
    type: 'cloud',
    baseUrl: '',
    model: 'claude-sonnet-4-20250514',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: true,
    hasApiKey: false
  },
  {
    id: 'gemini',
    name: 'Gemini',
    type: 'cloud',
    baseUrl: '',
    model: 'gemini-2.0-flash',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: true,
    hasApiKey: false
  },
  {
    id: 'codex',
    name: 'Codex',
    type: 'cloud',
    baseUrl: '',
    model: 'codex',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: true,
    hasApiKey: false
  },
  {
    id: 'opencode',
    name: 'Opencode',
    type: 'cloud',
    baseUrl: '',
    model: '',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: true,
    hasApiKey: false
  },
  {
    id: 'ollama',
    name: 'Ollama',
    type: 'local',
    baseUrl: 'http://localhost:11434',
    model: '',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: false,
    hasApiKey: false
  },
  {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    type: 'local',
    baseUrl: '',
    model: '',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: false,
    hasApiKey: false
  }
]
