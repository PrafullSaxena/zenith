/**
 * FlowsTab -- Flows sub-tab in InsightsPanel.
 * Shows interactive React Flow diagrams for API flows, component trees, and data pipelines.
 */
import { useState, useMemo } from 'react'
import { GitBranch, Route, Component, Workflow, ChevronDown } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import FlowDiagram from './FlowDiagram'
import { buildAPIFlowNodes, buildComponentTreeNodes, buildPipelineNodes } from './flow-utils'

type FlowType = 'api' | 'components' | 'pipeline'

interface FlowTypeOption {
  id: FlowType
  label: string
  icon: React.ComponentType<{ size?: number }>
  repoTypes: string[]
}

const FLOW_TYPES: FlowTypeOption[] = [
  { id: 'api', label: 'API Flow', icon: Route, repoTypes: ['backend', 'fullstack'] },
  { id: 'components', label: 'Component Tree', icon: Component, repoTypes: ['frontend', 'fullstack'] },
  { id: 'pipeline', label: 'Data Pipeline', icon: Workflow, repoTypes: ['data-engineering'] }
]

export default function FlowsTab(): React.JSX.Element {
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const openFile = useCortexStore((s) => s.openFile)
  const setActiveTab = useCortexStore((s) => s.setActiveTab)

  const repoType = analysisResult?.repoType ?? 'unknown'

  // Filter flow types by repo type
  const availableTypes = useMemo(
    () => FLOW_TYPES.filter((t) => t.repoTypes.includes(repoType) || repoType === 'unknown'),
    [repoType]
  )

  const [flowType, setFlowType] = useState<FlowType>(availableTypes[0]?.id ?? 'api')
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('__all__')

  // Build nodes/edges based on flow type
  const { nodes, edges, direction } = useMemo(() => {
    if (!analysisResult) return { nodes: [], edges: [], direction: 'LR' as const }

    switch (flowType) {
      case 'api': {
        // Filter by selected endpoint
        const routes =
          selectedEndpoint === '__all__'
            ? analysisResult.routes
            : analysisResult.routes.filter((r) => r.fullPath === selectedEndpoint)
        const { nodes, edges } = buildAPIFlowNodes(analysisResult.entities, analysisResult.calls, routes)
        return { nodes, edges, direction: 'LR' as const }
      }
      case 'components': {
        const { nodes, edges } = buildComponentTreeNodes(analysisResult.components)
        return { nodes, edges, direction: 'TB' as const }
      }
      case 'pipeline': {
        const { nodes, edges } = buildPipelineNodes(analysisResult.pipelines)
        return { nodes, edges, direction: 'TB' as const }
      }
      default:
        return { nodes: [], edges: [], direction: 'LR' as const }
    }
  }, [analysisResult, flowType, selectedEndpoint])

  // Endpoint list for API flow selector
  const endpoints = useMemo(() => {
    if (!analysisResult) return []
    return analysisResult.routes.map((r) => ({
      value: r.fullPath,
      label: `${r.method} ${r.fullPath}`
    }))
  }, [analysisResult])

  function handleNodeClick(entityId: string): void {
    if (!analysisResult) return
    // Find entity to get file path
    const entity = analysisResult.entities.find((e) => e.id === entityId)
    if (entity) {
      const ext = entity.filePath.split('.').pop()?.toLowerCase() ?? ''
      const langMap: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        py: 'python', java: 'java', kt: 'kotlin', go: 'go'
      }
      openFile(entity.filePath, langMap[ext] ?? ext)
      setActiveTab('code')
    }
  }

  // Empty states
  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        <div className="text-center">
          <GitBranch size={32} className="mx-auto mb-2 opacity-40" />
          <p>No code entities detected for flow visualization</p>
          <p className="mt-1 text-xs text-text-secondary/60">Analyze a repository first</p>
        </div>
      </div>
    )
  }

  if (flowType === 'api' && analysisResult.routes.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <FlowTypeSelector
          availableTypes={availableTypes}
          flowType={flowType}
          onSelect={setFlowType}
        />
        <div className="flex flex-1 items-center justify-center text-sm text-text-secondary">
          <div className="text-center">
            <Route size={32} className="mx-auto mb-2 opacity-40" />
            <p>No API endpoints found</p>
            <p className="mt-1 text-xs text-text-secondary/60">
              Supported frameworks: Spring Boot, Express, NestJS, Flask, FastAPI, Django
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (flowType === 'components' && analysisResult.components.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <FlowTypeSelector
          availableTypes={availableTypes}
          flowType={flowType}
          onSelect={setFlowType}
        />
        <div className="flex flex-1 items-center justify-center text-sm text-text-secondary">
          <div className="text-center">
            <Component size={32} className="mx-auto mb-2 opacity-40" />
            <p>No React components detected</p>
            <p className="mt-1 text-xs text-text-secondary/60">
              Looking for App.tsx/App.jsx entry point.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar: flow type selector + endpoint filter */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <FlowTypeSelector
          availableTypes={availableTypes}
          flowType={flowType}
          onSelect={setFlowType}
        />

        {/* Endpoint selector for API flow */}
        {flowType === 'api' && endpoints.length > 0 && (
          <div className="relative ml-auto">
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-surface px-3 py-1 pr-7 text-[11px] text-text-primary outline-none focus:border-accent"
            >
              <option value="__all__">All endpoints ({endpoints.length})</option>
              {endpoints.map((ep) => (
                <option key={ep.value} value={ep.value}>
                  {ep.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary"
            />
          </div>
        )}
      </div>

      {/* Flow diagram */}
      <div className="flex-1 overflow-hidden">
        {nodes.length > 0 ? (
          <FlowDiagram
            nodes={nodes}
            edges={edges}
            direction={direction}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-secondary">
            <div className="text-center">
              <GitBranch size={32} className="mx-auto mb-2 opacity-40" />
              <p>No flow data available for this selection</p>
              {flowType === 'api' && analysisResult.routes.length > 0 && (
                <p className="mt-1 text-xs text-text-secondary/60">
                  Routes detected but handler entities could not be resolved — check parser output
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Flow type selector component ----

function FlowTypeSelector({
  availableTypes,
  flowType,
  onSelect
}: {
  availableTypes: FlowTypeOption[]
  flowType: FlowType
  onSelect: (type: FlowType) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      {availableTypes.map((t) => {
        const Icon = t.icon
        const isActive = flowType === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              isActive
                ? 'bg-accent/15 text-accent'
                : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
            }`}
          >
            <Icon size={12} />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
