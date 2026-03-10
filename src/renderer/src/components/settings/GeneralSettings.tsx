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
      { label: 'Portfolio (Amber)', value: 'portfolio' },
      { label: 'Nord Aurora (Blue)', value: 'nord' },
      { label: 'Rosé Pine (Rose)', value: 'rose-pine' },
      { label: 'Dracula (Purple)', value: 'dracula' },
      { label: 'Gruvbox (Orange)', value: 'gruvbox' },
      { label: 'Tokyo Night (Indigo)', value: 'tokyo-night' },
      { label: 'Synthwave \'84 (Pink)', value: 'synthwave' },
      { label: 'Catppuccin (Lavender)', value: 'catppuccin' },
      { label: 'Emerald Matrix (Green)', value: 'emerald' },
      { label: 'Solarized Dark (Teal)', value: 'solarized' },
      { label: 'Crimson Night (Red)', value: 'crimson' }
    ]
  }

  const hljsThemeField: SettingsFieldDef = {
    key: 'hljsTheme',
    label: 'Code Highlight Theme',
    type: 'select',
    description: 'Syntax highlighting theme for code blocks and diffs',
    defaultValue: 'zenith',
    options: [
      { label: 'Zenith (Default)', value: 'zenith' },
      { label: 'GitHub Dark', value: 'github-dark' },
      { label: 'GitHub Dark Dimmed', value: 'github-dark-dimmed' },
      { label: 'Atom One Dark', value: 'atom-one-dark' },
      { label: 'Monokai', value: 'monokai' },
      { label: 'Monokai Sublime', value: 'monokai-sublime' },
      { label: 'Nord', value: 'nord' },
      { label: 'Tokyo Night', value: 'tokyo-night-dark' },
      { label: 'Night Owl', value: 'night-owl' },
      { label: 'Dracula / Obsidian', value: 'obsidian' },
      { label: 'VS 2015', value: 'vs2015' },
      { label: 'Rose Pine', value: 'rose-pine' },
      { label: 'Rose Pine Moon', value: 'rose-pine-moon' },
      { label: 'Panda Syntax', value: 'panda-syntax-dark' },
      { label: 'Shades of Purple', value: 'shades-of-purple' },
      { label: 'A11y Dark', value: 'a11y-dark' },
      { label: 'Agate', value: 'agate' },
      { label: 'An Old Hope', value: 'an-old-hope' },
      { label: 'Tomorrow Night Bright', value: 'tomorrow-night-bright' },
      { label: 'Srcery', value: 'srcery' }
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
      <h2 className="mb-1 text-lg font-semibold text-text-primary">General</h2>
      <p className="mb-6 text-xs text-text-secondary">Application-wide preferences and defaults.</p>

      <SettingsField
        field={themeField}
        value={getSetting('general.theme')}
        onChange={(value) => setSetting('general.theme', value)}
      />

      <SettingsField
        field={hljsThemeField}
        value={getSetting('general.hljsTheme')}
        onChange={(value) => setSetting('general.hljsTheme', value)}
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
