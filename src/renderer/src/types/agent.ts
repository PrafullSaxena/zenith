/**
 * AI Agent provider type definitions.
 * Used by the agent store and settings UI to manage AI providers.
 */

/** Connection status of an AI agent provider */
export type AgentStatus = 'connected' | 'failed' | 'not-configured' | 'testing'

/** Classification of agent provider */
export type AgentProviderType = 'cloud' | 'local' | 'cli' | 'custom'

/** Full agent provider configuration */
export interface AgentProvider {
  id: string // Unique identifier (e.g., 'claude', 'ollama-qwen25-pr-32k')
  name: string // Display name (e.g., 'Claude', 'Ollama Qwen 2.5 PR 32K')
  type: AgentProviderType // cloud, local, cli, or custom
  baseUrl: string // API base URL (empty for cloud/CLI providers)
  model: string // Model identifier (e.g., 'claude-sonnet-4-20250514')
  command: string // CLI command (e.g., 'claude -p'). Empty for SDK providers.
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
 * Pre-listed default providers — CLI-first.
 * Uses locally installed CLI tools that handle their own authentication.
 * Cloud/SDK providers can be added via "Add Custom Provider" if needed.
 */
export const DEFAULT_PROVIDERS: AgentProvider[] = [
  {
    id: 'claude',
    name: 'Claude',
    type: 'cli',
    baseUrl: '',
    model: '',
    command: 'claude -p --trust',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: false,
    hasApiKey: false
  },
  {
    id: 'codex',
    name: 'Codex',
    type: 'cli',
    baseUrl: '',
    model: '',
    command: 'codex exec --json --skip-git-repo-check -',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: false,
    hasApiKey: false
  },
  {
    id: 'gemini',
    name: 'Gemini',
    type: 'cli',
    baseUrl: '',
    model: '',
    command: 'gemini prompt -',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: false,
    hasApiKey: false
  },
  {
    id: 'ollama-qwen25-pr-32k',
    name: 'Ollama Qwen 2.5 PR 32K',
    type: 'cli',
    baseUrl: '',
    model: '',
    command: 'ollama run qwen25-pr-32k',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: false,
    hasApiKey: false
  },
  {
    id: 'ollama-qwen-coder-14b',
    name: 'Ollama Qwen 2.5 Coder 14B',
    type: 'cli',
    baseUrl: '',
    model: '',
    command: 'ollama run qwen2.5-coder:14b-instruct-q4_K_M',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: false,
    hasApiKey: false
  },
  {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    type: 'cloud',
    baseUrl: 'https://api2.cursor.sh/v1',
    model: 'gpt-4o',
    command: '',
    status: 'not-configured',
    isCustom: false,
    requiresApiKey: true,
    hasApiKey: false
  }
]
