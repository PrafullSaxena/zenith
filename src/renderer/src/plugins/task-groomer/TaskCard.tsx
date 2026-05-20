/**
 * TaskCard — Compact Linear-style task row for the Dumpyard View.
 *
 * One row per task with:
 *  - StatusDropdown badge (click → status dropdown, stops propagation)
 *  - Truncated task text with Tooltip for full text on hover
 *  - Priority badge (P1/P2/P3) when present (Phase 18 populates)
 *  - Suggested action chip when present (Phase 18 populates)
 *  - Stale badge (amber "Stale Xd") when isTaskStale() is true
 *  - Relative creation time (right-aligned)
 *
 * Clicking the card opens the side panel (via onClick prop).
 */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'
import { cn } from '@renderer/lib/utils'
import { isTaskStale, staleDays } from '@renderer/stores/task-groomer-store'
import StatusDropdown from './StatusDropdown'

// ---------------------------------------------------------------------------
// Relative time formatter (local utility)
// ---------------------------------------------------------------------------

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(diff / 86400000)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(diff / (30 * 86400000))
  return `${months}mo ago`
}

// ---------------------------------------------------------------------------
// Priority badge config
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG: Record<
  NonNullable<Task['priority']>,
  { label: string; className: string }
> = {
  p1: { label: 'P1', className: 'text-red-400 bg-red-400/15 border-red-400/20' },
  p2: { label: 'P2', className: 'text-amber-400 bg-amber-400/15 border-amber-400/20' },
  p3: { label: 'P3', className: 'text-blue-400 bg-blue-400/15 border-blue-400/20' }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
  onClick: (task: Task) => void
  isSelected?: boolean
  isGrooming?: boolean
}

export function TaskCard({
  task,
  onStatusChange,
  onClick,
  isSelected = false,
  isGrooming = false
}: TaskCardProps): React.JSX.Element {
  const stale = isTaskStale(task)
  const days = stale ? staleDays(task) : 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(task)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(task)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer',
        'border border-transparent transition-colors select-none',
        'hover:bg-white/4',
        isSelected && 'bg-white/6 border-white/8',
        isGrooming && 'animate-pulse opacity-70'
      )}
    >
      {/* Status badge (has its own click handler + stopPropagation) */}
      <StatusDropdown task={task} onStatusChange={onStatusChange} />

      {/* Task text — truncated, tooltip on hover */}
      <TooltipProvider delayDuration={600}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1 text-sm text-foreground truncate min-w-0">{task.text}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[400px] break-words whitespace-pre-wrap">
            {task.text}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Priority badge — Phase 18 fills this */}
      {task.priority && (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-1.5 py-0.5',
            'text-[10px] font-medium border shrink-0',
            PRIORITY_CONFIG[task.priority].className
          )}
        >
          {PRIORITY_CONFIG[task.priority].label}
        </span>
      )}

      {/* Suggested action chip — Phase 18 fills this */}
      {task.suggestedAction && (
        <span className="text-[10px] text-muted-foreground bg-white/4 border border-white/8 rounded-full px-1.5 py-0.5 shrink-0 capitalize">
          {task.suggestedAction}
        </span>
      )}

      {/* Stale badge — amber, shown only for stale dump tasks */}
      {stale && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/20 text-amber-400 shrink-0">
          Stale {days}d
        </span>
      )}

      {/* Relative creation time */}
      <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
        {formatRelativeTime(task.createdAt)}
      </span>
    </div>
  )
}

export default TaskCard
