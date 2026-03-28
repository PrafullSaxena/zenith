/**
 * RepoCard -- Individual repository card with status indicator and actions.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderGit2,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  GitPullRequest,
  Sparkles
} from 'lucide-react'
import type { Repository } from '../../../types/cortex'
import { useCortexStore } from '../../../stores/cortex-store'
import AnalysisProgress from './AnalysisProgress'
import { REPO_TYPE_GRADIENTS } from '../cortex-theme'

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
  'needs-clone': '',
  cloning: 'border-blue-500/30',
  analyzing: 'border-warning/30',
  ready: 'border-success/30',
  error: 'border-error/30'
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
    <motion.div
      onClick={onSelect}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative cursor-pointer overflow-hidden rounded-xl border bg-black/20 p-4 backdrop-blur-md transition-shadow hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.06)] ${STATUS_BORDER[repo.status] || 'border-white/5'} ${
        isActive ? 'ring-1 ring-primary/20 bg-primary/5' : ''
      }`}
    >
      {/* Gradient top accent */}
      <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-linear-to-r ${REPO_TYPE_GRADIENTS[repo.repoType] ?? REPO_TYPE_GRADIENTS.unknown}`} />
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
      <AnimatePresence mode="wait">
        {repo.status === 'cloning' && (
          <motion.div
            key="cloning"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-400"
          >
            <Loader2 size={12} className="animate-spin" />
            <span>Cloning repository...</span>
          </motion.div>
        )}

        {repo.status === 'ready' && !isRunningFullAI && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-1.5 text-[10px] text-success"
          >
            <CheckCircle size={12} />
            <span>Analysis ready</span>
          </motion.div>
        )}

        {/* Full AI Analysis progress indicator — persists across tab switches */}
        {isRunningFullAI && isActive && (
          <motion.div
            key="ai-analyzing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-1.5 text-[10px] text-purple-400"
          >
            <Loader2 size={12} className="animate-spin" />
            <span>{fullAIAnalysisPhase ?? 'Running AI analysis...'}</span>
          </motion.div>
        )}

        {repo.status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-1.5 text-[10px] text-error"
          >
            <AlertCircle size={12} />
            <span className="truncate">{repo.error ?? 'An error occurred'}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                onAnalyze()
              }}
              title="Run static analysis on this repository"
              className="flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
            >
              <Play size={12} />
              Analyze
            </motion.button>
          )}
          {repo.status === 'ready' && (
            <>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
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
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
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
              </motion.button>
            </>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Remove repository"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
          >
            <Trash2 size={12} />
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
