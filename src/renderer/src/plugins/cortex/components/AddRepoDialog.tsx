/**
 * AddRepoDialog -- Modal dialog for adding a new repository.
 * Validates URL, fetches branches, and triggers clone.
 */
import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, FolderGit2 } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'

interface Props {
  open: boolean
  onClose: () => void
}

function extractRepoName(url: string): string {
  const match = url.match(/\/([^/]+?)(?:\.git)?$/)
  return match?.[1] ?? ''
}

function isValidRepoUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('git@')
}

export default function AddRepoDialog({ open, onClose }: Props): React.JSX.Element | null {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [branch, setBranch] = useState('')
  const [branches, setBranches] = useState<string[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cloning, setCloning] = useState(false)

  const addRepo = useCortexStore((s) => s.addRepo)
  const updateRepo = useCortexStore((s) => s.updateRepo)
  const setActiveRepo = useCortexStore((s) => s.setActiveRepo)

  // Auto-extract name from URL on blur
  const handleUrlBlur = useCallback(async () => {
    if (!isValidRepoUrl(url)) return
    const extracted = extractRepoName(url)
    if (extracted && !name) setName(extracted)

    // Fetch branches
    setLoadingBranches(true)
    setError(null)
    try {
      const result = await window.api.cortex.fetchBranches(url)
      setBranches(result)
      // Default to main or master
      const defaultBranch = result.find((b) => b === 'main') ?? result.find((b) => b === 'master') ?? result[0]
      if (defaultBranch && !branch) setBranch(defaultBranch)
    } catch (err) {
      setBranches([])
      setError('Could not fetch branches. Check URL and credentials.')
    } finally {
      setLoadingBranches(false)
    }
  }, [url, name, branch])

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setUrl('')
      setName('')
      setBranch('')
      setBranches([])
      setError(null)
      setCloning(false)
    }
  }, [open])

  const handleSubmit = async (): Promise<void> => {
    if (!isValidRepoUrl(url) || !name || !branch) return

    const id = crypto.randomUUID()
    const repo = {
      id,
      url,
      name,
      branch,
      repoPath: '',
      repoType: 'unknown' as const,
      framework: '',
      language: '',
      status: 'cloning' as const,
      commitSha: '',
      lastAnalyzed: null,
      error: null,
      fileCount: 0
    }

    addRepo(repo)
    setActiveRepo(id)
    setCloning(true)
    onClose()

    // Set up clone progress listener
    window.api.cortex.onCloneProgress((data) => {
      updateRepo(id, {
        status: 'cloning',
        error: data.detail
      })
    })

    try {
      const result = await window.api.cortex.clone(url, name)
      updateRepo(id, {
        repoPath: result.repoPath,
        status: 'idle'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Clone failed'
      const isAuthError =
        message.includes('Authentication') ||
        message.includes('403') ||
        message.includes('401') ||
        message.includes('not found')
      updateRepo(id, {
        status: 'error',
        error: isAuthError
          ? 'Authentication failed. Configure git credentials or use SSH.'
          : message
      })
    } finally {
      window.api.cortex.removeProgressListeners()
      setCloning(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        key="add-repo-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-[520px] rounded-xl border border-border bg-surface p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 size={18} className="text-accent" />
              <h2 className="text-base font-semibold text-text-primary">Add Repository</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">
            {/* Repository URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-text-secondary">
                Repository URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://github.com/org/repo.git"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>

            {/* Branch */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-text-secondary">Branch</label>
              <div className="relative">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={branches.length === 0}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 disabled:opacity-50"
                >
                  {branches.length === 0 && (
                    <option value="">
                      {loadingBranches ? 'Loading...' : 'Enter URL first'}
                    </option>
                  )}
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {loadingBranches && (
                  <Loader2
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-secondary"
                  />
                )}
              </div>
            </div>

            {/* Repository Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-text-secondary">
                Repository Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-repo"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-error/10 px-3 py-2 text-[11px] text-error">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValidRepoUrl(url) || !name || !branch || cloning}
              className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cloning && <Loader2 size={12} className="animate-spin" />}
              Add & Clone
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
