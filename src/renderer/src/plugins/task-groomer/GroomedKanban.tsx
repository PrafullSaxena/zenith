/**
 * GroomedKanban — Kanban view for the Groomed tab.
 *
 * Four columns: Groomed → Done → Delegated → Aborted
 * Cards use StatusDropdown to move between columns.
 * Hover reveals delete button (same pattern as TaskCard).
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCheck, ArrowRight, Users, XCircle, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { isTaskStale } from '@renderer/stores/task-groomer-store'
import StatusDropdown from './StatusDropdown'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type KanbanStatus = 'groomed' | 'done' | 'delegated' | 'aborted'

const COLUMNS: {
  id: KanbanStatus
  label: string
  icon: React.ElementType
  accent: string
  headerBg: string
  countBg: string
}[] = [
  {
    id: 'groomed',
    label: 'Active',
    icon: ArrowRight,
    accent: 'border-violet-400/30',
    headerBg: 'bg-violet-400/8',
    countBg: 'bg-violet-400/15 text-violet-400'
  },
  {
    id: 'done',
    label: 'Done',
    icon: CheckCheck,
    accent: 'border-emerald-400/30',
    headerBg: 'bg-emerald-400/8',
    countBg: 'bg-emerald-400/15 text-emerald-400'
  },
  {
    id: 'delegated',
    label: 'Delegated',
    icon: Users,
    accent: 'border-amber-400/30',
    headerBg: 'bg-amber-400/8',
    countBg: 'bg-amber-400/15 text-amber-400'
  },
  {
    id: 'aborted',
    label: 'Aborted',
    icon: XCircle,
    accent: 'border-red-400/30',
    headerBg: 'bg-red-400/8',
    countBg: 'bg-red-400/15 text-red-400'
  }
]

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  p1: { label: 'P1', className: 'bg-red-400/15 text-red-400 border-red-400/25' },
  p2: { label: 'P2', className: 'bg-amber-400/15 text-amber-400 border-amber-400/25' },
  p3: { label: 'P3', className: 'bg-blue-400/15 text-blue-400 border-blue-400/25' }
}

const ACTION_CONFIG: Record<string, string> = {
  do: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  delegate: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  defer: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
  delete: 'bg-rose-400/10 text-rose-400 border-rose-400/20'
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(diff / 86400000)
  if (days < 30) return `${days}d`
  return `${Math.floor(diff / (30 * 86400000))}mo`
}

// ---------------------------------------------------------------------------
// Kanban card
// ---------------------------------------------------------------------------

function KanbanCard({
  task,
  onStatusChange,
  onDelete,
  onClick,
  isSelected
}: {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete?: (id: string) => void
  onClick: (task: Task) => void
  isSelected: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const stale = isTaskStale(task)
  const priorityCfg = task.priority ? PRIORITY_CONFIG[task.priority] : null
  const actionClass = task.suggestedAction ? ACTION_CONFIG[task.suggestedAction] : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={{ duration: 0.16 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(task)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(task)}
        className={cn(
          'relative group rounded-xl border p-3 cursor-pointer transition-all duration-150 select-none',
          isSelected
            ? 'border-primary/30 bg-primary/8 shadow-md'
            : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/12',
          stale && 'border-amber-400/20'
        )}
      >
        {/* Top row: priority + time + delete */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {priorityCfg && (
              <span
                className={cn(
                  'text-[10px] font-semibold border rounded-full px-1.5 py-0.5',
                  priorityCfg.className
                )}
              >
                {priorityCfg.label}
              </span>
            )}
            {actionClass && task.suggestedAction && (
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
                Stale
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground/50">
              {formatRelativeTime(task.createdAt)}
            </span>
            {onDelete && (
              <motion.button
                type="button"
                animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.7 }}
                transition={{ duration: 0.12 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task.id)
                }}
                className="w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                aria-label="Delete task"
              >
                <Trash2 size={11} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Task text */}
        <p className="text-[13px] text-foreground/90 leading-snug line-clamp-3 mb-3">{task.text}</p>

        {/* Bottom: status dropdown */}
        <div onClick={(e) => e.stopPropagation()}>
          <StatusDropdown task={task} onStatusChange={onStatusChange} />
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Kanban column
// ---------------------------------------------------------------------------

function KanbanColumn({
  column,
  tasks,
  onStatusChange,
  onDelete,
  onCardClick,
  selectedTaskId
}: {
  column: (typeof COLUMNS)[0]
  tasks: Task[]
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete?: (id: string) => void
  onCardClick: (task: Task) => void
  selectedTaskId: string | null
}) {
  const Icon = column.icon

  return (
    <div className="flex flex-col min-w-[220px] flex-1 max-w-[320px]">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-2',
          column.accent,
          column.headerBg
        )}
      >
        <Icon size={13} className="text-muted-foreground shrink-0" />
        <span className="text-[11px] font-semibold text-foreground/80 flex-1">{column.label}</span>
        <span
          className={cn('text-[10px] font-semibold rounded-full px-1.5 py-0.5', column.countBg)}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-0.5">
        <AnimatePresence initial={false}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-white/8">
              <span className="text-[11px] text-muted-foreground/40">No tasks</span>
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onClick={onCardClick}
                isSelected={selectedTaskId === task.id}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface GroomedKanbanProps {
  tasks: Task[] // All groomed tasks (status !== 'dump')
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete?: (id: string) => void
  onCardClick: (task: Task) => void
  selectedTaskId: string | null
}

export function GroomedKanban({
  tasks,
  onStatusChange,
  onDelete,
  onCardClick,
  selectedTaskId
}: GroomedKanbanProps): React.JSX.Element {
  const byStatus = (status: KanbanStatus) => tasks.filter((t) => t.status === status)

  return (
    <div className="flex gap-3 h-full overflow-x-auto px-3 py-2 pb-3">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.id}
          column={col}
          tasks={byStatus(col.id)}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onCardClick={onCardClick}
          selectedTaskId={selectedTaskId}
        />
      ))}
    </div>
  )
}

export default GroomedKanban
