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
    <tr className="border-b border-border transition-colors hover:bg-secondary/30">
      {/* Provider name + type badge */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{provider.name}</span>
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {typeLabels[provider.type] ?? provider.type}
          </span>
        </div>
      </td>

      {/* Status dot + label */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
          <span className="text-sm text-muted-foreground">{status.label}</span>
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
                  className="w-48 rounded-lg border border-border/50 bg-card px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                  autoFocus
                />
                <button
                  onClick={handleSaveKey}
                  className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-background transition hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingKey(false)
                    setApiKeyInput('')
                  }}
                  className="px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {provider.hasApiKey ? (
                  <span className="text-sm text-muted-foreground">*** Set</span>
                ) : (
                  <span className="text-sm text-muted-foreground/50">Not set</span>
                )}
                <button
                  onClick={() => setIsEditingKey(true)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {provider.hasApiKey ? 'Update' : 'Set'}
                </button>
              </>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/50">&mdash;</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onTestConnection}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting && <Loader2 size={12} className="animate-spin" />}
            Test
          </button>
          {provider.isCustom && onRemove && (
            <button
              onClick={onRemove}
              className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:text-red-400 hover:bg-red-500/10"
            >
              Remove
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
