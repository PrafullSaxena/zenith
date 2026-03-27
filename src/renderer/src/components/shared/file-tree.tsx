import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  Search
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Input } from '@renderer/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileTreeNode {
  name: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
  path: string
  language?: string
  size?: number
}

export interface FileTreeProps {
  nodes: FileTreeNode[]
  onSelect: (node: FileTreeNode) => void
  selectedPath?: string
  searchable?: boolean
  defaultExpanded?: string[]
  defaultCollapsed?: string[]
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileIcon(node: FileTreeNode) {
  const ext = node.name.split('.').pop()?.toLowerCase()
  const lang = node.language || ext

  switch (lang) {
    case 'ts':
    case 'tsx':
    case 'typescript':
      return <FileCode size={16} className="text-blue-400 shrink-0" />
    case 'js':
    case 'jsx':
    case 'javascript':
      return <FileCode size={16} className="text-yellow-400 shrink-0" />
    case 'py':
    case 'python':
      return <FileCode size={16} className="text-green-400 shrink-0" />
    case 'json':
      return <FileJson size={16} className="text-orange-400 shrink-0" />
    case 'css':
    case 'html':
      return <FileCode size={16} className="text-pink-400 shrink-0" />
    case 'md':
    case 'markdown':
      return <FileText size={16} className="text-muted-foreground shrink-0" />
    default:
      return <File size={16} className="text-muted-foreground shrink-0" />
  }
}

function formatSize(bytes?: number): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function filterNodes(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  if (!query) return nodes
  const lower = query.toLowerCase()

  return nodes.reduce<FileTreeNode[]>((acc, node) => {
    if (node.type === 'file') {
      if (node.name.toLowerCase().includes(lower)) {
        acc.push(node)
      }
    } else {
      const filteredChildren = filterNodes(node.children ?? [], query)
      if (filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren })
      }
    }
    return acc
  }, [])
}

function collectPaths(nodes: FileTreeNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.type === 'folder') {
      paths.push(node.path)
      if (node.children) {
        paths.push(...collectPaths(node.children))
      }
    }
  }
  return paths
}

// ---------------------------------------------------------------------------
// TreeNodeItem
// ---------------------------------------------------------------------------

function TreeNodeItem({
  node,
  depth,
  expanded,
  selectedPath,
  onToggle,
  onSelect
}: {
  node: FileTreeNode
  depth: number
  expanded: Set<string>
  selectedPath?: string
  onToggle: (path: string) => void
  onSelect: (node: FileTreeNode) => void
}) {
  const isExpanded = expanded.has(node.path)
  const isSelected = selectedPath === node.path
  const isFolder = node.type === 'folder'

  const handleClick = () => {
    if (isFolder) {
      onToggle(node.path)
    } else {
      onSelect(node)
    }
  }

  const content = (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-sm',
        isSelected ? 'bg-primary/18 text-foreground' : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
      )}
      style={{ paddingLeft: depth * 16 + 8 }}
      role="treeitem"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick()
        if (e.key === 'ArrowRight' && isFolder && !isExpanded) onToggle(node.path)
        if (e.key === 'ArrowLeft' && isFolder && isExpanded) onToggle(node.path)
      }}
    >
      {isFolder && (
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronRight size={14} />
        </motion.div>
      )}
      {isFolder ? (
        isExpanded ? (
          <FolderOpen size={16} className="text-primary shrink-0" />
        ) : (
          <Folder size={16} className="text-primary shrink-0" />
        )
      ) : (
        getFileIcon(node)
      )}
      <span className="truncate">{node.name}</span>
    </div>
  )

  // Wrap file nodes with tooltip showing size/language
  if (!isFolder && (node.size != null || node.language)) {
    return (
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">
          <div className="text-xs">
            {node.language && <span>{node.language}</span>}
            {node.language && node.size != null && <span> &middot; </span>}
            {node.size != null && <span>{formatSize(node.size)}</span>}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

// ---------------------------------------------------------------------------
// FileTree
// ---------------------------------------------------------------------------

export function FileTree({
  nodes,
  onSelect,
  selectedPath,
  searchable = false,
  defaultExpanded = [],
  defaultCollapsed = [],
  className
}: FileTreeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set(defaultExpanded)
    for (const path of defaultCollapsed) {
      initial.delete(path)
    }
    return initial
  })
  const [searchQuery, setSearchQuery] = useState('')

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes
    return filterNodes(nodes, searchQuery)
  }, [nodes, searchQuery])

  // Auto-expand all folders when searching
  const effectiveExpanded = useMemo(() => {
    if (searchQuery) {
      return new Set(collectPaths(filteredNodes))
    }
    return expanded
  }, [searchQuery, filteredNodes, expanded])

  const handleToggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const renderNodes = (nodeList: FileTreeNode[], depth: number) => {
    return nodeList.map((node) => (
      <div key={node.path}>
        <TreeNodeItem
          node={node}
          depth={depth}
          expanded={effectiveExpanded}
          selectedPath={selectedPath}
          onToggle={handleToggle}
          onSelect={onSelect}
        />
        {node.type === 'folder' && node.children && (
          <AnimatePresence initial={false}>
            {effectiveExpanded.has(node.path) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: 'hidden' }}
              >
                {renderNodes(node.children, depth + 1)}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    ))
  }

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col gap-2', className)} role="tree">
        {searchable && (
          <div className="relative px-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 text-sm"
            />
          </div>
        )}
        <div className="overflow-y-auto">
          {filteredNodes.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No matching files
            </div>
          ) : (
            renderNodes(filteredNodes, 0)
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
