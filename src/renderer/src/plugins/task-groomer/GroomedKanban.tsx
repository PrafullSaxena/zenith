/**
 * GroomedKanban — Kanban board with full-card drag-and-drop via @dnd-kit/core.
 *
 * Key design decisions:
 * - Drag listeners on the ENTIRE card (not a handle) so user can grab from anywhere
 * - framer-motion used ONLY for add/exit animations — NOT for layout/position
 *   (framer layout prop conflicts with @dnd-kit's CSS transform)
 * - CSS.Translate applied via inline style for the drag transform
 * - DragOverlay renders a static ghost card following the cursor
 */
import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCheck, ArrowRight, Users, XCircle, Trash2, Zap } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { isTaskStale } from '@renderer/stores/task-groomer-store'
import StatusDropdown from './StatusDropdown'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type KanbanStatus = 'groomed' | 'working' | 'done' | 'delegated' | 'aborted'

const COLUMNS: {
  id: KanbanStatus
  label: string
  icon: React.ElementType
  accent: string
  headerBg: string
  overBg: string
  countBg: string
}[] = [
  {
    id: 'groomed',
    label: 'Active',
    icon: ArrowRight,
    accent: 'border-violet-400/30',
    headerBg: 'bg-violet-400/8',
    overBg: 'bg-violet-400/15 border-violet-400/40',
    countBg: 'bg-violet-400/15 text-violet-400'
  },
  {
    id: 'working',
    label: 'Working',
    icon: Zap,
    accent: 'border-sky-400/30',
    headerBg: 'bg-sky-400/8',
    overBg: 'bg-sky-400/15 border-sky-400/40',
    countBg: 'bg-sky-400/15 text-sky-400'
  },
  {
    id: 'done',
    label: 'Done',
    icon: CheckCheck,
    accent: 'border-emerald-400/30',
    headerBg: 'bg-emerald-400/8',
    overBg: 'bg-emerald-400/15 border-emerald-400/40',
    countBg: 'bg-emerald-400/15 text-emerald-400'
  },
  {
    id: 'delegated',
    label: 'Delegated',
    icon: Users,
    accent: 'border-amber-400/30',
    headerBg: 'bg-amber-400/8',
    overBg: 'bg-amber-400/15 border-amber-400/40',
    countBg: 'bg-amber-400/15 text-amber-400'
  },
  {
    id: 'aborted',
    label: 'Aborted',
    icon: XCircle,
    accent: 'border-red-400/30',
    headerBg: 'bg-red-400/8',
    overBg: 'bg-red-400/15 border-red-400/40',
    countBg: 'bg-red-400/15 text-red-400'
  }
]

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  p1: { label: 'P1', cls: 'bg-red-400/15 text-red-400 border-red-400/25' },
  p2: { label: 'P2', cls: 'bg-amber-400/15 text-amber-400 border-amber-400/25' },
  p3: { label: 'P3', cls: 'bg-blue-400/15 text-blue-400 border-blue-400/25' }
}

const ACTION_CONFIG: Record<string, string> = {
  do: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  delegate: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  defer: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
  delete: 'bg-rose-400/10 text-rose-400 border-rose-400/20'
}

function reltime(ms: number): string {
  const d = Date.now() - ms,
    m = Math.floor(d / 6e4)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(d / 36e5)
  if (h < 24) return `${h}h`
  const dy = Math.floor(d / 864e5)
  if (dy < 30) return `${dy}d`
  return `${Math.floor(d / (30 * 864e5))}mo`
}

// ---------------------------------------------------------------------------
// Card content (pure visual — used in both real card and overlay)
// ---------------------------------------------------------------------------

function CardContent({
  task,
  onStatusChange,
  onDelete,
  hovered,
  showDropdown = true
}: {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete?: (id: string) => void
  hovered: boolean
  showDropdown?: boolean
}) {
  const stale = isTaskStale(task)
  const pc = task.priority ? PRIORITY_CONFIG[task.priority] : null
  const ac = task.suggestedAction ? ACTION_CONFIG[task.suggestedAction] : null

  return (
    <>
      {/* Chips + time + delete */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1 flex-wrap">
          {pc && (
            <span
              className={cn('text-[10px] font-semibold border rounded-full px-1.5 py-0.5', pc.cls)}
            >
              {pc.label}
            </span>
          )}
          {ac && task.suggestedAction && (
            <span
              className={cn(
                'text-[10px] font-medium border rounded-full px-1.5 py-0.5 capitalize',
                ac
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
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground/45">{reltime(task.createdAt)}</span>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              style={{
                opacity: hovered ? 1 : 0,
                transform: hovered ? 'scale(1)' : 'scale(0.7)',
                transition: 'opacity 0.12s, transform 0.12s'
              }}
              className="w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
              aria-label="Delete task"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Task text */}
      <p className="text-[13px] text-foreground/90 leading-snug line-clamp-3 mb-3">{task.text}</p>

      {/* Status dropdown */}
      {showDropdown && (
        <div onClick={(e) => e.stopPropagation()}>
          <StatusDropdown task={task} onStatusChange={onStatusChange} />
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Draggable card — listeners on the ENTIRE card so user can grab from anywhere
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

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { currentStatus: task.status }
  })

  return (
    // motion.div handles only add/exit animation — NO layout prop to avoid transform conflict
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.14 }}
    >
      <div
        ref={setNodeRef}
        // Drag transform applied as inline style — framer-motion doesn't touch position
        style={{ transform: CSS.Translate.toString(transform) }}
        // Spread drag listeners on the whole card
        {...listeners}
        {...attributes}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (!isDragging) onClick(task)
          else e.preventDefault()
        }}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isDragging && onClick(task)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative group rounded-xl border p-3 select-none transition-colors duration-150',
          // Show grab cursor when hovering, grabbing when actively dragging
          isDragging ? 'cursor-grabbing opacity-40' : 'cursor-grab',
          isSelected
            ? 'border-primary/30 bg-primary/8 shadow-md'
            : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/12',
          stale && 'border-amber-400/20'
        )}
      >
        <CardContent
          task={task}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          hovered={hovered && !isDragging}
        />
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Droppable column
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
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const Icon = column.icon

  return (
    <div className="flex flex-col min-w-[220px] flex-1 max-w-[320px]">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-2 transition-all duration-200',
          isOver ? column.overBg : `${column.accent} ${column.headerBg}`
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

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 flex-1 overflow-y-auto rounded-xl min-h-[80px] pb-2 transition-all duration-200',
          isOver && 'bg-white/[0.025] ring-1 ring-white/10'
        )}
      >
        <AnimatePresence initial={false}>
          {tasks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex items-center justify-center py-10 rounded-xl border border-dashed transition-colors duration-200',
                isOver
                  ? 'border-white/25 bg-white/[0.03] text-foreground/40'
                  : 'border-white/8 text-muted-foreground/35'
              )}
            >
              <span className="text-[11px]">{isOver ? '↓ Drop here' : 'No tasks'}</span>
            </motion.div>
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
  tasks: Task[]
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
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const draggingTask = draggingId ? (tasks.find((t) => t.id === draggingId) ?? null) : null

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 8px threshold: deliberate drag, not a click
      activationConstraint: { distance: 8 }
    })
  )

  function onDragStart({ active }: DragStartEvent) {
    setDraggingId(active.id as string)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null)
    if (!over) return
    const taskId = active.id as string
    const targetStatus = over.id as KanbanStatus
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === targetStatus) return
    const valid: KanbanStatus[] = ['groomed', 'working', 'done', 'delegated', 'aborted']
    if (valid.includes(targetStatus)) onStatusChange(taskId, targetStatus)
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 h-full overflow-x-auto px-3 py-2 pb-3">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.status === col.id)}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onCardClick={onCardClick}
            selectedTaskId={selectedTaskId}
          />
        ))}
      </div>

      {/* Floating ghost card while dragging */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
        {draggingTask && (
          <div className="rounded-xl border border-white/20 p-3 bg-card/95 shadow-2xl backdrop-blur-xl opacity-95 rotate-1 scale-105 w-[220px]">
            <CardContent
              task={draggingTask}
              onStatusChange={onStatusChange}
              hovered={false}
              showDropdown={false}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

export default GroomedKanban
