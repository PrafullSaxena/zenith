/**
 * CodePanel — Main layout for the Code tab.
 * Horizontal split: FileTree (left sidebar) | CodeTabs + CodeViewer (right).
 * Uses react-resizable-panels v4 for proper resize handling.
 */
import { useCallback, useMemo } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { FileCode, GripVertical } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import { FileTree, type FileTreeNode } from '@renderer/components/shared/file-tree'
import type { FileNode } from '../../../types/cortex'
import CodeTabs from './CodeTabs'
import CodeViewer from './CodeViewer'

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
// Stitch-styled resize handle
// ---------------------------------------------------------------------------

function ResizeHandle(): React.JSX.Element {
  return (
    <PanelResizeHandle className="group relative flex w-2 items-center justify-center transition-colors hover:bg-primary/10 data-[resize-handle-active]:bg-primary/15">
      <div className="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-active]:opacity-100">
        <GripVertical size={10} className="text-muted-foreground" />
      </div>
    </PanelResizeHandle>
  )
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

  return (
    <PanelGroup orientation="horizontal" className="h-full">
      {/* Left panel: File Tree */}
      <Panel defaultSize="20%" minSize="12%" maxSize="35%">
        <div className="h-full overflow-x-auto border-r border-white/6 bg-white/2">
          <FileTree
            nodes={treeNodes}
            onSelect={handleSelect}
            selectedPath={activeFilePath ?? undefined}
            searchable
            defaultExpanded={defaultExpanded}
            className="h-full pt-2"
          />
        </div>
      </Panel>

      {/* Resize handle */}
      <ResizeHandle />

      {/* Right panel: Code Tabs + Code Viewer */}
      <Panel defaultSize="80%">
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
      </Panel>
    </PanelGroup>
  )
}
