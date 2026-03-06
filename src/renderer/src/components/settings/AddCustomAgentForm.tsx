import { useState } from 'react'
import { useAgentStore } from '../../stores/agent-store'

interface AddCustomAgentFormProps {
  onClose: () => void
}

/**
 * Inline form to add a custom AI provider.
 * Appears below the agents table when "Add Custom Provider" is clicked.
 */
export function AddCustomAgentForm({ onClose }: AddCustomAgentFormProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { addCustomProvider, setApiKey: storeSetApiKey } = useAgentStore()

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (!baseUrl.trim()) newErrors.baseUrl = 'Base URL is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!validate()) return

    await addCustomProvider({
      id: '', // Will be overwritten by store with custom-{timestamp}
      name: name.trim(),
      type: 'custom',
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      requiresApiKey: true
    })

    // If API key was provided, set it on the newly created provider
    if (apiKey.trim()) {
      const providers = useAgentStore.getState().providers
      const newest = providers[providers.length - 1]
      if (newest) {
        await storeSetApiKey(newest.id, apiKey.trim())
      }
    }

    onClose()
  }

  const inputClass =
    'w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition'

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">Add Custom Provider</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Provider"
            className={inputClass}
          />
          {errors.name && <p className="mt-0.5 text-xs text-red-400">{errors.name}</p>}
        </div>

        {/* Base URL */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Base URL <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
            className={inputClass}
          />
          {errors.baseUrl && <p className="mt-0.5 text-xs text-red-400">{errors.baseUrl}</p>}
        </div>

        {/* API Key */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className={inputClass}
          />
        </div>

        {/* Model */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Model
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="model-name"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-background transition hover:bg-accent/90"
        >
          Add Provider
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-text-secondary transition hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
