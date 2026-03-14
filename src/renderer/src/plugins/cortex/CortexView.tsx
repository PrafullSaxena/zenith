/**
 * CortexView -- Main plugin view component.
 * Default-exported for React.lazy() in registry.ts.
 *
 * Layout:
 *  - Header: Brain icon + title + active repo badge
 *  - Tab bar: Insights / Code / Ask / Repos
 *  - Tab content (full remaining height)
 */
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, LayoutDashboard, Code2, MessageSquare, FolderGit2 } from 'lucide-react'
import { useCortexStore } from '../../stores/cortex-store'
import RepoManager from './components/RepoManager'
import InsightsPanel from './components/InsightsPanel'
import CodePanel from './components/CodePanel'
import QAPanel from './components/QAPanel'

type CortexTab = 'insights' | 'code' | 'qa' | 'repos'

const TABS: { id: CortexTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'insights', label: 'Insights', icon: LayoutDashboard },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'qa', label: 'Ask', icon: MessageSquare },
  { id: 'repos', label: 'Repos', icon: FolderGit2 }
]

export default function CortexView(): React.JSX.Element {
  const activeTab = useCortexStore((s) => s.activeTab)
  const setActiveTab = useCortexStore((s) => s.setActiveTab)
  const repos = useCortexStore((s) => s.repos)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)
  const analysisResult = useCortexStore((s) => s.analysisResult)

  const loadRepos = useCortexStore((s) => s.loadRepos)

  const activeRepo = repos.find((r) => r.id === activeRepoId)

  // Hydrate persisted repos from SQLite on mount
  useEffect(() => {
    loadRepos()
  }, [loadRepos])

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
          <Brain size={18} className="text-accent" />
          <h1 className="text-lg font-semibold text-text-primary">Cortex</h1>
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
      <div className="min-h-0 flex-1 overflow-hidden">
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
            {activeTab === 'code' && analysisResult ? (
              <CodePanel />
            ) : activeTab === 'code' && !analysisResult ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
                <Code2 size={32} className="opacity-30" />
                <p className="text-sm">Analyze a repository first to browse code</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('repos')}
                  className="mt-2 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/25 transition-colors"
                >
                  Go to Repos
                </button>
              </div>
            ) : null}
            {activeTab === 'qa' && analysisResult ? (
              <QAPanel />
            ) : activeTab === 'qa' && !analysisResult ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-sm">Analyze a repository first to ask questions</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('repos')}
                  className="mt-2 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/25 transition-colors"
                >
                  Go to Repos
                </button>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Status bar */}
      {activeRepo && analysisResult && (
        <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-1 text-[10px] text-text-secondary">
          <div className="flex items-center gap-3">
            <span>{activeRepo.name}</span>
            <span className="text-text-secondary/50">/</span>
            <span>{activeRepo.branch}</span>
            {activeRepo.commitSha && (
              <>
                <span className="text-text-secondary/50">/</span>
                <span className="font-mono">{activeRepo.commitSha.slice(0, 7)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: getRepoTypeDotColor(analysisResult.repoType) }}
              />
              {formatRepoType(analysisResult.repoType)}
            </span>
            <span>{analysisResult.stats.totalFiles.toLocaleString()} files</span>
            <span>{analysisResult.entities.length.toLocaleString()} entities</span>
            {activeRepo.lastAnalyzed && (
              <span>Last analyzed: {formatTimeAgo(activeRepo.lastAnalyzed)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getRepoTypeDotColor(type: string): string {
  switch (type) {
    case 'backend':
      return '#3b82f6'
    case 'frontend':
      return '#a855f7'
    case 'data-engineering':
      return '#f59e0b'
    case 'fullstack':
      return '#10b981'
    default:
      return '#6b7280'
  }
}

function formatRepoType(type: string): string {
  switch (type) {
    case 'backend':
      return 'Backend'
    case 'frontend':
      return 'Frontend'
    case 'data-engineering':
      return 'Data Eng'
    case 'fullstack':
      return 'Fullstack'
    default:
      return type
  }
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
