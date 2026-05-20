/**
 * GroomedKanban — Kanban board for Groomed tasks with drag-and-drop.
 *
 * Uses @dnd-kit/core for accessible, performant DnD.
 * Dragging a card between columns calls onStatusChange immediately.
 * A semi-transparent DragOverlay follows the cursor while dragging.
 *
 * Four columns: Active (groomed) → Done → Delegated → Aborted
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
import { CheckCheck, ArrowRight, Users, XCircle, Trash2, GripVertical } from 'lucide-react'
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
  overBg: string
  countBg: string
}[] = [
  {
    id: 'groomed',
    label: 'Active',
    icon: ArrowRight,
    accent: 'border-violet-400/30',
    headerBg: 'bg-violet-400/8',
    overBg: 'bg-violet-400/12 border-violet-400/40',
    countBg: 'bg-violet-400/15 text-violet-400'
  },
  {
    id: 'done',
    label: 'Done',
    icon: CheckCheck,
    accent: 'border-emerald-400/30',
    headerBg: 'bg-emerald-400/8',
    overBg: 'bg-emerald-400/12 border-emerald-400/40',
    countBg: 'bg-emerald-400/15 text-emerald-400'
  },
  {
    id: 'delegated',
    label: 'Delegated',
    icon: Users,
    accent: 'border-amber-400/30',
    headerBg: 'bg-amber-400/8',
    overBg: 'bg-amber-400/12 border-amber-400/40',
    countBg: 'bg-amber-400/15 text-amber-400'
  },
  {
    id: 'aborted',
    label: 'Aborted',
    icon: XCircle,
    accent: 'border-red-400/30',
    headerBg: 'bg-red-400/8',
    overBg: 'bg-red-400/12 border-red-400/40',
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
// Kanban card (draggable)
// ---------------------------------------------------------------------------

interface KanbanCardProps {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete?: (id: string) => void
  onClick: (task: Task) => void
  isSelected: boolean
  isDragging?: boolean
  isOverlay?: boolean
}

function KanbanCard({
  task,
  onStatusChange,
  onDelete,
  onClick,
  isSelected,
  isDragging = false,
  isOverlay = false
}: KanbanCardProps) {
  const [hovered, setHovered] = useState(false)
  const stale = isTaskStale(task)
  const priorityCfg = task.priority ? PRIORITY_CONFIG[task.priority] : null
  const actionClass = task.suggestedAction ? ACTION_CONFIG[task.suggestedAction] : null

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { taskId: task.id, currentStatus: task.status },
    disabled: isOverlay
  })

  const style = isOverlay
    ? undefined
    : { transform: CSS.Translate.toString(transform) }

  return (
    <motion.div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      layout={!isOverlay}
      initial={{ opacity: 0, scale: 0.96, y: -6 }}
      animate={{ opacity: isDragging ? 0.35 : 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={{ duration: 0.16 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(isOverlay && 'rotate-2 scale-105')}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => !isDragging && onClick(task)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isDragging && onClick(task)}
        className={cn(
          'relative group rounded-xl border p-3 cursor-pointer transition-all duration-150 select-none',
          isSelected && !isOverlay
            ? 'border-primary/30 bg-primary/8 shadow-md'
            : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/12',
          stale && 'border-amber-400/20',
          isOverlay && 'shadow-2xl border-white/20 bg-card/90 backdrop-blur-md'
        )}
      >
        {/* Drag handle */}
        <div
          {...(isOverlay ? {} : { ...attributes, ...listeners })}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors touch-none"
          aria-label="Drag to move"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={13} />
        </div>

        {/* Card body — offset for drag handle */}
        <div className="pl-3">
          {/* Top row: priority + time + delete */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {priorityCfg && (
                <span className={cn('text-[10px] font-semibold border rounded-full px-1.5 py-0.5', priorityCfg.className)}>
                  {priorityCfg.label}
                </span>
              )}
              {actionClass && task.suggestedAction && (
                <span className={cn('text-[10px] font-medium border rounded-full px-1.5 py-0.5 capitalize', actionClass)}>
                  {task.suggestedAction}
                </span>
              )}
              {stale && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/12 border border-amber-400/20 text-amber-400">
                  Stale
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <span className="text-[10px] text-muted-foreground/50">{formatRelativeTime(task.createdAt)}</span>
              {onDelete && !isOverlay && (
                <motion.button
                  type="button"
                  animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.7 }}
                  transition={{ duration: 0.12 }}
                  onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
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

          {/* Status dropdown */}
          {!isOverlay && (
            <div onClick={(e) => e.stopPropagation()}>
              <StatusDropdown task={task} onStatusChange={onStatusChange} />
            </div>
          )}
        </div>
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
  selectedTaskId,
  draggingTaskId
}: {
  column: (typeof COLUMNS)[0]
  tasks: Task[]
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete?: (id: string) => void
  onCardClick: (task: Task) => void
  selectedTaskId: string | null
  draggingTaskId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const Icon = column.icon

  return (
    <div className="flex flex-col min-w-[220px] flex-1 max-w-[320px]">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-2 transition-all duration-150',
          isOver ? column.overBg : `${column.accent} ${column.headerBg}`
        )}
      >
        <Icon size={13} className="text-muted-foreground shrink-0" />
        <span className="text-[11px] font-semibold text-foreground/80 flex-1">{column.label}</span>
        <span className={cn('text-[10px] font-semibold rounded-full px-1.5 py-0.5', column.countBg)}>
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 flex-1 overflow-y-auto pr-0.5 rounded-xl transition-all duration-150',
          'min-h-[80px] pb-2',
          isOver && 'bg-white/[0.02] ring-1 ring-white/8'
        )}
      >
        <AnimatePresence initial={false}>
          {tasks.length === 0 ? (
            <div className={cn(
              'flex items-center justify-center py-8 rounded-xl border border-dashed transition-colors duration-150',
              isOver ? 'border-white/20 bg-white/[0.03]' : 'border-white/8'
            )}>
              <span className="text-[11px] text-muted-foreground/40">
                {isOver ? 'Drop here' : 'No tasks'}
              </span>
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
                isDragging={draggingTaskId === task.id}
              />
            ))
          )}
        </AnimatePresence>

        {/* Drop hint when dragging over non-empty column */}
        {isOver && tasks.length > 0 && (
          <div className="h-1 rounded-full bg-primary/30 mx-1 animate-pulse" />
        )}
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
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const draggingTask = draggingTaskId ? tasks.find((t) => t.id === draggingTaskId) ?? null : null

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 6px movement before drag starts — prevents accidental drags on click
      activationConstraint: { distance: 6 }
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setDraggingTaskId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingTaskId(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const targetStatus = over.id as KanbanStatus

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === targetStatus) return

    // Only allow dropping on valid column IDs
    const validStatuses = COLUMNS.map((c) => c.id)
    if (!validStatuses.includes(targetStatus)) return

    onStatusChange(taskId, targetStatus)
  }

  const byStatus = (status: KanbanStatus) => tasks.filter((t) => t.status === status)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
            draggingTaskId={draggingTaskId}
          />
        ))}
      </div>

      {/* Floating drag overlay — rendered outside columns to avoid clipping */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {draggingTask && (
          <KanbanCard
            task={draggingTask}
            onStatusChange={onStatusChange}
            onClick={() => {}}
            isSelected={false}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

export default GroomedKanban
