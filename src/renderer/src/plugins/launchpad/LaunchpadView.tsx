/**
 * LaunchpadView — Main view for the Launchpad cloud cost estimator plugin.
 *
 * Layout:
 *  - Header: Card with Rocket icon, gradient title, and GlassTab bar
 *  - Estimator tab: ProviderSelector (no provider) or 3-col layout (provider set)
 *    - Left: ServiceCatalog with fuzzy search (narrow sidebar, scrollable)
 *    - Center: ResourceConfigurator (main content, scrollable)
 *    - Right: EstimationSummary (sticky)
 *  - ai-advisor: AiAdvisor (chat + streaming + suggestion apply)
 *  - history: EstimationHistory (save/load/delete)
 *  - compare: ComparisonView (cross-provider side-by-side costs)
 *
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */
import { useEffect } from 'react'
import { Rocket, Calculator, MessageSquare, Clock, GitCompare } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { pageTransition } from '@renderer/lib/motion'
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

const TABS = [
  { id: 'estimator', label: 'Estimator', icon: Calculator },
  { id: 'ai-advisor', label: 'AI Advisor', icon: MessageSquare },
  { id: 'history', label: 'History', icon: Clock },
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
      {/* Card with gradient title and GlassTab bar */}
      <Card
        icon={Rocket}
        title="Launchpad"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as LaunchpadTab)}
        statusIndicator={
          provider ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[hsl(var(--muted-foreground))] bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5">
                {PROVIDER_INFO[provider].displayName}
              </span>
              <button
                type="button"
                onClick={clearEstimation}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[var(--primary)] transition-colors underline underline-offset-2"
              >
                Change Provider
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Tab content with page transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 overflow-hidden"
        >
          {/* Estimator tab */}
          {activeTab === 'estimator' && (
            <>
              {!provider ? (
                <ProviderSelector onSelect={handleProviderSelect} />
              ) : (
                <div className="flex h-full overflow-hidden">
                  <div className="w-64 shrink-0 overflow-y-auto border-r border-white/[0.06]">
                    <ServiceCatalog provider={provider} />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <ResourceConfigurator />
                  </div>
                  <div className="w-72 shrink-0 overflow-y-auto border-l border-white/[0.06]">
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
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
