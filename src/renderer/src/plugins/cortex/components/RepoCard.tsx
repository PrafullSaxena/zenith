/**
 * RepoCard -- Individual repository card with status indicator and actions.
 */
import { useState } from 'react'
import {
  FolderGit2,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  GitPullRequest,
  Sparkles
} from 'lucide-react'
import type { Repository } from '../../../types/cortex'
import { useCortexStore } from '../../../stores/cortex-store'
import AnalysisProgress from './AnalysisProgress'
import { REPO_TYPE_GRADIENTS } from '../cortex-theme'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'

interface Props {
  repo: Repository
  isActive: boolean
  index: number
  onSelect: () => void
  onAnalyze: () => void
  onRemove: () => void
}

const STATUS_BORDER: Record<Repository['status'], string> = {
  idle: '',
  cloning: '!border-blue-500/30',
  analyzing: '!border-warning/30',
  ready: '!border-success/30',
  error: '!border-error/30'
}

const REPO_TYPE_COLORS: Record<string, string> = {
  backend: 'bg-blue-500',
  frontend: 'bg-purple-500',
  'data-engineering': 'bg-amber-500',
  fullstack: 'bg-green-500',
  unknown: 'bg-gray-500'
}

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Never'
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function RepoCard({
  repo,
  isActive,
  index,
  onSelect,
  onAnalyze,
  onRemove
}: Props): React.JSX.Element {
  const progress = useCortexStore((s) => s.progress)
  const isAnalyzing = useCortexStore((s) => s.isAnalyzing)
  const reanalyze = useCortexStore((s) => s.reanalyze)
  const runFullAIAnalysis = useCortexStore((s) => s.runFullAIAnalysis)
  const isRunningFullAI = useCortexStore((s) => s.isRunningFullAI)
  const fullAIAnalysisPhase = useCortexStore((s) => s.fullAIAnalysisPhase)
  const isThisAnalyzing = isAnalyzing && isActive && repo.status === 'analyzing'
  const [isFetching, setIsFetching] = useState(false)

  return (
    <Card
      variant="default"
      onClick={onSelect}
      className={`relative cursor-pointer overflow-hidden p-4 transition-colors ${STATUS_BORDER[repo.status]} ${
        isActive ? 'ring-1 ring-primary/40' : ''
      }`}
    >
      {/* Gradient top accent */}
      <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${REPO_TYPE_GRADIENTS[repo.repoType] ?? REPO_TYPE_GRADIENTS.unknown}`} />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FolderGit2 size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">{repo.name}</span>
        </div>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {repo.branch}
        </span>
      </div>

      {/* URL */}
      <p className="mt-1 truncate text-[10px] text-muted-foreground">{repo.url}</p>

      {/* Type badge + Last analyzed */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${REPO_TYPE_COLORS[repo.repoType] ?? REPO_TYPE_COLORS.unknown}`}
          />
          <span className="text-[10px] capitalize text-muted-foreground">
            {repo.repoType === 'data-engineering' ? 'Data Engineering' : repo.repoType}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(repo.lastAnalyzed)}
        </span>
      </div>

      {/* Status indicators */}
      {repo.status === 'cloning' && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-400">
          <Loader2 size={12} className="animate-spin" />
          <span>Cloning repository...</span>
        </div>
      )}

      {repo.status === 'ready' && !isRunningFullAI && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-success">
          <CheckCircle size={12} />
          <span>Analysis ready</span>
        </div>
      )}

      {/* Full AI Analysis progress indicator — persists across tab switches */}
      {isRunningFullAI && isActive && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-purple-400">
          <Loader2 size={12} className="animate-spin" />
          <span>{fullAIAnalysisPhase ?? 'Running AI analysis...'}</span>
        </div>
      )}

      {repo.status === 'error' && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-error">
          <AlertCircle size={12} />
          <span className="truncate">{repo.error ?? 'An error occurred'}</span>
        </div>
      )}

      {/* Analysis progress */}
      {isThisAnalyzing && progress && (
        <div className="mt-3">
          <AnalysisProgress progress={progress} />
        </div>
      )}

      {/* Action buttons */}
      {!isThisAnalyzing && repo.status !== 'cloning' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {repo.status !== 'ready' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAnalyze()
              }}
              title="Run static analysis on this repository"
              className="flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
            >
              <Play size={12} />
              Analyze
            </button>
          )}
          {repo.status === 'ready' && (
            <>
              <button
                type="button"
                disabled={isFetching}
                onClick={async (e) => {
                  e.stopPropagation()
                  setIsFetching(true)
                  try {
                    await reanalyze(repo.id)
                  } finally {
                    setIsFetching(false)
                  }
                }}
                title="Fetch latest changes from remote and re-run static analysis"
                className="flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
              >
                {isFetching ? <Loader2 size={12} className="animate-spin" /> : <GitPullRequest size={12} />}
                Fetch Changes
              </button>
              <button
                type="button"
                disabled={isRunningFullAI}
                onClick={(e) => {
                  e.stopPropagation()
                  runFullAIAnalysis(repo.id)
                }}
                title="Invalidate all cache, re-run static + AI analysis"
                className="flex items-center gap-1 rounded-lg bg-purple-500/15 px-2.5 py-1.5 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/25 disabled:opacity-50"
              >
                {isRunningFullAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Run AI Analysis
              </button>
            </>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Remove repository"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </Card>
  )
}
