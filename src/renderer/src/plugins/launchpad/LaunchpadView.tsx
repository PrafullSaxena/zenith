/**
 * LaunchpadView — Main view for the Launchpad cloud cost estimator plugin.
 *
 * Layout:
 *  - Header: plugin title + tab navigation
 *  - Estimator tab: ProviderSelector (no provider) or 2-col layout (provider set)
 *    - Left: ServiceCatalog + ResourceConfigurator (scrollable)
 *    - Right: EstimationSummary (sticky)
 *  - ai-advisor: AiAdvisor (chat + streaming + suggestion apply)
 *  - history: EstimationHistory (save/load/delete)
 *  - compare: ComparisonView (cross-provider side-by-side costs)
 *
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */
import { useEffect } from 'react'
import { Rocket, Calculator, MessageSquare, History, GitCompare } from 'lucide-react'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import type { LaunchpadTab, CloudProvider } from '../../types/launchpad'
import { PROVIDER_INFO } from '../../data/cloud-pricing/index'
import ProviderSelector from './ProviderSelector'
import ServiceCatalog from './ServiceCatalog'
import ResourceConfigurator from './ResourceConfigurator'
import EstimationSummary from './EstimationSummary'
import AiAdvisor from './AiAdvisor'
import EstimationHistory from './EstimationHistory'
import ComparisonView from './ComparisonView'

const TABS: { id: LaunchpadTab; label: string; icon: typeof Calculator }[] = [
  { id: 'estimator', label: 'Estimator', icon: Calculator },
  { id: 'ai-advisor', label: 'AI Advisor', icon: MessageSquare },
  { id: 'history', label: 'History', icon: History },
  { id: 'compare', label: 'Compare', icon: GitCompare }
]

export default function LaunchpadView(): React.JSX.Element {
  const provider = useLaunchpadStore((s) => s.provider)
  const activeTab = useLaunchpadStore((s) => s.activeTab)
  const setActiveTab = useLaunchpadStore((s) => s.setActiveTab)
  const setProvider = useLaunchpadStore((s) => s.setProvider)
  const clearEstimation = useLaunchpadStore((s) => s.clearEstimation)
  const loadHistory = useLaunchpadStore((s) => s.loadHistory)

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleProviderSelect = (selected: CloudProvider) => {
    setProvider(selected)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Rocket size={18} className="text-accent" />
          <h1 className="text-lg font-semibold text-text-primary">Launchpad</h1>
        </div>

        {/* Provider badge when set */}
        {provider && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-text-secondary bg-bg-secondary border border-border rounded-md px-2 py-0.5">
              {PROVIDER_INFO[provider].displayName}
            </span>
            <button
              type="button"
              onClick={clearEstimation}
              className="text-xs text-text-secondary hover:text-accent transition-colors underline underline-offset-2"
            >
              Change Provider
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {/* Estimator tab */}
        {activeTab === 'estimator' && (
          <>
            {!provider ? (
              // No provider selected — show full-width provider selector
              <ProviderSelector onSelect={handleProviderSelect} />
            ) : (
              // Provider selected — two-column layout
              <div className="flex h-full overflow-hidden">
                {/* Left: ServiceCatalog + ResourceConfigurator (scrollable) */}
                <div className="flex flex-1 flex-col overflow-hidden border-r border-border">
                  <div className="flex-1 overflow-y-auto">
                    <ServiceCatalog provider={provider} />
                  </div>
                  <div className="border-t border-border overflow-y-auto max-h-64">
                    <ResourceConfigurator />
                  </div>
                </div>

                {/* Right: EstimationSummary (sticky) */}
                <div className="w-80 shrink-0 overflow-y-auto">
                  <EstimationSummary />
                </div>
              </div>
            )}
          </>
        )}

        {/* AI Advisor tab */}
        {activeTab === 'ai-advisor' && <AiAdvisor />}

        {/* History tab */}
        {activeTab === 'history' && <EstimationHistory />}

        {/* Compare tab */}
        {activeTab === 'compare' && <ComparisonView />}
      </div>
    </div>
  )
}
