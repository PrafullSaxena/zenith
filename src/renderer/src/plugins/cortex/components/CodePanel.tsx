/**
 * CodePanel — Main layout for the Code tab.
 * Horizontal split: FileTree (left sidebar) | CodeTabs + CodeViewer (right).
 * Custom drag-to-resize handle (plain flexbox — no react-resizable-panels).
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { FileCode } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import { FileTree, type FileTreeNode } from '@renderer/components/shared/file-tree'
import type { FileNode } from '../../../types/cortex'
import CodeTabs from './CodeTabs'
import CodeViewer from './CodeViewer'

const MIN_WIDTH = 160
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 260

// ---------------------------------------------------------------------------
// Helpers: convert Cortex FileNode[] -> shared FileTreeNode[]
// ---------------------------------------------------------------------------

const AUTO_EXPAND = new Set(['src', 'app', 'lib'])
const AUTO_COLLAPSE = new Set(['node_modules', 'dist', '.git', 'test', '__tests__'])

function convertNodes(nodes: FileNode[]): FileTreeNode[] {
  return nodes.map((n) => ({
    name: n.name,
    path: n.path,
    type: n.type === 'directory' ? ('folder' as const) : ('file' as const),
    language: n.language ?? undefined,
    size: n.size,
    children: n.type === 'directory' ? convertNodes(n.children) : undefined
  }))
}

function collectDefaultExpanded(nodes: FileNode[], depth: number): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.type !== 'directory') continue
    const shouldOpen = AUTO_EXPAND.has(node.name)
      ? true
      : AUTO_COLLAPSE.has(node.name)
        ? false
        : depth < 1
    if (shouldOpen) {
      paths.push(node.path)
      paths.push(...collectDefaultExpanded(node.children, depth + 1))
    }
  }
  return paths
}

// ---------------------------------------------------------------------------
// CodePanel
// ---------------------------------------------------------------------------

export default function CodePanel(): React.JSX.Element {
  const activeFilePath = useCortexStore((s) => s.activeFilePath)
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const openFile = useCortexStore((s) => s.openFile)
  const setFileContent = useCortexStore((s) => s.setFileContent)
  const repos = useCortexStore((s) => s.repos)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

  const fileTree = analysisResult?.fileTree ?? []

  const treeNodes = useMemo(() => convertNodes(fileTree), [fileTree])
  const defaultExpanded = useMemo(() => collectDefaultExpanded(fileTree, 0), [fileTree])

  const handleSelect = useCallback(
    async (node: FileTreeNode) => {
      openFile(node.path, node.language || 'plaintext')
      try {
        const repo = repos.find((r) => r.id === activeRepoId)
        if (!repo) return
        const content = await window.api.cortex.getFileContent(repo.repoPath, node.path)
        setFileContent(content)
      } catch {
        // Silently handle — file might be binary or inaccessible
      }
    },
    [openFile, setFileContent, repos, activeRepoId]
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      startX.current = e.clientX
      startWidth.current = sidebarWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [sidebarWidth]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setSidebarWidth(newWidth)
    }

    const onMouseUp = (): void => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="flex h-full">
      {/* Left panel: File Tree */}
      <div
        className="h-full shrink-0 overflow-x-auto border-r border-white/[0.06] bg-white/[0.02]"
        style={{ width: sidebarWidth }}
      >
        <FileTree
          nodes={treeNodes}
          onSelect={handleSelect}
          selectedPath={activeFilePath ?? undefined}
          searchable
          defaultExpanded={defaultExpanded}
          className="h-full pt-2"
        />
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onMouseDown={onMouseDown}
        className="flex w-2 cursor-col-resize items-center justify-center hover:bg-primary/10 transition-colors"
      >
        <div className="flex flex-col gap-1">
          <div className="h-1 w-1 rounded-full bg-text-secondary/30" />
          <div className="h-1 w-1 rounded-full bg-text-secondary/30" />
          <div className="h-1 w-1 rounded-full bg-text-secondary/30" />
        </div>
      </div>

      {/* Right panel: Code Tabs + Code Viewer */}
      <div className="h-full min-w-0 flex-1">
        {activeFilePath ? (
          <div className="flex h-full flex-col">
            <CodeTabs />
            <div className="flex-1 overflow-hidden">
              <CodeViewer />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileCode size={32} className="opacity-30" />
            <p className="text-sm">Select a file from the tree to view its contents</p>
          </div>
        )}
      </div>
    </div>
  )
}
