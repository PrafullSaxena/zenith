import { useEffect, useState } from 'react'
import { useAgentStore } from '../../stores/agent-store'
import { AgentRow } from './AgentRow'
import { AddCustomAgentForm } from './AddCustomAgentForm'
import { Plus } from 'lucide-react'

/**
 * Central AI agent configuration table view.
 * Shows all pre-listed and custom providers with status indicators,
 * API key management, and connection testing.
 */
export function AIAgentsSettings(): React.JSX.Element {
  const [showAddForm, setShowAddForm] = useState(false)

  const { providers, isLoading, loadProviders, testConnection, setApiKey, removeCustomProvider } =
    useAgentStore()

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      </div>
    )
  }

  return (
    <div className="stagger-children">
      <h2 className="mb-1 text-lg font-semibold text-text-primary">AI Agents</h2>
      <p className="mb-6 text-sm text-text-secondary">
        Configure AI providers for your plugins
      </p>

      {/* Providers table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Provider
              </th>
              <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Status
              </th>
              <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                API Key
              </th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <AgentRow
                key={provider.id}
                provider={provider}
                onTestConnection={() => testConnection(provider.id)}
                onSetApiKey={(key) => setApiKey(provider.id, key)}
                onRemove={provider.isCustom ? () => removeCustomProvider(provider.id) : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Custom Provider */}
      {showAddForm ? (
        <AddCustomAgentForm onClose={() => setShowAddForm(false)} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition hover:border-accent hover:text-accent"
        >
          <Plus size={14} />
          Add Custom Provider
        </button>
      )}
    </div>
  )
}
