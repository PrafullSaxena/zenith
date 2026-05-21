/**
 * TaskGroomerView — Revamped Task Groomer plugin view.
 *
 * Dumpyard tab: compact list with hover-delete + side panel.
 * Groomed tab: toggleable List / Kanban views with status-based columns.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  FolderOpen,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  LayoutList,
  LayoutGrid,
  ArchiveX,
  CheckSquare,
  RefreshCw,
  Search
} from 'lucide-react'
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
import { GroomedKanban } from './GroomedKanban'
import { DumpyardGrid } from './DumpyardGrid'

export default function TaskGroomerView(): React.JSX.Element {
  const tasks = useTaskGroomerStore((s) => s.tasks)
  const loading = useTaskGroomerStore((s) => s.loading)
  const activeTab = useTaskGroomerStore((s) => s.activeTab)
  const selectedTaskId = useTaskGroomerStore((s) => s.selectedTaskId)
  const loadTasks = useTaskGroomerStore((s) => s.loadTasks)
  const updateTaskStatus = useTaskGroomerStore((s) => s.updateTaskStatus)
  const deleteTask = useTaskGroomerStore((s) => s.deleteTask)
  const setActiveTab = useTaskGroomerStore((s) => s.setActiveTab)
  const setSelectedTaskId = useTaskGroomerStore((s) => s.setSelectedTaskId)

  const showDigest = useTaskGroomerStore((s) => s.showDigest)
  const dismissDigest = useTaskGroomerStore((s) => s.dismissDigest)

  const groomingActive = useTaskGroomerStore((s) => s.groomingActive)
  const groomCount = useTaskGroomerStore((s) => s.groomCount)
  const groomStage = useTaskGroomerStore((s) => s.groomStage)
  const groomingTaskIds = useTaskGroomerStore((s) => s.groomingTaskIds)
  const startGroom = useTaskGroomerStore((s) => s.startGroom)
  const initGroomListeners = useTaskGroomerStore((s) => s.initGroomListeners)
  const cleanupGroomListeners = useTaskGroomerStore((s) => s.cleanupGroomListeners)
  const lastGroomSummary = useTaskGroomerStore((s) => s.lastGroomSummary)
  const failedTaskIds = useTaskGroomerStore((s) => s.failedTaskIds)

  // Search state — fuzzy filters both tabs
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = React.useRef<HTMLInputElement>(null)

  // Groomed view mode — persisted in localStorage so it survives navigation away and back
  const [groomedViewMode, setGroomedViewMode] = useState<'list' | 'kanban'>(
    () => (localStorage.getItem('intake:groomedViewMode') as 'list' | 'kanban' | null) ?? 'list'
  )
  const [failureBannerDismissed, setFailureBannerDismissed] = useState(false)

  useEffect(() => {
    loadTasks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initGroomListeners()
    return () => cleanupGroomListeners()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    if (groomingActive) setFailureBannerDismissed(false)
  }, [groomingActive])

  const showFailureBanner =
    lastGroomSummary !== null &&
    lastGroomSummary.failed > 0 &&
    !failureBannerDismissed &&
    !groomingActive

  // Fuzzy match: every character in query must appear in order in the text
  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true
    const t = text.toLowerCase()
    const q = query.toLowerCase()
    let qi = 0
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++
    }
    return qi === q.length
  }

  const dumpTasks = tasks.filter((t) => t.status === 'dump')
  const groomedTasks = tasks.filter((t) => t.status !== 'dump')

  // Apply search filter
  const filteredDump = dumpTasks.filter((t) => fuzzyMatch(t.text, searchQuery))
  const filteredGroomed = groomedTasks.filter((t) => fuzzyMatch(t.text, searchQuery))
  const visibleTasks = activeTab === 'dumpyard' ? filteredDump : filteredGroomed
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null

  const dumpLabel = searchQuery
    ? `Dumpyard (${filteredDump.length}/${dumpTasks.length})`
    : dumpTasks.length > 0 ? `Dumpyard (${dumpTasks.length})` : 'Dumpyard'
  const groomedLabel = searchQuery
    ? `Groomed (${filteredGroomed.length}/${groomedTasks.length})`
    : groomedTasks.length > 0 ? `Groomed (${groomedTasks.length})` : 'Groomed'

  const TABS = [
    { id: 'dumpyard', label: dumpLabel },
    { id: 'groomed', label: groomedLabel }
  ]

  const isKanban = activeTab === 'groomed' && groomedViewMode === 'kanban'

  return (
    <div className="relative flex h-full flex-col">
      {/* Subtle dot grid */}
      <div className="pointer-events-none absolute inset-0 z-0 dark:bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Toolbar */}
      <PageHeader
        icon={FolderOpen}
        title="InTake"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'dumpyard' | 'groomed')}
        statusIndicator={
          <div className="flex items-center gap-2">
            {/* Reload button */}
            <button
              type="button"
              onClick={loadTasks}
              disabled={loading}
              title="Reload tasks"
              aria-label="Reload tasks"
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg border border-white/8 bg-white/[0.03] transition-colors',
                loading
                  ? 'text-muted-foreground opacity-50 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/8 cursor-pointer'
              )}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Kanban/List toggle — only on Groomed tab */}
            {activeTab === 'groomed' && (
              <div className="flex items-center rounded-lg border border-white/8 bg-white/[0.03] p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setGroomedViewMode('list')
                    localStorage.setItem('intake:groomedViewMode', 'list')
                  }}
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-md transition-colors',
                    groomedViewMode === 'list'
                      ? 'bg-white/10 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="List view"
                  aria-label="List view"
                >
                  <LayoutList size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGroomedViewMode('kanban')
                    localStorage.setItem('intake:groomedViewMode', 'kanban')
                  }}
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-md transition-colors',
                    groomedViewMode === 'kanban'
                      ? 'bg-white/10 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Kanban view"
                  aria-label="Kanban view"
                >
                  <LayoutGrid size={12} />
                </button>
              </div>
            )}

            {/* Groom button */}
            <button
              type="button"
              disabled={groomingActive || dumpTasks.length === 0}
              onClick={startGroom}
              title={
                dumpTasks.length === 0
                  ? 'No Dump tasks to groom'
                  : groomingActive
                    ? groomStage
                      ? `${groomStage.charAt(0).toUpperCase() + groomStage.slice(1)}...`
                      : `Grooming ${groomCount} tasks...`
                    : 'Groom all Dump tasks with AI'
              }
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                groomingActive
                  ? 'bg-primary/20 border-primary/30 text-primary cursor-not-allowed'
                  : dumpTasks.length === 0
                    ? 'bg-white/4 border-white/8 text-muted-foreground opacity-50 cursor-not-allowed'
                    : 'bg-primary border-primary/80 text-primary-foreground hover:bg-primary/90 cursor-pointer'
              )}
            >
              {groomingActive ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  {groomStage === 'analyzing'
                    ? 'Analyzing tasks...'
                    : groomStage === 'querying'
                      ? 'Querying sources...'
                      : groomStage === 'summarizing'
                        ? 'Summarizing...'
                        : `Grooming ${groomCount}...`}
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Groom
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Search bar */}
      <div className="relative z-10 mx-3 mt-2 mb-1">
        <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 h-8 transition-colors focus-within:border-white/16 focus-within:bg-white/[0.05]">
          <Search size={12} className="text-muted-foreground/50 shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('')
                searchRef.current?.blur()
              }
            }}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Failure banner */}
      <AnimatePresence>
        {showFailureBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 mx-3 my-1.5 px-3 py-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] text-xs">
              <AlertCircle size={13} className="text-amber-400 shrink-0" />
              <span className="flex-1 text-amber-200/80">
                {lastGroomSummary!.failed} task{lastGroomSummary!.failed !== 1 ? 's' : ''} failed
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
                aria-label="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <div className="relative flex-1 overflow-hidden z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${isKanban ? 'kanban' : 'list'}`}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex h-full flex-col overflow-hidden"
          >
            {/* Loading */}
            {loading && (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Loading tasks...
                </div>
              </div>
            )}

            {/* Empty states */}
            {!loading &&
              visibleTasks.length === 0 &&
              (activeTab === 'dumpyard' ? (
                <EmptyState
                  icon={ArchiveX}
                  title="Your dumpyard is clear"
                  description="Press ⌘⇧D to capture your first task."
                />
              ) : (
                <EmptyState
                  icon={CheckSquare}
                  title="No groomed tasks yet"
                  description="Groom your dump tasks to see them here."
                />
              ))}

            {/* DUMPYARD — card grid (dump tasks have no grooming data; cards > list rows) */}
            {!loading && visibleTasks.length > 0 && activeTab === 'dumpyard' && (
              <DumpyardGrid
                tasks={filteredDump}
                onStatusChange={updateTaskStatus}
                onDelete={deleteTask}
                onCardClick={(t) => {
                  if (showDigest) dismissDigest()
                  setSelectedTaskId(t.id === selectedTaskId ? null : t.id)
                }}
                selectedTaskId={selectedTaskId}
                groomingTaskIds={groomingTaskIds}
                failedTaskIds={failedTaskIds}
              />
            )}

            {/* KANBAN VIEW — Groomed tab only */}
            {!loading && visibleTasks.length > 0 && isKanban && (
              <GroomedKanban
                tasks={filteredGroomed}
                onStatusChange={updateTaskStatus}
                onDelete={deleteTask}
                onCardClick={(t) => {
                  if (showDigest) dismissDigest()
                  setSelectedTaskId(t.id === selectedTaskId ? null : t.id)
                }}
                selectedTaskId={selectedTaskId}
              />
            )}

            {/* GROOMED LIST VIEW — compact rows with shimmer + chips */}
            {!loading && visibleTasks.length > 0 && activeTab === 'groomed' && !isKanban && (
              <div className="flex flex-col flex-1 overflow-y-auto px-3 py-2 gap-0.5 relative">
                <AnimatePresence initial={false}>
                  {groomedTasks.map((task, i) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isSelected={selectedTaskId === task.id}
                      isGrooming={groomingTaskIds.has(task.id)}
                      isGroomFailed={failedTaskIds.has(task.id)}
                      animationDelay={i * 0.02}
                      onStatusChange={updateTaskStatus}
                      onDelete={deleteTask}
                      onClick={(t) => {
                        if (showDigest) dismissDigest()
                        setSelectedTaskId(t.id === selectedTaskId ? null : t.id)
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Digest + side panel */}
      <GroomDigest
        open={showDigest}
        onClose={dismissDigest}
        onTaskClick={(taskId) => {
          dismissDigest()
          setSelectedTaskId(taskId)
        }}
      />

      <TaskSidePanel
        task={selectedTask}
        open={selectedTaskId !== null && !showDigest}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}
