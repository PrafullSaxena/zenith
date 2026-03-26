import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useSettingsStore } from '../../stores/settings-store'
import { PLUGINS } from '../../plugins/registry'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { cn } from '@renderer/lib/utils'
import { getClassicThemes, getNewThemes } from '@renderer/lib/theme-metadata'
import type { ThemeMeta } from '@renderer/lib/theme-metadata'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import { SettingsField } from './SettingsField'
import type { SettingsField as SettingsFieldDef } from '../../types/plugin'

// ---------------------------------------------------------------------------
// Theme crossfade — adds a brief transition class on theme switch
// ---------------------------------------------------------------------------

function triggerThemeCrossfade(): void {
  document.documentElement.classList.add('theme-transitioning')
  setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 350)
}

// ---------------------------------------------------------------------------
// ThemeCard — inline sub-component for the visual theme selector grid
// ---------------------------------------------------------------------------

function ThemeCard({
  theme,
  isActive,
  onSelect
}: {
  theme: ThemeMeta
  isActive: boolean
  onSelect: () => void
}): React.JSX.Element {
  return (
    <Card
      className={cn(
        'relative cursor-pointer rounded-[22px] transition-all duration-200 hover:-translate-y-0.5',
        isActive && 'border-primary shadow-[0_0_8px_hsl(var(--primary)/0.3)]'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <span className="text-sm font-medium text-foreground">{theme.label}</span>
        <div className="mt-2 flex gap-1.5">
          {Object.values(theme.colors).map((color, i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full border border-border/20"
              style={{ backgroundColor: color || 'hsl(var(--card))' }}
            />
          ))}
        </div>

        {/* Mini preview strip */}
        <div
          className="mt-2 h-5 w-20 rounded-sm overflow-hidden relative"
          style={{ backgroundColor: theme.colors.bg }}
        >
          <div
            className="absolute inset-0.5 rounded-sm border"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)'
            }}
          />
          <div
            className="absolute bottom-0 left-1 right-1 h-px"
            style={{ backgroundColor: theme.colors.accent }}
          />
        </div>

        {/* Active check icon OR NEW badge for new collection themes */}
        {isActive ? (
          <Check size={14} className="absolute top-2 right-2 text-primary" />
        ) : (
          theme.section === 'new' && (
            <Badge variant="default" className="absolute top-2 right-2 text-[10px]">
              NEW
            </Badge>
          )
        )}
      </CardContent>
    </Card>
  )
}

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

  const currentTheme = (getSetting('general.theme') as string) ?? 'default'
  const classicThemes = getClassicThemes()
  const newThemes = getNewThemes().filter((t) => t.colors.bg !== '')

  // Define general settings fields (non-theme)
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

      {/* ── Theme Selector Grid (visual centerpiece) ── */}
      <Card className="rounded-[22px] border-primary/10 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.15)]">
        <CardHeader>
          <CardTitle className="text-lg">Theme</CardTitle>
          <p className="text-xs text-muted-foreground">Color theme for the application</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Classic Themes</p>
              <motion.div className="grid grid-cols-3 gap-3" variants={staggerContainer} initial="hidden" animate="visible">
                {classicThemes.map((theme) => (
                  <motion.div key={theme.value} variants={staggerItem}>
                    <ThemeCard
                      theme={theme}
                      isActive={currentTheme === theme.value}
                      onSelect={() => { triggerThemeCrossfade(); setSetting('general.theme', theme.value); }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
            {newThemes.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">New Collection</p>
                <motion.div className="grid grid-cols-3 gap-3" variants={staggerContainer} initial="hidden" animate="visible">
                  {newThemes.map((theme) => (
                    <motion.div key={theme.value} variants={staggerItem}>
                      <ThemeCard
                        theme={theme}
                        isActive={currentTheme === theme.value}
                        onSelect={() => { triggerThemeCrossfade(); setSetting('general.theme', theme.value); }}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
