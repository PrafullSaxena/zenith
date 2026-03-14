/**
 * FlowNode -- Custom React Flow node for code entity visualization.
 * Displays icon, label, summary, file path with hover tooltip and glow effect.
 * MUST be defined outside parent components and wrapped with React.memo for perf.
 */
import { memo, useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import type { FlowNodeData } from '../../../types/codebase-analyzer'
import { getStageColor } from './flow-utils'
import { useCodebaseAnalyzerStore } from '../../../stores/codebase-analyzer-store'

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', java: 'java', kt: 'kotlin', go: 'go', rs: 'rust',
    rb: 'ruby', php: 'php', cs: 'csharp', sql: 'sql'
  }
  return map[ext] ?? ext
}

const FlowNode = memo(function FlowNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const [showTooltip, setShowTooltip] = useState(false)
  const openFile = useCodebaseAnalyzerStore((s) => s.openFile)
  const setActiveTab = useCodebaseAnalyzerStore((s) => s.setActiveTab)

  const colors = getStageColor(data.type)
  const IconComp = (Icons as Record<string, React.ComponentType<{ size?: number }>>)[data.icon] ?? Icons.Circle

  const fileName = data.filePath.split('/').pop() ?? data.filePath
  const fileLabel = data.line > 0 ? `${fileName}:${data.line}` : fileName

  function handleClick(): void {
    openFile(data.filePath, detectLanguage(data.filePath))
    setActiveTab('code')
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-accent/50 !border-border !w-2 !h-2"
      />

      <motion.div
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.15 }}
        onClick={handleClick}
        className="cursor-pointer rounded-lg border px-3 py-2 backdrop-blur-sm"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          minWidth: 200,
          maxWidth: 240
        }}
        onHoverStart={() => undefined}
        onHoverEnd={() => undefined}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <IconComp size={14} />
          <span
            className="flex-1 truncate text-[11px] font-semibold"
            style={{ color: colors.text }}
          >
            {data.label}
          </span>
          <Icons.ChevronRight size={10} className="text-text-secondary/50" />
        </div>

        {/* Summary */}
        {data.summary && (
          <p className="mt-1 line-clamp-2 text-[10px] text-text-secondary">
            {data.summary}
          </p>
        )}

        {/* File path */}
        <p className="mt-0.5 truncate text-[9px] font-mono text-text-secondary/60">
          {fileLabel}
        </p>
      </motion.div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-accent/50 !border-border !w-2 !h-2"
      />

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 rounded-lg border border-border bg-surface-elevated p-3 shadow-xl"
          style={{ minWidth: 250, maxWidth: 320 }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <IconComp size={12} />
            <span className="text-xs font-semibold" style={{ color: colors.text }}>
              {data.label}
            </span>
            <span className="ml-auto rounded bg-surface px-1.5 py-0.5 text-[9px] font-mono text-text-secondary">
              {data.type}
            </span>
          </div>
          {data.summary && (
            <p className="text-[10px] text-text-secondary mb-1">{data.summary}</p>
          )}
          <p className="text-[9px] font-mono text-text-secondary/70">
            {data.filePath}:{data.line}
          </p>
        </div>
      )}
    </div>
  )
})

export default FlowNode
