import { useState } from 'react'
import { Plus, Trash2, GitBranch } from 'lucide-react'

/** A single workspace + repository slug pair. */
export interface RepoEntry {
  workspace: string
  repoSlug: string
}

interface RepoListEditorProps {
  value: RepoEntry[]
  onChange: (repos: RepoEntry[]) => void
}

const inputClass =
  'w-full rounded-lg border border-border/50 bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition'

/**
 * Editable list of Bitbucket workspace + repo slug pairs.
 * Used in the CodeReviewBot settings to configure multiple repositories.
 */
export function RepoListEditor({ value, onChange }: RepoListEditorProps): React.JSX.Element {
  const [newWorkspace, setNewWorkspace] = useState('')
  const [newRepo, setNewRepo] = useState('')
  const [error, setError] = useState('')

  const repos = Array.isArray(value) ? value : []

  const handleAdd = (): void => {
    const ws = newWorkspace.trim()
    const repo = newRepo.trim()

    if (!ws || !repo) {
      setError('Both workspace and repository slug are required')
      return
    }

    // Check for duplicates
    const isDuplicate = repos.some(
      (r) => r.workspace === ws && r.repoSlug === repo
    )
    if (isDuplicate) {
      setError('This workspace/repo combination already exists')
      return
    }

    onChange([...repos, { workspace: ws, repoSlug: repo }])
    setNewWorkspace('')
    setNewRepo('')
    setError('')
  }

  const handleRemove = (index: number): void => {
    const updated = repos.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing repos list */}
      {repos.length > 0 && (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Workspace
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Repository
                </th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {repos.map((repo, index) => (
                <tr
                  key={`${repo.workspace}/${repo.repoSlug}`}
                  className="border-b border-border/30 last:border-b-0 transition-colors hover:bg-secondary/30"
                >
                  <td className="px-3 py-2 text-foreground">{repo.workspace}</td>
                  <td className="px-3 py-2 text-foreground">{repo.repoSlug}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-red-400 hover:bg-red-500/10"
                      title="Remove repository"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {repos.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/50 px-4 py-8 text-center">
          <GitBranch size={24} className="mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No repositories configured</p>
          <p className="mt-1 text-xs text-muted-foreground">Add one below to get started.</p>
        </div>
      )}

      {/* Add new repo form */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Workspace</label>
          <input
            type="text"
            className={inputClass}
            value={newWorkspace}
            onChange={(e) => {
              setNewWorkspace(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="my-workspace"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Repository Slug
          </label>
          <input
            type="text"
            className={inputClass}
            value={newRepo}
            onChange={(e) => {
              setNewRepo(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="my-repo"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-background transition hover:bg-primary/90"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
