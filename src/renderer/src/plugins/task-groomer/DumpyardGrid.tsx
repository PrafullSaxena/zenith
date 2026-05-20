/**
 * DumpyardGrid — Masonry-style card grid for dump-status tasks.
 *
 * Renders tasks as visual cards in a 2-column responsive grid.
 * Dump tasks have no grooming data yet, so cards focus on the raw text +
 * creation time + stale badge. Hover reveals a delete button.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
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

interface DumpCardProps {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete?: (id: string) => void
  onClick: (task: Task) => void
  isSelected: boolean
  isGrooming: boolean
  isGroomFailed: boolean
  animationDelay: number
}

function DumpCard({
  task,
  onStatusChange,
  onDelete,
  onClick,
  isSelected,
  isGrooming,
  isGroomFailed,
  animationDelay
}: DumpCardProps) {
  const [hovered, setHovered] = useState(false)
  const stale = isTaskStale(task)
  const days = stale ? staleDays(task) : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, delay: animationDelay, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(task)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(task)}
        className={cn(
          'relative flex flex-col rounded-xl border p-4 cursor-pointer',
          'transition-all duration-150 select-none group',
          'min-h-[110px]',
          isSelected
            ? 'border-primary/30 bg-primary/[0.06] shadow-md shadow-primary/10'
            : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12]',
          isGrooming && 'animate-pulse opacity-60',
          isGroomFailed && 'border-amber-400/20 bg-amber-400/[0.03]',
          stale && !isGroomFailed && 'border-amber-400/15'
        )}
      >
        {/* Delete button — top-right, reveals on hover */}
        {onDelete && (
          <motion.button
            type="button"
            animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.75 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400/60"
            aria-label="Delete task"
          >
            <Trash2 size={12} />
          </motion.button>
        )}

        {/* Grooming spinner overlay */}
        {isGrooming && (
          <div className="absolute top-3 right-3 flex items-center gap-1 text-primary">
            <Loader2 size={12} className="animate-spin" />
          </div>
        )}

        {/* Task text — primary content, up to 4 lines */}
        <p className={cn(
          'text-sm text-foreground/90 leading-relaxed flex-1 mb-3',
          'line-clamp-4 break-words',
          isGrooming && 'text-foreground/50'
        )}>
          {task.text}
        </p>

        {/* Footer row */}
        <div className="flex items-center gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
          <StatusDropdown task={task} onStatusChange={onStatusChange} />

          {stale && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/12 border border-amber-400/20 text-amber-400 shrink-0">
              <AlertTriangle size={9} />
              {days}d stale
            </span>
          )}

          <div className="flex items-center gap-1 ml-auto text-[11px] text-muted-foreground/50 shrink-0">
            <Clock size={10} />
            {formatRelativeTime(task.createdAt)}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface DumpyardGridProps {
  tasks: Task[]
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete?: (id: string) => void
  onCardClick: (task: Task) => void
  selectedTaskId: string | null
  groomingTaskIds: Set<string>
  failedTaskIds: Set<string>
}

export function DumpyardGrid({
  tasks,
  onStatusChange,
  onDelete,
  onCardClick,
  selectedTaskId,
  groomingTaskIds,
  failedTaskIds
}: DumpyardGridProps): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      <div className="grid grid-cols-2 gap-3 auto-rows-min xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {tasks.map((task, i) => (
            <DumpCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onClick={onCardClick}
              isSelected={selectedTaskId === task.id}
              isGrooming={groomingTaskIds.has(task.id)}
              isGroomFailed={failedTaskIds.has(task.id)}
              animationDelay={i * 0.03}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default DumpyardGrid
