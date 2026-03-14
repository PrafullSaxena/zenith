/**
 * FileTree — Recursive collapsible file tree sidebar.
 * Renders a search input at top + recursive file/folder nodes below.
 * File icon colors by extension. Animated expand/collapse via framer-motion.
 * For repos with >500 visible nodes, switches to a react-window FixedSizeList
 * to keep rendering performance acceptable.
 */
import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, FileCode, Folder, FolderOpen, Search } from 'lucide-react'
import { FixedSizeList, type ListChildComponentProps } from 'react-window'
import type { FileNode } from '../../../types/cortex'
import { useCortexStore } from '../../../stores/cortex-store'

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

// ── Flat node type for virtualization ───────────────────────────────

interface FlatNode {
  node: FileNode
  depth: number
  isOpen: boolean
}

/** Recursively flatten visible tree nodes into a flat array. */
function flattenTree(
  nodes: FileNode[],
  depth: number,
  openSet: Set<string>,
  filterTerm: string
): FlatNode[] {
  const result: FlatNode[] = []
  for (const node of nodes) {
    if (filterTerm && !nodeMatchesFilter(node, filterTerm)) continue
    const isOpen = filterTerm ? true : openSet.has(node.path)
    result.push({ node, depth, isOpen })
    if (node.type === 'directory' && isOpen) {
      const visibleChildren = filterTerm
        ? node.children.filter((c) => nodeMatchesFilter(c, filterTerm))
        : node.children
      result.push(...flattenTree(visibleChildren, depth + 1, openSet, filterTerm))
    }
  }
  return result
}

/** Compute the initial open set from a tree */
function computeInitialOpenSet(nodes: FileNode[], depth: number, acc: Set<string>): void {
  for (const node of nodes) {
    if (node.type !== 'directory') continue
    const autoOpen = shouldAutoExpand(node.name)
      ? true
      : shouldAutoCollapse(node.name)
        ? false
        : depth < 1
    if (autoOpen) {
      acc.add(node.path)
      computeInitialOpenSet(node.children, depth + 1, acc)
    }
  }
}

// ── FileTreeNode (recursive — used when < 500 nodes) ────────────────

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

// ── VirtualRow — one row for the react-window list ──────────────────

const VIRTUALIZED_THRESHOLD = 500
const ROW_HEIGHT = 24 // px — matches py-0.5 + text-xs line height

interface VirtualRowData {
  flatNodes: FlatNode[]
  activeFilePath: string | null
  onToggle: (path: string) => void
  onFileClick: (node: FileNode) => void
}

function VirtualRow({ index, style, data }: ListChildComponentProps<VirtualRowData>): React.JSX.Element {
  const { flatNodes, activeFilePath, onToggle, onFileClick } = data
  const { node, depth, isOpen } = flatNodes[index]
  const isDir = node.type === 'directory'
  const isSelected = !isDir && activeFilePath === node.path

  function handleClick(): void {
    if (isDir) {
      onToggle(node.path)
    } else {
      onFileClick(node)
    }
  }

  return (
    <div style={style}>
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
              className={`shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
            />
            {isOpen ? (
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
    </div>
  )
}

// ── VirtualFileTree — react-window backed rendering ──────────────────

function VirtualFileTree({
  fileTree,
  filterTerm,
  containerHeight
}: {
  fileTree: FileNode[]
  filterTerm: string
  containerHeight: number
}): React.JSX.Element {
  const openFile = useCortexStore((s) => s.openFile)
  const setFileContent = useCortexStore((s) => s.setFileContent)
  const activeFilePath = useCortexStore((s) => s.activeFilePath)
  const repos = useCortexStore((s) => s.repos)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)

  // Initialise the open set once from the tree
  const initialOpenSet = useMemo(() => {
    const set = new Set<string>()
    computeInitialOpenSet(fileTree, 0, set)
    return set
  }, [fileTree])

  const [openSet, setOpenSet] = useState<Set<string>>(initialOpenSet)

  const flatNodes = useMemo(
    () => flattenTree(fileTree, 0, openSet, filterTerm),
    [fileTree, openSet, filterTerm]
  )

  const onToggle = useCallback((path: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const onFileClick = useCallback(
    async (node: FileNode) => {
      openFile(node.path, node.language || 'plaintext')
      try {
        const repo = repos.find((r) => r.id === activeRepoId)
        if (!repo) return
        const content = await window.api.cortex.getFileContent(repo.repoPath, node.path)
        setFileContent(content)
      } catch {
        // Silently handle
      }
    },
    [openFile, setFileContent, repos, activeRepoId]
  )

  const itemData: VirtualRowData = useMemo(
    () => ({ flatNodes, activeFilePath: activeFilePath ?? null, onToggle, onFileClick }),
    [flatNodes, activeFilePath, onToggle, onFileClick]
  )

  return (
    <FixedSizeList
      height={containerHeight}
      itemCount={flatNodes.length}
      itemSize={ROW_HEIGHT}
      width="100%"
      itemData={itemData}
    >
      {VirtualRow}
    </FixedSizeList>
  )
}

// ── FileTree (container) ────────────────────────────────────────────

export default function FileTree(): React.JSX.Element {
  const [search, setSearch] = useState('')
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  const filterTerm = useMemo(() => search.trim().toLowerCase(), [search])
  const fileTree = analysisResult?.fileTree ?? []

  // Count total visible nodes to decide rendering strategy
  const visibleNodeCount = useMemo(() => {
    function count(nodes: FileNode[]): number {
      return nodes.reduce((acc, n) => acc + 1 + (n.type === 'directory' ? count(n.children) : 0), 0)
    }
    return count(fileTree)
  }, [fileTree])

  // Keep track of the tree container height for FixedSizeList
  const useVirtual = visibleNodeCount > VIRTUALIZED_THRESHOLD

  // Observe container height when using virtualization
  const treeAreaRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || !useVirtual) return
      const ro = new ResizeObserver((entries) => {
        const height = entries[0]?.contentRect.height
        if (height) setContainerHeight(height)
      })
      ro.observe(el)
      setContainerHeight(el.clientHeight || 600)
    },
    [useVirtual]
  )

  return (
    <div className="flex h-full min-w-0 flex-col overflow-x-auto" ref={containerRef}>
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
      {useVirtual ? (
        <div
          ref={treeAreaRef}
          className="flex-1 overflow-hidden py-1"
        >
          <VirtualFileTree
            fileTree={fileTree}
            filterTerm={filterTerm}
            containerHeight={containerHeight}
          />
        </div>
      ) : (
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
      )}
    </div>
  )
}
