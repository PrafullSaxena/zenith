/**
 * TaskGroomerView — Main plugin view for the Task Groomer.
 *
 * Replaces the Phase 14 placeholder. Implements the full Dumpyard View:
 *  - Slim toolbar: PageHeader with "Task Groomer" title + Groom button (disabled placeholder)
 *  - Two tabs: "Dumpyard" (dump status tasks) + "Groomed" (all others)
 *  - Tab labels show task counts when non-zero
 *  - Compact TaskCard rows sorted newest-first
 *  - Empty states with context-appropriate messaging
 *  - TaskSidePanel slides in from right on card click
 *
 * Default-exported for React.lazy() in plugin registry.ts (unchanged from Phase 14).
 */
import { useEffect } from 'react'
import { CheckSquare, Sparkles, Inbox } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTaskGroomerStore } from '@renderer/stores/task-groomer-store'
import { PageHeader } from '../../components/shared/page-header'
import { pageTransition } from '@renderer/lib/motion'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import TaskCard from './TaskCard'
import TaskSidePanel from './TaskSidePanel'

export default function TaskGroomerView(): React.JSX.Element {
  const tasks = useTaskGroomerStore((s) => s.tasks)
  const loading = useTaskGroomerStore((s) => s.loading)
  const activeTab = useTaskGroomerStore((s) => s.activeTab)
  const selectedTaskId = useTaskGroomerStore((s) => s.selectedTaskId)
  const loadTasks = useTaskGroomerStore((s) => s.loadTasks)
  const updateTaskStatus = useTaskGroomerStore((s) => s.updateTaskStatus)
  const setActiveTab = useTaskGroomerStore((s) => s.setActiveTab)
  const setSelectedTaskId = useTaskGroomerStore((s) => s.setSelectedTaskId)

  // Load tasks on mount
  useEffect(() => {
    loadTasks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive task lists inline (not stored in Zustand — pure filter)
  const dumpTasks = tasks.filter((t) => t.status === 'dump')
  const groomedTasks = tasks.filter((t) => t.status !== 'dump')
  const visibleTasks = activeTab === 'dumpyard' ? dumpTasks : groomedTasks

  // Selected task for side panel
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null

  // Tab definitions with count badges
  const TABS = [
    {
      id: 'dumpyard',
      label: dumpTasks.length > 0 ? `Dumpyard (${dumpTasks.length})` : 'Dumpyard'
    },
    {
      id: 'groomed',
      label: groomedTasks.length > 0 ? `Groomed (${groomedTasks.length})` : 'Groomed'
    }
  ]

  return (
    <div className="relative flex h-full flex-col">
      {/* Subtle dot grid background */}
      <div className="pointer-events-none absolute inset-0 z-0 dark:bg-[radial-gradient(#ffffff22_1px,transparent_1px)] bg-[radial-gradient(#00000015_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Toolbar: title + tabs + Groom button */}
      <PageHeader
        icon={CheckSquare}
        title="Task Groomer"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'dumpyard' | 'groomed')}
        statusIndicator={
          <button
            type="button"
            disabled
            title="Grooming coming in Phase 18"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/4 border border-white/8 text-muted-foreground opacity-60 cursor-not-allowed"
          >
            <Sparkles size={12} />
            Groom
          </button>
        }
      />

      {/* Tab content */}
      <div className="relative flex-1 overflow-hidden z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex h-full flex-col overflow-hidden"
          >
            {/* Loading state */}
            {loading && (
              <div className="flex flex-1 items-center justify-center">
                <span className="text-sm text-muted-foreground">Loading tasks...</span>
              </div>
            )}

            {/* Empty state */}
            {!loading && visibleTasks.length === 0 && (
              activeTab === 'dumpyard' ? (
                <EmptyState
                  icon={Inbox}
                  title="Your dumpyard is clear"
                  description="Press ⌘⇧D to capture your first task."
                />
              ) : (
                <EmptyState
                  icon={CheckSquare}
                  title="No groomed tasks yet"
                  description="Tasks will appear here after grooming. Use the Groom button above to start."
                />
              )
            )}

            {/* Task list */}
            {!loading && visibleTasks.length > 0 && (
              <div className="flex flex-col flex-1 overflow-y-auto px-3 py-2 gap-0.5">
                {visibleTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTaskId === task.id}
                    onStatusChange={updateTaskStatus}
                    onClick={(t) =>
                      setSelectedTaskId(t.id === selectedTaskId ? null : t.id)
                    }
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Side panel — overlays from right */}
      <TaskSidePanel
        task={selectedTask}
        open={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}
