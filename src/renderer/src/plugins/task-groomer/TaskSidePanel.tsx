/**
 * TaskSidePanel — Slide-in right panel showing full task detail.
 *
 * Opens when a TaskCard is clicked. Shows complete task text (not truncated),
 * status controls, metadata (created/updated/source/stale), and grooming data
 * when present (Priority, suggested action, evidence summary, Jira link).
 *
 * When grooming data is absent (Phase 16), a placeholder message is shown.
 * Grooming data will be populated in Phase 18.
 */
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'
import { useTaskGroomerStore, isTaskStale } from '@renderer/stores/task-groomer-store'
import StatusDropdown from './StatusDropdown'
import { cn } from '@renderer/lib/utils'

// ---------------------------------------------------------------------------
// Date formatter (local utility)
// ---------------------------------------------------------------------------

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// ---------------------------------------------------------------------------
// Priority label config
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG: Record<NonNullable<Task['priority']>, { label: string; className: string }> = {
  p1: { label: 'P1 — High Priority', className: 'text-red-400 bg-red-400/15 border-red-400/20' },
  p2: { label: 'P2 — Medium Priority', className: 'text-amber-400 bg-amber-400/15 border-amber-400/20' },
  p3: { label: 'P3 — Low Priority', className: 'text-blue-400 bg-blue-400/15 border-blue-400/20' }
}

// ---------------------------------------------------------------------------
// Metadata row component
// ---------------------------------------------------------------------------

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <dt className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-xs text-foreground flex-1">{children}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TaskSidePanelProps {
  task: Task | null
  open: boolean
  onClose: () => void
}

export function TaskSidePanel({ task, open, onClose }: TaskSidePanelProps): React.JSX.Element {
  const updateTaskStatus = useTaskGroomerStore((s) => s.updateTaskStatus)

  const stale = task ? isTaskStale(task) : false
  const hasGroomingData = task
    ? task.priority !== null || task.suggestedAction !== null || task.evidenceSummary !== null
    : false

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[420px] sm:w-[480px] overflow-y-auto flex flex-col gap-0 p-0"
      >
        {task && (
          <div className="flex flex-col gap-4 p-6 pt-10">
            {/* Task text header */}
            <SheetHeader>
              <SheetTitle className="text-base font-medium leading-snug text-left break-words">
                {task.text}
              </SheetTitle>
            </SheetHeader>

            {/* Status control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <StatusDropdown task={task} onStatusChange={updateTaskStatus} />
            </div>

            {/* Divider */}
            <div className="h-px bg-white/6" />

            {/* Metadata */}
            <dl className="divide-y divide-white/4">
              <MetaRow label="Created">{formatDateTime(task.createdAt)}</MetaRow>
              <MetaRow label="Updated">{formatDateTime(task.updatedAt)}</MetaRow>
              <MetaRow label="Source">
                <span className="capitalize">{task.captureSource}</span>
              </MetaRow>
              <MetaRow label="Stale">
                {stale ? (
                  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-400/15 border border-amber-400/20 text-amber-400">
                    Yes — stale in Dump
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </MetaRow>
            </dl>

            {/* Divider */}
            <div className="h-px bg-white/6" />

            {/* Grooming section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Grooming Results
              </h3>

              {!hasGroomingData ? (
                <p className="text-xs text-muted-foreground italic">
                  Grooming data will appear here after the agent runs.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Priority */}
                  {task.priority && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">Priority</span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border',
                          PRIORITY_CONFIG[task.priority].className
                        )}
                      >
                        {PRIORITY_CONFIG[task.priority].label}
                      </span>
                    </div>
                  )}

                  {/* Suggested action */}
                  {task.suggestedAction && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">Action</span>
                      <span className="text-xs text-foreground capitalize">{task.suggestedAction}</span>
                    </div>
                  )}

                  {/* Evidence summary */}
                  {task.evidenceSummary && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Evidence</span>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {task.evidenceSummary}
                      </p>
                    </div>
                  )}

                  {/* Research summary */}
                  {task.researchSummary && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Research</span>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {task.researchSummary}
                      </p>
                    </div>
                  )}

                  {/* Jira ticket */}
                  {task.jiraTicketKey && task.jiraTicketUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">Jira</span>
                      <a
                        href={task.jiraTicketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {task.jiraTicketKey}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default TaskSidePanel
