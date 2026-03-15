/**
 * FlowNode -- Custom React Flow node for code entity visualization.
 * Displays gradient background, kind-based icon, label, summary, and file path.
 * MUST be defined outside parent components and wrapped with React.memo for perf.
 */
import { memo, useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { motion } from 'framer-motion'
import {
  Globe,
  Cog,
  Database,
  Plug,
  Boxes,
  Flame,
  Download,
  Upload,
  GitBranch,
  ListChecks,
  FileText,
  Circle,
  Shield,
  HardDrive,
  Route,
  ChevronRight,
  type LucideIcon
} from 'lucide-react'
import type { FlowNodeData, FlowNodeType } from '../../../types/cortex'
import { useCortexStore } from '../../../stores/cortex-store'
import { usePrefersReducedMotion } from './useReducedMotion'

// ---- Kind-to-style mapping ----

interface KindStyle {
  gradient: string
  border: string
  glow: string
  Icon: LucideIcon
  textColor: string
}

const KIND_STYLES: Record<string, KindStyle> = {
  controller: {
    gradient: 'from-teal-500/20 to-teal-600/10',
    border: 'border-teal-500/30',
    glow: 'shadow-teal-500/20',
    Icon: Globe,
    textColor: 'text-teal-300'
  },
  'web-adapter': {
    gradient: 'from-teal-500/20 to-teal-600/10',
    border: 'border-teal-500/30',
    glow: 'shadow-teal-500/20',
    Icon: Globe,
    textColor: 'text-teal-300'
  },
  service: {
    gradient: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    Icon: Cog,
    textColor: 'text-blue-300'
  },
  repository: {
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    Icon: Database,
    textColor: 'text-amber-300'
  },
  database: {
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    Icon: HardDrive,
    textColor: 'text-amber-300'
  },
  'db-adapter': {
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    Icon: Database,
    textColor: 'text-amber-300'
  },
  middleware: {
    gradient: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    Icon: Shield,
    textColor: 'text-purple-300'
  },
  'port-in': {
    gradient: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    Icon: Plug,
    textColor: 'text-purple-300'
  },
  'port-out': {
    gradient: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    Icon: Upload,
    textColor: 'text-purple-300'
  },
  component: {
    gradient: 'from-green-500/20 to-green-600/10',
    border: 'border-green-500/30',
    glow: 'shadow-green-500/20',
    Icon: Boxes,
    textColor: 'text-green-300'
  },
  route: {
    gradient: 'from-teal-500/20 to-teal-600/10',
    border: 'border-teal-500/30',
    glow: 'shadow-teal-500/20',
    Icon: Route,
    textColor: 'text-teal-300'
  },
  'spark-transform': {
    gradient: 'from-orange-500/20 to-orange-600/10',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/20',
    Icon: Flame,
    textColor: 'text-orange-300'
  },
  'spark-source': {
    gradient: 'from-cyan-500/20 to-cyan-600/10',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/20',
    Icon: Download,
    textColor: 'text-cyan-300'
  },
  'spark-sink': {
    gradient: 'from-rose-500/20 to-rose-600/10',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/20',
    Icon: Upload,
    textColor: 'text-rose-300'
  },
  dag: {
    gradient: 'from-indigo-500/20 to-indigo-600/10',
    border: 'border-indigo-500/30',
    glow: 'shadow-indigo-500/20',
    Icon: GitBranch,
    textColor: 'text-indigo-300'
  },
  task: {
    gradient: 'from-slate-500/20 to-slate-600/10',
    border: 'border-slate-500/30',
    glow: 'shadow-slate-500/20',
    Icon: ListChecks,
    textColor: 'text-slate-300'
  },
  model: {
    gradient: 'from-pink-500/20 to-pink-600/10',
    border: 'border-pink-500/30',
    glow: 'shadow-pink-500/20',
    Icon: FileText,
    textColor: 'text-pink-300'
  },
  default: {
    gradient: 'from-gray-500/20 to-gray-600/10',
    border: 'border-gray-500/30',
    glow: 'shadow-gray-500/20',
    Icon: Circle,
    textColor: 'text-gray-300'
  }
}

function getKindStyle(type: FlowNodeType | string): KindStyle {
  return KIND_STYLES[type] ?? KIND_STYLES.default
}

// ---- Component ----

const FlowNode = memo(function FlowNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const [showTooltip, setShowTooltip] = useState(false)
  const navigateToFile = useCortexStore((s) => s.navigateToFile)
  const reducedMotion = usePrefersReducedMotion()

  const style = getKindStyle(data.type)
  const { Icon, gradient, border, glow, textColor } = style

  const fileName = data.filePath.split('/').pop() ?? data.filePath
  const fileLabel = data.line > 0 ? `${fileName}:${data.line}` : fileName

  function handleClick(): void {
    navigateToFile(data.filePath, data.line > 0 ? data.line : undefined)
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
        whileHover={reducedMotion ? undefined : { scale: 1.02 }}
        transition={{ duration: 0.15 }}
        onClick={handleClick}
        className={`relative overflow-hidden cursor-pointer rounded-xl border ${border} bg-white/[0.03] backdrop-blur-xl px-3 py-2 shadow-lg ${glow}`}
        style={{ minWidth: 200, maxWidth: 240 }}
      >
        <div className={`absolute left-0 inset-y-0 w-1 rounded-l-xl bg-gradient-to-b ${gradient}`} />

        {/* Header */}
        <div className="flex items-center gap-1.5">
          <Icon size={12} className={`shrink-0 ${textColor}`} />
          <span className="flex-1 truncate text-[11px] font-semibold text-text-primary">
            {data.label}
          </span>
          <span className={`shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[8px] font-mono ${textColor}`}>
            {data.type}
          </span>
          <ChevronRight size={10} className="shrink-0 text-text-secondary/50" />
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
          className="absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-3 shadow-xl"
          style={{ minWidth: 250, maxWidth: 320 }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Icon size={12} className={textColor} />
            <span className={`text-xs font-semibold ${textColor}`}>
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
