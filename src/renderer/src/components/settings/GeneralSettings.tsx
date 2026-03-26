import { useEffect } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { PLUGINS } from '../../plugins/registry'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { SettingsField } from './SettingsField'
import type { SettingsField as SettingsFieldDef } from '../../types/plugin'

// ---------------------------------------------------------------------------
// GeneralSettings
// ---------------------------------------------------------------------------

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
      <div className="p-4 space-y-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
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

  const pdfStyleField: SettingsFieldDef = {
    key: 'pdfStyle',
    label: 'PDF Style',
    type: 'select',
    description: 'Visual style for exported PDF documents.',
    defaultValue: 'colored',
    options: [
      { label: 'Traditional', value: 'traditional' },
      { label: 'Colored', value: 'colored' },
      { label: 'Pretty', value: 'pretty' }
    ]
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
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-foreground">General</h2>
        <p className="text-xs text-muted-foreground">Application-wide preferences and defaults.</p>
      </div>

      {/* ── Appearance ── */}
      <Card className="rounded-[22px]">
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <SettingsField
              field={hljsThemeField}
              value={getSetting('general.hljsTheme')}
              onChange={(value) => setSetting('general.hljsTheme', value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Behavior ── */}
      <Card className="rounded-[22px]">
        <CardHeader>
          <CardTitle className="text-lg">Behavior</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
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
        </CardContent>
      </Card>

      {/* ── Export ── */}
      <Card className="rounded-[22px]">
        <CardHeader>
          <CardTitle className="text-lg">Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <SettingsField
              field={pdfStyleField}
              value={getSetting('general.pdfStyle')}
              onChange={(value) => setSetting('general.pdfStyle', value)}
            />
            <SettingsField
              field={workingDirectoryField}
              value={getSetting('general.workingDirectory')}
              onChange={(value) => setSetting('general.workingDirectory', value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
