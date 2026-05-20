/**
 * TaskGroomerView — Main plugin view for the Task Groomer.
 *
 * Replaces the Phase 14 placeholder. Implements the full Dumpyard View:
 *  - Slim toolbar: PageHeader with "Task Groomer" title + Groom button (live with spinner)
 *  - Two tabs: "Dumpyard" (dump status tasks) + "Groomed" (all others)
 *  - Tab labels show task counts when non-zero
 *  - Compact TaskCard rows sorted newest-first, with shimmer during grooming
 *  - Empty states with context-appropriate messaging
 *  - TaskSidePanel slides in from right on card click
 *  - Failure summary toast via sonner after each grooming run
 *
 * Default-exported for React.lazy() in plugin registry.ts (unchanged from Phase 14).
 */
import { useEffect, useRef, useState } from 'react'
import { CheckSquare, Sparkles, Inbox, Loader2, AlertCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useTaskGroomerStore } from '@renderer/stores/task-groomer-store'
import { PageHeader } from '../../components/shared/page-header'
import { pageTransition } from '@renderer/lib/motion'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { cn } from '@renderer/lib/utils'
import TaskCard from './TaskCard'
import TaskSidePanel from './TaskSidePanel'
import GroomDigest from './GroomDigest'

export default function TaskGroomerView(): React.JSX.Element {
  const tasks = useTaskGroomerStore((s) => s.tasks)
  const loading = useTaskGroomerStore((s) => s.loading)
  const activeTab = useTaskGroomerStore((s) => s.activeTab)
  const selectedTaskId = useTaskGroomerStore((s) => s.selectedTaskId)
  const loadTasks = useTaskGroomerStore((s) => s.loadTasks)
  const updateTaskStatus = useTaskGroomerStore((s) => s.updateTaskStatus)
  const setActiveTab = useTaskGroomerStore((s) => s.setActiveTab)
  const setSelectedTaskId = useTaskGroomerStore((s) => s.setSelectedTaskId)

  // Digest state
  const showDigest = useTaskGroomerStore((s) => s.showDigest)
  const dismissDigest = useTaskGroomerStore((s) => s.dismissDigest)

  // Grooming state
  const groomingActive = useTaskGroomerStore((s) => s.groomingActive)
  const groomCount = useTaskGroomerStore((s) => s.groomCount)
  const groomingTaskIds = useTaskGroomerStore((s) => s.groomingTaskIds)
  const startGroom = useTaskGroomerStore((s) => s.startGroom)
  const initGroomListeners = useTaskGroomerStore((s) => s.initGroomListeners)
  const cleanupGroomListeners = useTaskGroomerStore((s) => s.cleanupGroomListeners)
  const lastGroomSummary = useTaskGroomerStore((s) => s.lastGroomSummary)
  const failedTaskIds = useTaskGroomerStore((s) => s.failedTaskIds)

  // Failure banner local state
  const [failureBannerDismissed, setFailureBannerDismissed] = useState(false)

  // Load tasks on mount
  useEffect(() => {
    loadTasks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Init/cleanup groom IPC listeners on mount/unmount
  useEffect(() => {
    initGroomListeners()
    return () => cleanupGroomListeners()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Show failure toast when lastGroomSummary changes; also reset banner dismissed state
  const prevSummaryRef = useRef(lastGroomSummary)
  useEffect(() => {
    if (lastGroomSummary && lastGroomSummary !== prevSummaryRef.current) {
      prevSummaryRef.current = lastGroomSummary
      setFailureBannerDismissed(false)
      const { succeeded, failed, total } = lastGroomSummary
      if (failed === 0) {
        toast.success(`All ${total} tasks groomed.`)
      } else {
        toast.warning(
          `Groomed ${succeeded}/${total} tasks. ${failed} failed — they'll retry on next run.`
        )
      }
    }
  }, [lastGroomSummary])

  // Reset failure banner dismissed state when a new groom run starts
  useEffect(() => {
    if (groomingActive) {
      setFailureBannerDismissed(false)
    }
  }, [groomingActive])

  // Failure banner display condition
  const showFailureBanner =
    lastGroomSummary !== null &&
    lastGroomSummary.failed > 0 &&
    !failureBannerDismissed &&
    !groomingActive

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
            disabled={groomingActive || dumpTasks.length === 0}
            onClick={startGroom}
            title={
              dumpTasks.length === 0
                ? 'No Dump tasks to groom'
                : groomingActive
                  ? `Grooming ${groomCount} tasks...`
                  : 'Groom all Dump tasks with AI'
            }
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              groomingActive
                ? 'bg-primary/20 border-primary/30 text-primary cursor-not-allowed'
                : dumpTasks.length === 0
                  ? 'bg-white/4 border-white/8 text-muted-foreground opacity-60 cursor-not-allowed'
                  : 'bg-primary border-primary/80 text-primary-foreground hover:bg-primary/90 cursor-pointer'
            )}
          >
            {groomingActive ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Grooming {groomCount} tasks...
              </>
            ) : (
              <>
                <Sparkles size={12} />
                Groom
              </>
            )}
          </button>
        }
      />

      {/* Failure banner — persistent after a batch groom run with failures */}
      {showFailureBanner && (
        <div className="flex items-center gap-3 mx-3 my-1.5 px-3 py-2 rounded-lg border border-amber-400/20 bg-amber-400/8 text-xs">
          <AlertCircle size={13} className="text-amber-400 shrink-0" />
          <span className="flex-1 text-amber-200/80">
            {lastGroomSummary!.failed} task{lastGroomSummary!.failed !== 1 ? 's' : ''} failed to
            groom
          </span>
          <button
            type="button"
            onClick={startGroom}
            disabled={groomingActive || dumpTasks.length === 0}
            className="text-amber-400 hover:text-amber-300 font-medium transition-colors disabled:opacity-50"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => setFailureBannerDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss failure banner"
          >
            <X size={12} />
          </button>
        </div>
      )}

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
            {!loading &&
              visibleTasks.length === 0 &&
              (activeTab === 'dumpyard' ? (
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
              ))}

            {/* Task list */}
            {!loading && visibleTasks.length > 0 && (
              <div className="flex flex-col flex-1 overflow-y-auto px-3 py-2 gap-0.5">
                {visibleTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTaskId === task.id}
                    isGrooming={groomingTaskIds.has(task.id)}
                    isGroomFailed={failedTaskIds.has(task.id)}
                    onStatusChange={updateTaskStatus}
                    onClick={(t) => {
                      if (showDigest) dismissDigest()
                      setSelectedTaskId(t.id === selectedTaskId ? null : t.id)
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right-side panel slot: digest after batch groom, or task detail panel */}
      {/* Digest takes priority: slides in after batch run; dismisses to reveal TaskSidePanel */}
      <GroomDigest
        open={showDigest}
        onClose={dismissDigest}
        onTaskClick={(taskId) => {
          dismissDigest()
          setSelectedTaskId(taskId)
        }}
      />

      {/* TaskSidePanel: only when digest is not showing */}
      <TaskSidePanel
        task={selectedTask}
        open={selectedTaskId !== null && !showDigest}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}
