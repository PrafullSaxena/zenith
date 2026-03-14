/**
 * RepoManager -- Repository management panel.
 * Shows repo cards grid + "Add Repository" button.
 * Handles analyze and remove actions.
 */
import { useState, useCallback } from 'react'
import { Plus, FolderGit2 } from 'lucide-react'
import { useCodebaseAnalyzerStore } from '../../../stores/codebase-analyzer-store'
import RepoCard from './RepoCard'
import AddRepoDialog from './AddRepoDialog'

export default function RepoManager(): React.JSX.Element {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const repos = useCodebaseAnalyzerStore((s) => s.repos)
  const activeRepoId = useCodebaseAnalyzerStore((s) => s.activeRepoId)
  const setActiveRepo = useCodebaseAnalyzerStore((s) => s.setActiveRepo)
  const setIsAnalyzing = useCodebaseAnalyzerStore((s) => s.setIsAnalyzing)
  const setProgress = useCodebaseAnalyzerStore((s) => s.setProgress)
  const setAnalysisResult = useCodebaseAnalyzerStore((s) => s.setAnalysisResult)
  const updateRepo = useCodebaseAnalyzerStore((s) => s.updateRepo)
  const removeRepo = useCodebaseAnalyzerStore((s) => s.removeRepo)
  const setActiveTab = useCodebaseAnalyzerStore((s) => s.setActiveTab)

  const handleAnalyze = useCallback(
    async (repo: (typeof repos)[number]) => {
      if (!repo.repoPath) return
      setActiveRepo(repo.id)
      updateRepo(repo.id, { status: 'analyzing', error: null })
      setIsAnalyzing(true)

      // Set up progress listener
      window.api.cban.onAnalysisProgress((data) => {
        setProgress(data)
      })

      try {
        const result = await window.api.cban.analyze(repo.repoPath, repo.branch, repo.url)
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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed'
        updateRepo(repo.id, { status: 'error', error: message })
      } finally {
        setIsAnalyzing(false)
        setProgress(null)
        window.api.cban.removeProgressListeners()
      }
    },
    [setActiveRepo, updateRepo, setIsAnalyzing, setProgress, setAnalysisResult, setActiveTab]
  )

  const handleRemove = useCallback(
    async (repo: (typeof repos)[number]) => {
      if (repo.repoPath) {
        try {
          await window.api.cban.removeRepo(repo.repoPath)
        } catch {
          // Best-effort cleanup
        }
      }
      removeRepo(repo.id)
    },
    [removeRepo]
  )

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-sm font-semibold text-text-primary">Repositories</h2>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/25"
        >
          <Plus size={14} />
          Add Repository
        </button>
      </div>

      {/* Repo grid or empty state */}
      {repos.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3">
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
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 pt-24">
          <FolderGit2 size={48} className="text-text-secondary opacity-20" />
          <div className="text-center">
            <p className="text-sm text-text-primary">No repositories yet</p>
            <p className="mt-1 text-xs text-text-secondary">
              Add your first repository to get started
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/25"
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
