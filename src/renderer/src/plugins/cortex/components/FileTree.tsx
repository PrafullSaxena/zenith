/**
 * FileTree — Recursive collapsible file tree sidebar.
 * Renders a search input at top + recursive file/folder nodes below.
 * File icon colors by extension. Animated expand/collapse via framer-motion.
 */
import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, FileCode, Folder, FolderOpen, Search } from 'lucide-react'
import type { FileNode } from '../../../../types/cortex'
import { useCortexStore } from '../../../../stores/cortex-store'

// ── Icon color map by file extension ────────────────────────────────

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

// ── Auto-expand / auto-collapse logic ───────────────────────────────

const AUTO_EXPAND = new Set(['src', 'app', 'lib'])
const AUTO_COLLAPSE = new Set(['node_modules', 'dist', '.git', 'test', '__tests__'])

function shouldAutoExpand(name: string): boolean {
  return AUTO_EXPAND.has(name)
}
function shouldAutoCollapse(name: string): boolean {
  return AUTO_COLLAPSE.has(name)
}

// ── Filter helpers ──────────────────────────────────────────────────

/** Returns true if any descendant of `node` matches `term`. */
function nodeMatchesFilter(node: FileNode, term: string): boolean {
  if (node.path.toLowerCase().includes(term)) return true
  if (node.type === 'directory') {
    return node.children.some((child) => nodeMatchesFilter(child, term))
  }
  return false
}

// ── FileTreeNode (recursive) ────────────────────────────────────────

function FileTreeNode({
  node,
  depth,
  filterTerm
}: {
  node: FileNode
  depth: number
  filterTerm: string
}): React.JSX.Element | null {
  const openFile = useCortexStore((s) => s.openFile)
  const setFileContent = useCortexStore((s) => s.setFileContent)
  const activeFilePath = useCortexStore((s) => s.activeFilePath)
  const repos = useCortexStore((s) => s.repos)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)

  const defaultOpen = filterTerm
    ? true
    : shouldAutoExpand(node.name)
      ? true
      : shouldAutoCollapse(node.name)
        ? false
        : depth < 1
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const isSelected = node.type === 'file' && activeFilePath === node.path
  const isDir = node.type === 'directory'

  const handleClick = useCallback(async () => {
    if (isDir) {
      setIsOpen((prev) => !prev)
      return
    }
    // File click — load content
    openFile(node.path, node.language || 'plaintext')
    try {
      const repo = repos.find((r) => r.id === activeRepoId)
      if (!repo) return
      const content = await window.api.cortex.getFileContent(repo.repoPath, node.path)
      setFileContent(content)
    } catch {
      // Silently handle — file might be binary or inaccessible
    }
  }, [isDir, node.path, node.language, openFile, setFileContent, repos, activeRepoId])

  // Filter: skip nodes that don't match
  if (filterTerm && !nodeMatchesFilter(node, filterTerm)) {
    return null
  }

  const visibleChildren = isDir
    ? node.children.filter((child) => !filterTerm || nodeMatchesFilter(child, filterTerm))
    : []

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-1.5 py-0.5 text-xs transition-colors ${
          isSelected
            ? 'bg-accent/15 text-accent'
            : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <>
            <ChevronRight
              size={12}
              className={`shrink-0 transition-transform duration-150 ${
                isOpen || filterTerm ? 'rotate-90' : ''
              }`}
            />
            {isOpen || filterTerm ? (
              <FolderOpen size={14} className="shrink-0 text-amber-400/80" />
            ) : (
              <Folder size={14} className="shrink-0 text-amber-400/80" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <FileCode size={14} className={`shrink-0 ${getFileIconColor(node.name)}`} />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDir && (
        <AnimatePresence initial={false}>
          {(isOpen || !!filterTerm) && visibleChildren.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              {visibleChildren.map((child) => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  filterTerm={filterTerm}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  )
}

// ── FileTree (container) ────────────────────────────────────────────

export default function FileTree(): React.JSX.Element {
  const [search, setSearch] = useState('')
  const analysisResult = useCortexStore((s) => s.analysisResult)

  const filterTerm = useMemo(() => search.trim().toLowerCase(), [search])

  const fileTree = analysisResult?.fileTree ?? []

  return (
    <div className="flex h-full min-w-0 flex-col overflow-x-auto">
      {/* Search input */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-2 py-1.5 mx-2 mt-2 mb-1">
        <Search size={12} className="shrink-0 text-text-secondary/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter files..."
          className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
        />
      </div>

      {/* Tree area */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
        {fileTree.map((node) => (
          <FileTreeNode key={node.path} node={node} depth={0} filterTerm={filterTerm} />
        ))}
        {fileTree.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-text-secondary/50">
            No files found
          </div>
        )}
      </div>
    </div>
  )
}
