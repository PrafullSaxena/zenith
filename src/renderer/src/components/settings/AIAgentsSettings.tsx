import { useEffect, useState } from 'react'
import { useAgentStore } from '../../stores/agent-store'
import { AgentRow } from './AgentRow'
import { AddCustomAgentForm } from './AddCustomAgentForm'
import { Plus } from 'lucide-react'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { Button } from '@renderer/components/ui/button'

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
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="stagger-children space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-foreground">AI Agents</h2>
        <p className="text-xs text-muted-foreground">
          Configure AI providers for your plugins
        </p>
      </div>

      {/* Providers table */}
      <div className="overflow-hidden rounded-lg border border-border/50">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Provider
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                API Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className=""
        >
          <Plus size={14} className="mr-1.5" />
          Add Custom Provider
        </Button>
      )}
    </div>
  )
}
