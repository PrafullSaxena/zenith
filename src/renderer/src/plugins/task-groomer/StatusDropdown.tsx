/**
 * StatusDropdown — Colored status badge that opens a context-aware dropdown
 * for changing a task's status.
 *
 * The badge color reflects the current status. Clicking it opens a DropdownMenu
 * listing all 5 statuses in a context-aware order (current status grayed out).
 *
 * Status changes are applied immediately with no confirmation or undo toast
 * (per CONTEXT.md locked decision).
 */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { cn } from '@renderer/lib/utils'

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

type TaskStatus = Task['status']

interface StatusConfig {
  label: string
  color: string       // text color class
  bgColor: string     // bg + border classes for badge
}

const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  dump: {
    label: 'Dump',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/15 border-blue-400/20'
  },
  groomed: {
    label: 'Groomed',
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/15 border-violet-400/20'
  },
  done: {
    label: 'Done',
    color: 'text-green-400',
    bgColor: 'bg-green-400/15 border-green-400/20'
  },
  delegated: {
    label: 'Delegated',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/15 border-amber-400/20'
  },
  aborted: {
    label: 'Aborted',
    color: 'text-red-400',
    bgColor: 'bg-red-400/15 border-red-400/20'
  }
}

/**
 * Context-aware status ordering.
 * Current status is always listed last (rendered grayed out).
 */
const STATUS_ORDER: Record<TaskStatus, TaskStatus[]> = {
  dump:      ['groomed', 'done', 'delegated', 'aborted', 'dump'],
  groomed:   ['done', 'delegated', 'aborted', 'dump', 'groomed'],
  done:      ['dump', 'groomed', 'delegated', 'aborted', 'done'],
  delegated: ['dump', 'groomed', 'done', 'aborted', 'delegated'],
  aborted:   ['dump', 'groomed', 'done', 'delegated', 'aborted']
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StatusDropdownProps {
  task: Task
  onStatusChange: (id: string, status: TaskStatus) => void
}

export function StatusDropdown({ task, onStatusChange }: StatusDropdownProps): React.JSX.Element {
  const current = task.status
  const config = STATUS_CONFIG[current]
  const orderedStatuses = STATUS_ORDER[current]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5',
            'text-[10px] font-medium border shrink-0',
            'transition-opacity hover:opacity-80 focus:outline-none',
            config.color,
            config.bgColor
          )}
        >
          {config.label}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        onClick={(e) => e.stopPropagation()}
        className="min-w-[130px]"
      >
        {orderedStatuses.map((status) => {
          const isCurrent = status === current
          const cfg = STATUS_CONFIG[status]

          return (
            <DropdownMenuItem
              key={status}
              disabled={isCurrent}
              onClick={isCurrent ? undefined : () => onStatusChange(task.id, status)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                isCurrent && 'opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              <span className={cn('text-[10px] font-medium', cfg.color)}>
                {cfg.label}
              </span>
              {isCurrent && (
                <span className="ml-auto text-[9px] text-muted-foreground">current</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default StatusDropdown
