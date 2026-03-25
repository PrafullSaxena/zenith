import { useEffect, useState } from 'react'
import { useAgentStore } from '../../stores/agent-store'
import { AgentRow } from './AgentRow'
import { AddCustomAgentForm } from './AddCustomAgentForm'
import { Plus } from 'lucide-react'
import { GlassSkeleton } from '../ui'

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
      <div className="space-y-4 py-4">
        <GlassSkeleton variant="text" className="h-6 w-32" />
        <GlassSkeleton variant="card" className="h-16" />
        <GlassSkeleton variant="card" className="h-16" />
        <GlassSkeleton variant="card" className="h-16" />
      </div>
    )
  }

  return (
    <div className="stagger-children">
      <h2 className="mb-1 text-lg font-semibold text-text-primary">AI Agents</h2>
      <p className="mb-6 text-xs text-text-secondary">
        Configure AI providers for your plugins
      </p>

      {/* Providers table */}
      <div className="overflow-hidden rounded-lg border border-border/50">
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
