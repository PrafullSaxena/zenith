/**
 * RepoCard -- Individual repository card with status indicator and actions.
 */
import { motion } from 'framer-motion'
import {
  FolderGit2,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import type { Repository } from '../../../types/cortex'
import { useCortexStore } from '../../../stores/cortex-store'
import AnalysisProgress from './AnalysisProgress'

interface Props {
  repo: Repository
  isActive: boolean
  index: number
  onSelect: () => void
  onAnalyze: () => void
  onRemove: () => void
}

const STATUS_STYLES: Record<Repository['status'], string> = {
  idle: 'border-border/60 bg-surface-elevated/70',
  cloning: 'border-blue-500/30 bg-surface-elevated/70',
  analyzing: 'border-warning/30 bg-surface-elevated/70',
  ready: 'border-success/30 bg-surface-elevated/70',
  error: 'border-error/30 bg-surface-elevated/70'
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
  const isThisAnalyzing = isAnalyzing && isActive && repo.status === 'analyzing'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border p-4 transition-colors ${STATUS_STYLES[repo.status]} ${
        isActive ? 'ring-1 ring-accent/40' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FolderGit2 size={16} className="text-accent" />
          <span className="text-sm font-semibold text-text-primary">{repo.name}</span>
        </div>
        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
          {repo.branch}
        </span>
      </div>

      {/* URL */}
      <p className="mt-1 truncate text-[10px] text-text-secondary">{repo.url}</p>

      {/* Type badge + Last analyzed */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${REPO_TYPE_COLORS[repo.repoType] ?? REPO_TYPE_COLORS.unknown}`}
          />
          <span className="text-[10px] capitalize text-text-secondary">
            {repo.repoType === 'data-engineering' ? 'Data Engineering' : repo.repoType}
          </span>
        </div>
        <span className="text-[10px] text-text-secondary">
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

      {repo.status === 'ready' && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-success">
          <CheckCircle size={12} />
          <span>Analysis ready</span>
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
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAnalyze()
            }}
            className="flex items-center gap-1 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/25"
          >
            <Play size={12} />
            Analyze
          </button>
          {repo.status === 'ready' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                reanalyze(repo.id)
              }}
              title="Re-analyze (fetch latest from remote)"
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-secondary transition-colors hover:bg-accent/10 hover:text-accent"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </motion.div>
  )
}
