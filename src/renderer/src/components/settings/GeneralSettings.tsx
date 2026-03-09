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
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      </div>
    )
  }

  // Define general settings fields
  const defaultViewField: SettingsFieldDef = {
    key: 'defaultView',
    label: 'Default View',
    type: 'select',
    description: 'The view to show when the app starts',
    defaultValue: 'dashboard',
    options: [
      { label: 'Zenith', value: 'dashboard' },
      ...PLUGINS.map((p) => ({ label: p.name, value: p.id }))
    ]
  }

  const themeField: SettingsFieldDef = {
    key: 'theme',
    label: 'Theme',
    type: 'select',
    description: 'Color theme for the application',
    defaultValue: 'zenith',
    options: [
      { label: 'Zenith (Cyan)', value: 'zenith' },
      { label: 'Portfolio (Amber)', value: 'portfolio' }
    ]
  }

  const showWelcomeField: SettingsFieldDef = {
    key: 'showWelcomeOnStart',
    label: 'Show welcome on start',
    type: 'boolean',
    description: 'Display the welcome screen when the app launches',
    defaultValue: true
  }

  const workingDirectoryField: SettingsFieldDef = {
    key: 'workingDirectory',
    label: 'Working Directory',
    type: 'directory',
    description: 'Default folder for exports and saved files. Leave empty to use OS Downloads folder.',
    defaultValue: '',
    placeholder: 'Default (OS Downloads folder)'
  }

  return (
    <div className="stagger-children">
      <h2 className="mb-6 text-lg font-semibold text-text-primary">General</h2>

      <SettingsField
        field={themeField}
        value={getSetting('general.theme')}
        onChange={(value) => setSetting('general.theme', value)}
      />

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

      <SettingsField
        field={workingDirectoryField}
        value={getSetting('general.workingDirectory')}
        onChange={(value) => setSetting('general.workingDirectory', value)}
      />
    </div>
  )
}
