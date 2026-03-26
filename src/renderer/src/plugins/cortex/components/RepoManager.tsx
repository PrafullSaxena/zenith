/**
 * RepoManager -- Repository management panel.
 * Shows repo cards grid + "Add Repository" button.
 * Handles analyze and remove actions.
 */
import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, FolderGit2 } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import RepoCard from './RepoCard'
import AddRepoDialog from './AddRepoDialog'
import { staggerContainer } from '@renderer/lib/motion'

export default function RepoManager(): React.JSX.Element {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const repos = useCortexStore((s) => s.repos)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)
  const setActiveRepo = useCortexStore((s) => s.setActiveRepo)
  const setIsAnalyzing = useCortexStore((s) => s.setIsAnalyzing)
  const setProgress = useCortexStore((s) => s.setProgress)
  const setAnalysisResult = useCortexStore((s) => s.setAnalysisResult)
  const updateRepo = useCortexStore((s) => s.updateRepo)
  const removeRepo = useCortexStore((s) => s.removeRepo)
  const setActiveTab = useCortexStore((s) => s.setActiveTab)
  const restoreEnrichments = useCortexStore((s) => s.restoreEnrichments)

  const handleAnalyze = useCallback(
    async (repo: (typeof repos)[number]) => {
      if (!repo.repoPath) return
      setActiveRepo(repo.id)
      updateRepo(repo.id, { status: 'analyzing', error: null })
      setIsAnalyzing(true)

      // Set up progress listener
      window.api.cortex.onAnalysisProgress((data) => {
        setProgress(data)
      })

      try {
        const result = await window.api.cortex.analyze(repo.repoPath, repo.branch, repo.url)
        setAnalysisResult(result)
        updateRepo(repo.id, {
          status: 'ready',
          lastAnalyzed: new Date().toISOString(),
          repoType: result.repoType,
          framework: result.framework,
          language: result.language,
          commitSha: result.commitSha,
          fileCount: result.stats.totalFiles
        })
        // Auto-switch to insights tab
        setActiveTab('insights')
        // Restore any previously cached enrichments (entity summaries, digest, HLD, validations)
        restoreEnrichments()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed'
        updateRepo(repo.id, { status: 'error', error: message })
      } finally {
        setIsAnalyzing(false)
        setProgress(null)
        window.api.cortex.removeProgressListeners()
      }
    },
    [setActiveRepo, updateRepo, setIsAnalyzing, setProgress, setAnalysisResult, setActiveTab, restoreEnrichments]
  )

  const handleRemove = useCallback(
    async (repo: (typeof repos)[number]) => {
      if (repo.repoPath) {
        try {
          await window.api.cortex.removeRepo(repo.repoPath)
        } catch {
          // Best-effort cleanup
        }
      }
      removeRepo(repo.id)
    },
    [removeRepo]
  )

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-sm font-semibold text-foreground">Repositories</h2>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          title="Add a new repository"
          className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
        >
          <Plus size={14} />
          Add Repository
        </button>
      </div>

      {/* Repo grid or empty state */}
      {repos.length > 0 ? (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3"
        >
          {repos.map((repo, i) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              isActive={repo.id === activeRepoId}
              index={i}
              onSelect={() => setActiveRepo(repo.id)}
              onAnalyze={() => handleAnalyze(repo)}
              onRemove={() => handleRemove(repo)}
            />
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 pt-24">
          <FolderGit2 size={48} className="text-muted-foreground opacity-20" />
          <div className="text-center">
            <p className="text-sm text-foreground">No repositories yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first repository to get started
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            title="Add a new repository"
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/15 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/25"
          >
            <Plus size={16} />
            Add Repository
          </button>
        </div>
      )}

      {/* Add repo dialog */}
      <AddRepoDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  )
}
