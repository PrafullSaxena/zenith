import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { AgentProvider } from '../../types/agent'

interface AgentRowProps {
  provider: AgentProvider
  onTestConnection: () => void
  onSetApiKey: (key: string) => void
  onRemove?: () => void
}

const typeLabels: Record<string, string> = {
  cloud: 'Cloud',
  local: 'Local',
  cli: 'CLI',
  custom: 'Custom'
}

const statusConfig: Record<
  string,
  { dotClass: string; label: string }
> = {
  connected: { dotClass: 'bg-green-500', label: 'Connected' },
  failed: { dotClass: 'bg-red-500', label: 'Failed' },
  'not-configured': { dotClass: 'bg-gray-500', label: 'Not configured' },
  testing: { dotClass: 'bg-amber-500 animate-pulse', label: 'Testing...' }
}

/**
 * Single agent provider row within the AI Agents settings table.
 * Shows name, type badge, status dot, API key management, and action buttons.
 */
export function AgentRow({
  provider,
  onTestConnection,
  onSetApiKey,
  onRemove
}: AgentRowProps): React.JSX.Element {
  const [isEditingKey, setIsEditingKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')

  const status = statusConfig[provider.status] ?? statusConfig['not-configured']
  const isTesting = provider.status === 'testing'

  const handleSaveKey = (): void => {
    if (apiKeyInput.trim()) {
      onSetApiKey(apiKeyInput.trim())
      setApiKeyInput('')
      setIsEditingKey(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleSaveKey()
    if (e.key === 'Escape') {
      setIsEditingKey(false)
      setApiKeyInput('')
    }
  }

  return (
    <tr className="border-b border-border transition-colors hover:bg-surface-elevated/30">
      {/* Provider name + type badge */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{provider.name}</span>
          <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 text-xs text-text-secondary">
            {typeLabels[provider.type] ?? provider.type}
          </span>
        </div>
      </td>

      {/* Status dot + label */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
          <span className="text-sm text-text-secondary">{status.label}</span>
        </div>
      </td>

      {/* API Key management */}
      <td className="py-3 pr-4">
        {provider.requiresApiKey ? (
          <div className="flex items-center gap-2">
            {isEditingKey ? (
              <>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter API key"
                  className="w-48 rounded border border-border bg-surface-elevated px-2 py-1 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={handleSaveKey}
                  className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-background transition hover:bg-accent/90"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingKey(false)
                    setApiKeyInput('')
                  }}
                  className="px-2 py-1 text-xs text-text-secondary transition hover:text-text-primary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {provider.hasApiKey ? (
                  <span className="text-sm text-text-secondary">*** Set</span>
                ) : (
                  <span className="text-sm text-text-secondary/50">Not set</span>
                )}
                <button
                  onClick={() => setIsEditingKey(true)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary transition hover:border-accent hover:text-accent"
                >
                  {provider.hasApiKey ? 'Update' : 'Set'}
                </button>
              </>
            )}
          </div>
        ) : (
          <span className="text-sm text-text-secondary/50">&mdash;</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onTestConnection}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary transition hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting && <Loader2 size={12} className="animate-spin" />}
            Test
          </button>
          {provider.isCustom && onRemove && (
            <button
              onClick={onRemove}
              className="px-2 py-1 text-xs text-red-400 transition hover:text-red-300"
            >
              Remove
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
