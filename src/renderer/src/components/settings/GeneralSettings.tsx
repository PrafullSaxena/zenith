import { useEffect } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { PLUGINS } from '../../plugins/registry'
import { SettingsField } from './SettingsField'
import type { SettingsField as SettingsFieldDef } from '../../types/plugin'

/**
 * General application settings form.
 * Reads/writes 'general.*' keys via the settings store.
 */
export function GeneralSettings(): React.JSX.Element {
  const { isLoading, loadSettings, getSetting, setSetting } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-text-secondary">Loading settings...</span>
      </div>
    )
  }

  // Define general settings fields
  const defaultViewField: SettingsFieldDef = {
    key: 'defaultView',
    label: 'Default View',
    type: 'select',
    description: 'The view to show when the app starts',
    defaultValue: 'code-review-bot',
    options: PLUGINS.map((p) => ({ label: p.name, value: p.id }))
  }

  const showWelcomeField: SettingsFieldDef = {
    key: 'showWelcomeOnStart',
    label: 'Show welcome on start',
    type: 'boolean',
    description: 'Display the welcome screen when the app launches',
    defaultValue: true
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-text-primary">General</h2>

      <SettingsField
        field={defaultViewField}
        value={getSetting('general.defaultView')}
        onChange={(value) => setSetting('general.defaultView', value)}
      />

      <SettingsField
        field={showWelcomeField}
        value={getSetting('general.showWelcomeOnStart')}
        onChange={(value) => setSetting('general.showWelcomeOnStart', value)}
      />
    </div>
  )
}
