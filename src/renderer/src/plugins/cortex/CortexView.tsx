/**
 * CortexView -- Main plugin view component.
 * Default-exported for React.lazy() in registry.ts.
 *
 * Layout:
 *  - Card: Brain icon + gradient title + tab bar
 *  - Tab content (full remaining height)
 */
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, LayoutDashboard, Code2, MessageSquare, FolderGit2 } from 'lucide-react'
import { useCortexStore, getCortexAgent } from '../../stores/cortex-store'
import RepoManager from './components/RepoManager'
import InsightsPanel from './components/InsightsPanel'
import CodePanel from './components/CodePanel'
import QAPanel from './components/QAPanel'
import { Card } from '@renderer/components/ui/card'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { PageHeader } from '../../components/shared/page-header'
import { pageTransition } from '@renderer/lib/motion'

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

  const setAnalysisResult = useCortexStore((s) => s.setAnalysisResult)

  // Default to repos tab when no repos exist
  useEffect(() => {
    if (repos.length === 0 && activeTab !== 'repos') {
      setActiveTab('repos')
    }
  }, [repos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load cached analysis when selecting a previously analyzed repo
  useEffect(() => {
    if (!activeRepo || !activeRepo.commitSha || analysisResult) return
    window.api.cortex
      .getCachedAnalysis(activeRepo.url, activeRepo.branch, activeRepo.commitSha)
      .then((cached) => {
        if (cached) {
          setAnalysisResult(cached as import('../../types/cortex').AnalysisResult)
        }
      })
      .catch(() => {
        /* cache miss -- user will need to re-analyze */
      })
  }, [activeRepo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Card with Brain icon, gradient title, and tab bar */}
      <PageHeader
        icon={Brain}
        title="Cortex"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as CortexTab)}
        statusIndicator={
          activeRepo ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{activeRepo.name}</span>
              <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {activeRepo.branch}
              </span>
            </div>
          ) : undefined
        }
      />

      {/* No-agent banner */}
      {!getCortexAgent() && (
        <div className="mx-4 mt-2 rounded-xl bg-primary/10 px-3 py-2 text-[11px] text-primary">
          Configure an AI Agent in Settings to unlock AI-powered insights
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full"
          >
            {activeTab === 'repos' && (
              repos.length === 0 ? (
                <EmptyState
                  icon={Brain}
                  title="No repositories analyzed"
                  description="Add a repository to get started with code analysis, insights, and documentation."
                  actionLabel="Add Repository"
                  onAction={() => setActiveTab('repos')}
                />
              ) : (
                <RepoManager />
              )
            )}
            {activeTab === 'insights' && analysisResult ? (
              <InsightsPanel />
            ) : activeTab === 'insights' && !analysisResult ? (
              <EmptyState
                icon={LayoutDashboard}
                title="No insights yet"
                description="Analyze a repository to see insights"
                actionLabel="Go to Repos"
                onAction={() => setActiveTab('repos')}
              />
            ) : null}
            {activeTab === 'code' && analysisResult ? (
              <CodePanel />
            ) : activeTab === 'code' && !analysisResult ? (
              <EmptyState
                icon={Code2}
                title="No code to browse"
                description="Analyze a repository first to browse code"
                actionLabel="Go to Repos"
                onAction={() => setActiveTab('repos')}
              />
            ) : null}
            {activeTab === 'qa' && analysisResult ? (
              <QAPanel />
            ) : activeTab === 'qa' && !analysisResult ? (
              <EmptyState
                icon={MessageSquare}
                title="No codebase loaded"
                description="Analyze a repository first to ask questions"
                actionLabel="Go to Repos"
                onAction={() => setActiveTab('repos')}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Status bar */}
      {activeRepo && analysisResult && (
        <div className="flex items-center justify-between border-t border-border/40 bg-secondary/30 backdrop-blur-sm px-4 py-1 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{activeRepo.name}</span>
            <span className="text-muted-foreground/50">/</span>
            <span>{activeRepo.branch}</span>
            {activeRepo.commitSha && (
              <>
                <span className="text-muted-foreground/50">/</span>
                <span className="font-mono">{activeRepo.commitSha.slice(0, 7)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
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
