/**
 * InsightsPanel -- Container for the insights section with sub-tab navigation.
 * Sub-tabs: Overview, APIs, Flows, Architecture, Diagrams, Graph
 * Includes Export button for documentation export when design doc is available.
 */
import { lazy, Suspense, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Route,
  GitBranch,
  Network,
  BarChart3,
  Share2,
  Download
} from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import OverviewTab from './OverviewTab'
import APIListTab from './APIListTab'
import FlowsTab from './FlowsTab'
import ArchitectureDashboard from './ArchitectureDashboard'
import DiagramsTab from './DiagramsTab'
import ExportDialog from './ExportDialog'

const MindGraphTab = lazy(() => import('./MindGraphTab'))

const INSIGHT_TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'apis', label: 'APIs', icon: Route },
  { id: 'flows', label: 'Flows', icon: GitBranch },
  { id: 'architecture', label: 'Architecture', icon: Network },
  { id: 'diagrams', label: 'Diagrams', icon: BarChart3 },
  { id: 'graph', label: 'Graph', icon: Share2 }
] as const

function TabFallback(): React.JSX.Element {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-full" lines={4} />
    </div>
  )
}

export default function InsightsPanel(): React.JSX.Element {
  const insightsSubTab = useCortexStore((s) => s.insightsSubTab)
  const setInsightsSubTab = useCortexStore((s) => s.setInsightsSubTab)
  const designDoc = useCortexStore((s) => s.designDoc)
  const hldContent = useCortexStore((s) => s.hldContent)

  const [showExport, setShowExport] = useState(false)

  const exportContent = hldContent || designDoc

  return (
    <div className="flex h-full flex-col">
      {/* Sub-tab bar */}
      <Card className="flex items-center justify-between px-6 py-2 rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-1">
          {INSIGHT_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = insightsSubTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInsightsSubTab(tab.id)}
                className={`relative flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="cortex-insight-tab"
                    className="absolute inset-0 rounded-lg bg-primary/12"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  <Icon size={12} />
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Export button — visible when HLD is generated */}
        {exportContent && (
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Export documentation"
          >
            <Download size={12} />
            Export
          </button>
        )}
      </Card>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={insightsSubTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="h-full"
          >
            {insightsSubTab === 'overview' && <OverviewTab />}
            {insightsSubTab === 'apis' && <APIListTab />}
            {insightsSubTab === 'flows' && <FlowsTab />}
            {insightsSubTab === 'architecture' && <ArchitectureDashboard />}
            {insightsSubTab === 'diagrams' && <DiagramsTab />}
            {insightsSubTab === 'graph' && (
              <Suspense fallback={<TabFallback />}>
                <MindGraphTab />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Export dialog */}
      {showExport && exportContent && (
        <ExportDialog
          hldContent={exportContent}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
