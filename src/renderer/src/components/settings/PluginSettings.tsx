import { useEffect, useState, useCallback } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useAgentStore } from '../../stores/agent-store'
import { getPluginById } from '../../plugins/registry'
import { SettingsField } from './SettingsField'
import type { PluginId } from '../../types/plugin'

interface PluginSettingsProps {
  pluginId: PluginId
}

/**
 * Dynamic settings form driven by a plugin's settingsSchema.
 * Reads/writes 'plugins.{pluginId}.{field.key}' via the settings store.
 */
export function PluginSettings({ pluginId }: PluginSettingsProps): React.JSX.Element {
  const { isLoading, loadSettings, getSetting, setSetting } = useSettingsStore()
  const { providers, loadProviders } = useAgentStore()
  // Derive configured providers from reactive providers array for proper re-renders
  const configuredProviders = providers.filter((p) => p.status === 'connected' || p.hasApiKey)
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  useEffect(() => {
    loadSettings()
    loadProviders()
  }, [loadSettings, loadProviders])

  const plugin = getPluginById(pluginId)

  const handleChange = useCallback(
    (fieldKey: string, value: unknown) => {
      // Run field-level validation if defined
      const field = plugin?.settingsSchema.find((f) => f.key === fieldKey)
      if (field?.validate) {
        const error = field.validate(value)
        setErrors((prev) => ({ ...prev, [fieldKey]: error }))
        // Still save even if validation fails — user can see error inline
      }

      setSetting(`plugins.${pluginId}.${fieldKey}`, value)
    },
    [plugin, pluginId, setSetting]
  )

  if (!plugin) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-text-secondary">Plugin not found</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-text-secondary">Loading settings...</span>
      </div>
    )
  }

  if (plugin.settingsSchema.length === 0) {
    return (
      <div>
        <h2 className="mb-6 text-lg font-semibold text-text-primary">{plugin.name}</h2>
        <p className="text-sm text-text-secondary">No settings available for this plugin.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-text-primary">{plugin.name}</h2>
      <p className="mb-6 text-sm text-text-secondary">{plugin.description}</p>

      {plugin.settingsSchema.map((field) => (
        <SettingsField
          key={field.key}
          field={field}
          value={getSetting(`plugins.${pluginId}.${field.key}`) ?? field.defaultValue}
          onChange={(value) => handleChange(field.key, value)}
          error={errors[field.key]}
        />
      ))}

      {/* Default AI Agent dropdown */}
      <div className="mt-6 border-t border-border pt-5">
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Default AI Agent
        </label>
        <select
          className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition appearance-none"
          value={
            (getSetting(`plugins.${pluginId}.defaultAgent`) as string) ?? ''
          }
          onChange={(e) =>
            setSetting(`plugins.${pluginId}.defaultAgent`, e.target.value || null)
          }
        >
          <option value="">None selected</option>
          {(configuredProviders.length > 0 ? configuredProviders : providers).map(
            (provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            )
          )}
        </select>
        <p className="mt-1 text-xs text-text-secondary">
          Select the AI provider to use with this plugin
        </p>
      </div>
    </div>
  )
}
