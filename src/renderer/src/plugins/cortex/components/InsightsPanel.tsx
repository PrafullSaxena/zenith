/**
 * InsightsPanel -- Container for the insights section with sub-tab navigation.
 * Sub-tabs: Overview, APIs, Flows, Design Doc
 * Includes Export button for documentation export when design doc is available.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Route, GitBranch, BookOpen, Download } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import OverviewTab from './OverviewTab'
import APIListTab from './APIListTab'
import FlowsTab from './FlowsTab'
import ArchitectureDashboard from './ArchitectureDashboard'
import ExportDialog from './ExportDialog'

const INSIGHT_TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'apis', label: 'APIs', icon: Route },
  { id: 'flows', label: 'Flows', icon: GitBranch },
  { id: 'design', label: 'Design', icon: BookOpen }
] as const

export default function InsightsPanel(): React.JSX.Element {
  const insightsSubTab = useCortexStore((s) => s.insightsSubTab)
  const setInsightsSubTab = useCortexStore((s) => s.setInsightsSubTab)
  const designDoc = useCortexStore((s) => s.designDoc)

  const [showExport, setShowExport] = useState(false)

  return (
    <div className="flex h-full flex-col">
      {/* Sub-tab bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-2">
        <div className="flex items-center gap-1">
          {INSIGHT_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = insightsSubTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInsightsSubTab(tab.id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Export button — visible when HLD is generated */}
        {designDoc && (
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
            title="Export documentation"
          >
            <Download size={12} />
            Export
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={insightsSubTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            {insightsSubTab === 'overview' && <OverviewTab />}
            {insightsSubTab === 'apis' && <APIListTab />}
            {insightsSubTab === 'flows' && <FlowsTab />}
            {insightsSubTab === 'design' && <ArchitectureDashboard />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Export dialog */}
      {showExport && designDoc && (
        <ExportDialog
          hldContent={designDoc}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
