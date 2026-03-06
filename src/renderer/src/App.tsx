import { Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PLUGINS } from './plugins/registry'
import { AppLayout } from './components/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SettingsLayout } from './components/settings/SettingsLayout'

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-text-secondary">Loading...</span>
    </div>
  )
}

function App(): React.JSX.Element {
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
          <Route
            path="/settings"
            element={<SettingsLayout />}
          />
          {/* Default redirect to first plugin */}
          <Route path="/" element={<Navigate to={PLUGINS[0].route} replace />} />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to={PLUGINS[0].route} replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
