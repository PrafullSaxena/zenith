/**
 * APIListTab -- Table of all discovered API endpoints.
 * Filterable, sortable table with method badges and file links.
 */
import { useState, useMemo, useCallback } from 'react'
import { Search, ArrowUpDown, Route, ShieldCheck, Loader2 } from 'lucide-react'
import { useCortexStore, getCortexAgent } from '../../../stores/cortex-store'
import type { RouteInfo } from '../../../types/cortex'
import ValidationPanel from './ValidationPanel'

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/15 text-green-400',
  POST: 'bg-blue-500/15 text-blue-400',
  PUT: 'bg-amber-500/15 text-amber-400',
  DELETE: 'bg-red-500/15 text-red-400',
  PATCH: 'bg-purple-500/15 text-purple-400',
  ALL: 'bg-gray-500/15 text-gray-400'
}

type SortKey = 'path' | 'method' | 'handlerName' | 'controllerName'
type SortDir = 'asc' | 'desc'

export default function APIListTab(): React.JSX.Element {
  const routes = useCortexStore((s) => s.analysisResult?.routes ?? [])
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const navigateToFile = useCortexStore((s) => s.navigateToFile)
  const validateAnalysis = useCortexStore((s) => s.validateAnalysis)
  const validationResults = useCortexStore((s) => s.validationResults)

  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('path')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [isValidating, setIsValidating] = useState(false)
  const [validationDone, setValidationDone] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

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
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const cmp = aVal.localeCompare(bVal)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [routes, filter, sortKey, sortDir])

  if (routes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
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
          className={sortKey === field ? 'text-accent' : 'text-text-secondary/40'}
        />
      </span>
    </th>
  )

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-text-primary">API Endpoints</h3>
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
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
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter endpoints..."
            className="w-56 rounded-lg border border-border bg-background py-1.5 pl-7 pr-3 text-[11px] text-text-primary placeholder:text-text-secondary/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
        </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface-elevated/50 text-[10px] uppercase tracking-wider text-text-secondary">
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
                className="border-b border-border/40 transition-colors even:bg-surface-elevated/30 hover:bg-surface-elevated/40"
              >
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${METHOD_COLORS[route.method] ?? METHOD_COLORS.ALL}`}
                  >
                    {route.method}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-text-primary">
                  {route.fullPath}
                </td>
                <td className="px-3 py-2 text-text-secondary">{route.handlerName}</td>
                <td className="px-3 py-2 text-text-secondary">{route.controllerName}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleFileClick(route)}
                    className="truncate text-accent hover:underline"
                    title={route.filePath}
                  >
                    {route.filePath.split('/').slice(-2).join('/')}
                  </button>
                </td>
                <td className="px-3 py-2 text-text-secondary">{route.line}</td>
              </tr>
            ))}
            {filteredRoutes.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-text-secondary"
                >
                  No endpoints match your filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Validation results */}
      <ValidationPanel />
    </div>
  )
}
