/**
 * useCodeMirrorTheme — reactive CodeMirror theme that syncs with
 * the `general.hljsTheme` setting.
 *
 * Returns a Compartment + the current theme Extension.
 * Consumers should:
 *  1. Include `compartment.of(theme)` in the initial extensions.
 *  2. Re-dispatch `compartment.reconfigure(theme)` when `theme` changes.
 */
import { useMemo } from 'react'
import { Compartment } from '@codemirror/state'
import { useSettingsStore } from '../stores/settings-store'
import { getCodeMirrorTheme } from '../lib/codemirror-themes'
import type { Extension } from '@codemirror/state'

interface UseCodeMirrorThemeResult {
  /** Stable Compartment — use in initial extensions: `compartment.of(theme)` */
  compartment: Compartment
  /** Current theme extension — reconfigure when this changes */
  theme: Extension[]
  /** Raw setting key for dependency tracking */
  hljsTheme: string | undefined
}

export function useCodeMirrorTheme(): UseCodeMirrorThemeResult {
  const hljsTheme = useSettingsStore((s) => s.getSetting('general.hljsTheme')) as string | undefined

  // Stable compartment — created once per component instance
  const compartment = useMemo(() => new Compartment(), [])

  const theme = useMemo(() => getCodeMirrorTheme(hljsTheme), [hljsTheme])

  return { compartment, theme, hljsTheme }
}
