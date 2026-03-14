/**
 * CodeTabs — Horizontal scrollable tab bar for open files.
 * Each tab shows filename with extension-colored icon and close button.
 */
import { X, FileCode } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'

// ── Icon color by extension (shared with FileTree) ──────────────────

function getFileIconColor(name: string): string {
  const ext = name.slice(name.lastIndexOf('.'))
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'text-blue-400'
    case '.js':
    case '.jsx':
      return 'text-yellow-400'
    case '.java':
      return 'text-red-400'
    case '.py':
      return 'text-green-400'
    case '.json':
      return 'text-amber-400'
    case '.sql':
      return 'text-purple-400'
    case '.md':
      return 'text-gray-400'
    case '.css':
    case '.scss':
      return 'text-pink-400'
    default:
      return 'text-text-secondary'
  }
}

export default function CodeTabs(): React.JSX.Element {
  const openFiles = useCortexStore((s) => s.openFiles)
  const activeFilePath = useCortexStore((s) => s.activeFilePath)
  const setActiveFile = useCortexStore((s) => s.setActiveFile)
  const setFileContent = useCortexStore((s) => s.setFileContent)
  const closeFile = useCortexStore((s) => s.closeFile)
  const repos = useCortexStore((s) => s.repos)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)

  const handleTabClick = async (path: string): Promise<void> => {
    setActiveFile(path)
    // Load file content for the selected tab
    try {
      const repo = repos.find((r) => r.id === activeRepoId)
      if (!repo) return
      const content = await window.api.cortex.getFileContent(repo.repoPath, path)
      setFileContent(content)
    } catch {
      // Silently handle
    }
  }

  const handleClose = (e: React.MouseEvent, path: string): void => {
    e.stopPropagation()
    closeFile(path)
  }

  if (openFiles.length === 0) return <></>

  return (
    <div className="flex items-center gap-0.5 border-b border-border bg-surface px-2 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
      {openFiles.map((file) => {
        const filename = file.path.split('/').pop() ?? file.path
        const isActive = file.path === activeFilePath
        return (
          <button
            key={file.path}
            type="button"
            onClick={() => handleTabClick(file.path)}
            className={`group flex shrink-0 items-center gap-1.5 px-3 py-2 text-[11px] transition-colors ${
              isActive
                ? 'bg-surface-elevated border-t-2 border-t-accent text-text-primary'
                : 'border-t-2 border-t-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50'
            }`}
          >
            <FileCode size={12} className={getFileIconColor(filename)} />
            <span className="max-w-[120px] truncate">{filename}</span>
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => handleClose(e, file.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClose(e as unknown as React.MouseEvent, file.path)
              }}
              className="ml-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-elevated"
            >
              <X size={10} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
