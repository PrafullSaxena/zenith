/**
 * APIListTab -- Table of all discovered API endpoints.
 * Filterable, sortable table with method badges and file links.
 */
import { useState, useMemo, useCallback } from 'react'
import { Route, Search, ArrowUpDown, Loader2, ShieldCheck } from 'lucide-react'
import { useCortexStore, getCortexAgent } from '../../../stores/cortex-store'
import type { RouteInfo } from '../../../types/cortex'
import ValidationPanel from './ValidationPanel'
import { getMethodColor } from '../cortex-theme'
import { Card } from '@renderer/components/ui/card'

type SortKey = 'path' | 'method' | 'handlerName' | 'controllerName'
type SortDir = 'asc' | 'desc'

export default function APIListTab(): React.JSX.Element {
  const routes = useCortexStore((s) => s.analysisResult?.routes ?? [])
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const navigateToFile = useCortexStore((s) => s.navigateToFile)
  const validateAnalysis = useCortexStore((s) => s.validateAnalysis)
  const validationResults = useCortexStore((s) => s.validationResults)
  const isValidating = useCortexStore((s) => s.isValidating)
  const setIsValidating = useCortexStore((s) => s.setIsValidating)
  const validationDone = useCortexStore((s) => s.validationDone)
  const setValidationDone = useCortexStore((s) => s.setValidationDone)
  const validationError = useCortexStore((s) => s.validationError)
  const setValidationError = useCortexStore((s) => s.setValidationError)

  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('path')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('asc')
      }
    },
    [sortKey]
  )

  const handleFileClick = useCallback(
    (route: RouteInfo) => {
      navigateToFile(route.filePath, route.line)
    },
    [navigateToFile]
  )

  const filteredRoutes = useMemo(() => {
    const q = filter.toLowerCase()
    let result = routes
    if (q) {
      result = routes.filter(
        (r) =>
          r.fullPath.toLowerCase().includes(q) ||
          r.handlerName.toLowerCase().includes(q) ||
          r.controllerName.toLowerCase().includes(q)
      )
    }
    return [...result].sort((a, b) => {
      const aVal = sortKey === 'path' ? a.fullPath : a[sortKey]
      const bVal = sortKey === 'path' ? b.fullPath : b[sortKey]
      const cmp = aVal.localeCompare(bVal)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [routes, filter, sortKey, sortDir])

  if (routes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Route size={32} className="opacity-30" />
        <p className="text-sm">No API endpoints detected</p>
        <p className="max-w-xs text-center text-[10px]">
          API discovery supports Spring Boot, Express, NestJS, FastAPI, Gin, and similar frameworks
        </p>
      </div>
    )
  }

  const SortHeader = ({
    label,
    field
  }: {
    label: string
    field: SortKey
  }): React.JSX.Element => (
    <th
      className="cursor-pointer select-none px-3 py-2 text-left"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          size={10}
          className={sortKey === field ? 'text-primary' : 'text-muted-foreground/40'}
        />
      </span>
    </th>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-foreground">API Endpoints</h3>
          <span className="rounded-lg bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {routes.length} endpoints
          </span>
        </div>

        <div className="flex items-center gap-2">
        {/* Validate button */}
        <button
          type="button"
          onClick={async () => {
            if (!getCortexAgent()) {
              alert('Configure an AI agent in Settings to use validation')
              return
            }
            if (!analysisResult) {
              alert('Analyze a repository first before running validation')
              return
            }
            setIsValidating(true)
            setValidationError(null)
            setValidationDone(false)
            try {
              await validateAnalysis()
              setValidationDone(true)
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              setValidationError(msg)
              console.error('[Cortex] Validation failed:', err)
            } finally {
              setIsValidating(false)
            }
          }}
          disabled={isValidating}
          title={
            !getCortexAgent()
              ? 'Requires AI agent — configure in Settings'
              : !analysisResult
                ? 'Analyze a repository first'
                : 'Use AI to validate detected endpoints'
          }
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
            validationError
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : validationResults.length > 0
                ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                : validationDone
                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          {isValidating ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
          {isValidating
            ? 'Validating...'
            : validationError
              ? 'Validation Failed'
              : validationResults.length > 0
                ? `Validated (${validationResults.length} findings)`
                : validationDone
                  ? 'Validated ✓ No issues'
                  : 'Validate'}
        </button>
        {validationError && (
          <span className="text-[10px] text-red-400" title={validationError}>
            ⚠ {validationError.length > 40 ? validationError.slice(0, 40) + '…' : validationError}
          </span>
        )}
        {/* Search filter */}
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter endpoints..."
            className="w-56 rounded-lg border border-white/8 bg-white/3 backdrop-blur-xl py-1.5 pl-7 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        </div>
      </div>

      {/* Hint when few routes detected */}
      {routes.length > 0 && routes.length <= 15 && !validationDone && !isValidating && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
          <ShieldCheck size={14} className="flex-shrink-0" />
          <span>
            Static analysis found {routes.length} endpoints. Click <strong>Validate</strong> to use AI to discover additional routes the parser may have missed.
          </span>
        </div>
      )}

      {/* Table */}
      <Card className="flex-1 min-h-0 overflow-hidden flex flex-col p-0!">
        <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground z-10">
            <tr>
              <SortHeader label="Method" field="method" />
              <SortHeader label="Path" field="path" />
              <SortHeader label="Handler" field="handlerName" />
              <SortHeader label="Controller" field="controllerName" />
              <th className="px-3 py-2 text-left">File</th>
              <th className="px-3 py-2 text-left">Line</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoutes.map((route, i) => (
              <tr
                key={`${route.method}-${route.fullPath}-${i}`}
                className="border-b border-border/40 transition-colors even:bg-white/2 hover:bg-white/4"
              >
                <td className="px-3 py-2">
                  {(() => {
                    const mc = getMethodColor(route.method)
                    return (
                      <span
                        className="inline-block rounded-lg px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}
                      >
                        {route.method}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-foreground">
                  {route.fullPath}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{route.handlerName}</td>
                <td className="px-3 py-2 text-muted-foreground">{route.controllerName}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleFileClick(route)}
                    className="truncate text-primary hover:underline"
                    title={route.filePath}
                  >
                    {route.filePath.split('/').slice(-2).join('/')}
                  </button>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{route.line}</td>
              </tr>
            ))}
            {filteredRoutes.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No endpoints match your filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>

      {/* Validation results */}
      <div className="flex-shrink-0 max-h-[40%] overflow-auto">
        <ValidationPanel />
      </div>
    </div>
  )
}
