/**
 * GroomDigest — Post-batch groom digest panel.
 *
 * Slides in from the right after a batch groom run completes.
 * Shows run statistics in the header and a compact sorted list of all
 * groomed tasks with priority badge + action chip per row.
 *
 * Clicking a task row: dismisses the digest and opens TaskSidePanel for that task.
 * X button in header: dismisses the digest (TaskSidePanel resumes normal state).
 *
 * Slides in/out via CSS transition-transform (no Framer Motion needed here).
 * Sorted: P1 → P2 → P3, then Do → Delegate → Defer → Delete within priority.
 */
import { X } from 'lucide-react'
import { useTaskGroomerStore } from '@renderer/stores/task-groomer-store'
import { cn } from '@renderer/lib/utils'

// ---------------------------------------------------------------------------
// Badge configs — mirror TaskSidePanel priority colors
// ---------------------------------------------------------------------------

const PRIORITY_BADGE: Record<
  NonNullable<Task['priority']>,
  { label: string; className: string }
> = {
  p1: { label: 'P1', className: 'text-red-400 bg-red-400/15 border-red-400/20' },
  p2: { label: 'P2', className: 'text-amber-400 bg-amber-400/15 border-amber-400/20' },
  p3: { label: 'P3', className: 'text-blue-400 bg-blue-400/15 border-blue-400/20' }
}

const ACTION_CHIP: Record<
  NonNullable<Task['suggestedAction']>,
  { label: string; className: string }
> = {
  do: { label: 'Do', className: 'text-emerald-400 bg-emerald-400/15 border-emerald-400/20' },
  delegate: {
    label: 'Delegate',
    className: 'text-violet-400 bg-violet-400/15 border-violet-400/20'
  },
  defer: { label: 'Defer', className: 'text-slate-400 bg-slate-400/15 border-slate-400/20' },
  delete: { label: 'Delete', className: 'text-rose-400 bg-rose-400/15 border-rose-400/20' }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroomDigestProps {
  open: boolean
  onClose: () => void
  onTaskClick: (taskId: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GroomDigest({ open, onClose, onTaskClick }: GroomDigestProps): React.JSX.Element {
  const digestTasks = useTaskGroomerStore((s) => s.digestTasks)

  // Compute header stats
  const p1Count = digestTasks.filter((t) => t.priority === 'p1').length
  const p2Count = digestTasks.filter((t) => t.priority === 'p2').length
  const p3Count = digestTasks.filter((t) => t.priority === 'p3').length
  const total = digestTasks.length

  // Build stat line: "Groomed N tasks · X P1 · Y P2 · Z P3"
  const statLine =
    total === 0
      ? 'No tasks groomed'
      : [
          `Groomed ${total} task${total !== 1 ? 's' : ''}`,
          p1Count > 0 ? `${p1Count} P1` : null,
          p2Count > 0 ? `${p2Count} P2` : null,
          p3Count > 0 ? `${p3Count} P3` : null
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-50 w-[420px] sm:w-[480px]',
        'flex flex-col bg-background border-l border-white/8 shadow-xl',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 pt-10 border-b border-white/6">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-foreground">Groom Run Complete</h2>
          <p className="text-xs text-muted-foreground">{statLine}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label="Close digest"
        >
          <X size={16} />
        </button>
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">No tasks were groomed in this run.</p>
        </div>
      )}

      {/* Task rows */}
      {total > 0 && (
        <div className="flex flex-col flex-1 overflow-y-auto py-2">
          {digestTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onTaskClick(task.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/4 transition-colors group focus-visible:outline-none focus-visible:bg-white/4"
            >
              {/* Task title — truncated */}
              <span className="flex-1 text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {task.text}
              </span>

              {/* Priority badge */}
              {task.priority && (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border shrink-0',
                    PRIORITY_BADGE[task.priority].className
                  )}
                >
                  {PRIORITY_BADGE[task.priority].label}
                </span>
              )}

              {/* Action chip */}
              {task.suggestedAction && (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border shrink-0',
                    ACTION_CHIP[task.suggestedAction].className
                  )}
                >
                  {ACTION_CHIP[task.suggestedAction].label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-white/6">
        <p className="text-[10px] text-muted-foreground">Click a task to view full details</p>
      </div>
    </div>
  )
}

export default GroomDigest
