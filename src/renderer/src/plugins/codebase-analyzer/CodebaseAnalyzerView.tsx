/**
 * CodebaseAnalyzerView -- Main plugin view component.
 * Default-exported for React.lazy() in registry.ts.
 *
 * Layout:
 *  - Header: SearchCode icon + title + active repo badge
 *  - Tab bar: Insights / Code / Ask / Repos
 *  - Tab content (full remaining height)
 */
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchCode, LayoutDashboard, Code2, MessageSquare, FolderGit2 } from 'lucide-react'
import { useCodebaseAnalyzerStore } from '../../stores/codebase-analyzer-store'
import RepoManager from './components/RepoManager'
import InsightsPanel from './components/InsightsPanel'

type CbanTab = 'insights' | 'code' | 'qa' | 'repos'

const TABS: { id: CbanTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'insights', label: 'Insights', icon: LayoutDashboard },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'qa', label: 'Ask', icon: MessageSquare },
  { id: 'repos', label: 'Repos', icon: FolderGit2 }
]

export default function CodebaseAnalyzerView(): React.JSX.Element {
  const activeTab = useCodebaseAnalyzerStore((s) => s.activeTab)
  const setActiveTab = useCodebaseAnalyzerStore((s) => s.setActiveTab)
  const repos = useCodebaseAnalyzerStore((s) => s.repos)
  const activeRepoId = useCodebaseAnalyzerStore((s) => s.activeRepoId)
  const analysisResult = useCodebaseAnalyzerStore((s) => s.analysisResult)

  const activeRepo = repos.find((r) => r.id === activeRepoId)

  // Default to repos tab when no repos exist
  useEffect(() => {
    if (repos.length === 0 && activeTab !== 'repos') {
      setActiveTab('repos')
    }
  }, [repos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <SearchCode size={18} className="text-accent" />
          <h1 className="text-lg font-semibold text-text-primary">CodebaseAnalyzer</h1>
        </div>

        {activeRepo && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">{activeRepo.name}</span>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              {activeRepo.branch}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border px-6 py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            {activeTab === 'repos' && <RepoManager />}
            {activeTab === 'insights' && analysisResult ? (
              <InsightsPanel />
            ) : activeTab === 'insights' && !analysisResult ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
                <LayoutDashboard size={32} className="opacity-30" />
                <p className="text-sm">Analyze a repository to see insights</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('repos')}
                  className="mt-2 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/25 transition-colors"
                >
                  Go to Repos
                </button>
              </div>
            ) : null}
            {activeTab === 'code' && (
              <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                Code explorer -- coming soon
              </div>
            )}
            {activeTab === 'qa' && (
              <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                Code Q&A -- coming soon
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
