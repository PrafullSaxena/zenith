/**
 * AddRepoDialog -- Modal dialog for adding a new repository.
 * Validates URL, fetches branches, and triggers clone.
 */
import { useState, useCallback, useEffect } from 'react'
import { Loader2, FolderGit2 } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'

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
      const result = await window.api.cortex.clone(url, name, branch)
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

  return (
    <Dialog isOpen={open} onClose={onClose} title="Add Repository" size="md">
      {/* Form */}
      <div className="flex flex-col gap-4">
        {/* Repository URL */}
        <Input
          label="Repository URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://github.com/org/repo.git"
        />

        {/* Branch */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Branch</label>
          <div className="relative">
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={branches.length === 0}
              className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
              />
            )}
          </div>
        </div>

        {/* Repository Name */}
        <Input
          label="Repository Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-repo"
        />

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-[11px] text-error">{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isValidRepoUrl(url) || !name || !branch || cloning}
        >
          {cloning && <Loader2 size={12} className="animate-spin" />}
          Add & Clone
        </Button>
      </div>
    </Dialog>
  )
}
