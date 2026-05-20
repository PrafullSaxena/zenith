/**
 * TaskCard — Compact task row with hover-reveal delete, framer-motion layout animation.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'
import { AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { isTaskStale, staleDays } from '@renderer/stores/task-groomer-store'
import StatusDropdown from './StatusDropdown'

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(diff / 86400000)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(diff / (30 * 86400000))}mo ago`
}

const PRIORITY_CONFIG: Record<
  NonNullable<Task['priority']>,
  { label: string; className: string }
> = {
  p1: { label: 'P1', className: 'text-red-400 bg-red-400/12 border-red-400/20' },
  p2: { label: 'P2', className: 'text-amber-400 bg-amber-400/12 border-amber-400/20' },
  p3: { label: 'P3', className: 'text-blue-400 bg-blue-400/12 border-blue-400/20' }
}

const ACTION_CONFIG: Record<string, string> = {
  do: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  delegate: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  defer: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  delete: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
}

interface TaskCardProps {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
  onClick: (task: Task) => void
  onDelete?: (id: string) => void
  isSelected?: boolean
  isGrooming?: boolean
  isGroomFailed?: boolean
  animationDelay?: number
}

export function TaskCard({
  task,
  onStatusChange,
  onClick,
  onDelete,
  isSelected = false,
  isGrooming = false,
  isGroomFailed = false,
  animationDelay = 0
}: TaskCardProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const stale = isTaskStale(task)
  const days = stale ? staleDays(task) : 0
  const actionClass = task.suggestedAction ? ACTION_CONFIG[task.suggestedAction] : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{
        layout: { duration: 0.18 },
        opacity: { duration: 0.15 },
        x: { duration: 0.15 },
        height: { duration: 0.18 },
        delay: animationDelay
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(task)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(task)}
        className={cn(
          'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer',
          'border transition-all duration-150 select-none',
          isSelected
            ? 'bg-white/[0.06] border-white/10 shadow-sm'
            : 'border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]',
          isGrooming && 'animate-pulse opacity-60',
          isGroomFailed && 'border-amber-400/15 bg-amber-400/[0.03]'
        )}
      >
        {/* Status badge */}
        <StatusDropdown task={task} onStatusChange={onStatusChange} />

        {/* Task text */}
        <TooltipProvider delayDuration={700}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1 text-sm text-foreground/90 truncate min-w-0 leading-snug">
                {task.text}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[400px] break-words whitespace-pre-wrap">
              {task.text}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Chips — priority, action, stale */}
        <div className="flex items-center gap-1 shrink-0">
          {task.priority && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-1.5 py-0.5',
                'text-[10px] font-semibold border',
                PRIORITY_CONFIG[task.priority].className
              )}
            >
              {PRIORITY_CONFIG[task.priority].label}
            </span>
          )}

          {task.suggestedAction && actionClass && (
            <span
              className={cn(
                'text-[10px] font-medium border rounded-full px-1.5 py-0.5 capitalize',
                actionClass
              )}
            >
              {task.suggestedAction}
            </span>
          )}

          {stale && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/12 border border-amber-400/20 text-amber-400">
              {days}d
            </span>
          )}

          {isGroomFailed && (
            <AlertCircle size={11} className="text-amber-400" aria-label="Grooming failed" />
          )}
        </div>

        {/* Right side: timestamp OR delete button on hover */}
        <div className="flex items-center gap-2 shrink-0 w-14 justify-end">
          <motion.span
            animate={{ opacity: hovered && onDelete ? 0 : 1 }}
            transition={{ duration: 0.1 }}
            className="text-[11px] text-muted-foreground/60 whitespace-nowrap"
          >
            {formatRelativeTime(task.createdAt)}
          </motion.span>

          {onDelete && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.8 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className={cn(
                'absolute right-3 flex items-center justify-center',
                'w-6 h-6 rounded-md',
                'text-muted-foreground hover:text-red-400 hover:bg-red-400/10',
                'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400/60'
              )}
              aria-label="Delete task"
            >
              <Trash2 size={12} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default TaskCard
