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
  const [providerType, setProviderType] = useState<'custom' | 'cli'>('cli')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [command, setCommand] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { addCustomProvider, setApiKey: storeSetApiKey } = useAgentStore()

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (providerType === 'cli') {
      if (!command.trim()) newErrors.command = 'Command is required'
    } else {
      if (!baseUrl.trim()) newErrors.baseUrl = 'Base URL is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!validate()) return

    await addCustomProvider({
      id: '', // Will be overwritten by store with custom-{timestamp}
      name: name.trim(),
      type: providerType,
      baseUrl: providerType === 'cli' ? '' : baseUrl.trim(),
      model: model.trim(),
      command: providerType === 'cli' ? command.trim() : '',
      requiresApiKey: providerType !== 'cli'
    })

    // If API key was provided, set it on the newly created provider
    if (apiKey.trim() && providerType !== 'cli') {
      const providers = useAgentStore.getState().providers
      const newest = providers[providers.length - 1]
      if (newest) {
        await storeSetApiKey(newest.id, apiKey.trim())
      }
    }

    onClose()
  }

  const inputClass =
    'w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition'

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h3 className="mb-3 text-[13px] font-medium text-foreground tracking-tight">Add Custom Provider</h3>

      {/* Provider type toggle */}
      <div className="mb-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setProviderType('cli')}
          className={`rounded-lg px-3 py-1 text-[11px] font-medium transition ${
            providerType === 'cli'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
          }`}
        >
          CLI Agent
        </button>
        <button
          type="button"
          onClick={() => setProviderType('custom')}
          className={`rounded-lg px-3 py-1 text-[11px] font-medium transition ${
            providerType === 'custom'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
          }`}
        >
          API Provider
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={providerType === 'cli' ? 'My CLI Agent' : 'My Provider'}
            className={inputClass}
          />
          {errors.name && <p className="mt-0.5 text-xs text-red-400">{errors.name}</p>}
        </div>

        {providerType === 'cli' ? (
          /* CLI Command */
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Command <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="my-agent -p"
              className={inputClass}
            />
            {errors.command && <p className="mt-0.5 text-xs text-red-400">{errors.command}</p>}
          </div>
        ) : (
          /* Base URL */
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
        )}

        {/* API Key — only for API providers */}
        {providerType !== 'cli' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
        )}

        {/* Model */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
          className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Add Provider
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-[12px] text-muted-foreground transition hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
