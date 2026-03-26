import React, { Suspense, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PLUGINS } from './plugins/registry'
import { AppLayout } from './components/layout/app-layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SettingsLayout } from './components/settings/SettingsLayout'
import { useSettingsStore } from './stores/settings-store'
import { HLJS_THEME_CSS } from './lib/hljs-themes'
import { GlassSkeleton } from './components/ui'

const MissionControl = React.lazy(() => import('./components/dashboard/MissionControl'))
const ActivityLog = React.lazy(() => import('./components/activity/ActivityLog'))
const AboutView = React.lazy(() => import('./components/about/AboutView'))

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="p-4 space-y-3">
      <GlassSkeleton variant="card" />
      <GlassSkeleton variant="card" />
      <GlassSkeleton variant="text" lines={3} />
    </div>
  )
}

function App(): React.JSX.Element {
  const theme = useSettingsStore((s) => s.getSetting('general.theme')) as string | undefined
  const hljsTheme = useSettingsStore((s) => s.getSetting('general.hljsTheme')) as string | undefined

  // Apply data-theme attribute to <html> so CSS variable overrides take effect
  useEffect(() => {
    if (theme && theme !== 'zenith') {
      document.documentElement.setAttribute('data-theme', theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])

  // Dynamically swap highlight.js theme stylesheet
  useEffect(() => {
    const STYLE_ID = 'hljs-theme-override'
    document.getElementById(STYLE_ID)?.remove()

    if (!hljsTheme || hljsTheme === 'zenith') return

    const css = HLJS_THEME_CSS[hljsTheme]
    if (!css) return

    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = css
    document.head.appendChild(style)
  }, [hljsTheme])

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {PLUGINS.map((plugin) => (
            <Route
              key={plugin.id}
              path={plugin.route}
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ErrorBoundary>
                    <plugin.component />
                  </ErrorBoundary>
                </Suspense>
              }
            />
          ))}
          {/* Zenith Dashboard */}
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary><MissionControl /></ErrorBoundary>
              </Suspense>
            }
          />
          {/* Dedicated Activity Log */}
          <Route
            path="/activity"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary><ActivityLog /></ErrorBoundary>
              </Suspense>
            }
          />
          {/* About */}
          <Route
            path="/about"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary><AboutView /></ErrorBoundary>
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={<SettingsLayout />}
          />
          {/* Default redirect to Zenith dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
