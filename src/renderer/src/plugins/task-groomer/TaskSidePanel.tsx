/**
 * TaskSidePanel — Task detail modal (centered Dialog).
 *
 * Replaces the right-side Sheet with a centered modal so task details
 * are shown without consuming horizontal layout space.
 *
 * Content: full task text, status, metadata, grooming results + re-groom.
 */
import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { useTaskGroomerStore, isTaskStale } from '@renderer/stores/task-groomer-store'
import StatusDropdown from './StatusDropdown'
import { cn } from '@renderer/lib/utils'
import {
  Loader2,
  RotateCcw,
  Calendar,
  Clock,
  Tag,
  AlertTriangle,
  Zap,
  FileText,
  Link,
  Bot,
  Ticket,
  Globe,
  MessageSquare,
  Pencil,
  Trash2,
  Send
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
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

const PRIORITY_CONFIG: Record<NonNullable<Task['priority']>, { label: string; badge: string }> = {
  p1: { label: 'P1 — High', badge: 'text-red-400 bg-red-400/15 border-red-400/25' },
  p2: { label: 'P2 — Medium', badge: 'text-amber-400 bg-amber-400/15 border-amber-400/25' },
  p3: { label: 'P3 — Low', badge: 'text-blue-400 bg-blue-400/15 border-blue-400/25' }
}

const ACTION_CONFIG: Record<string, string> = {
  do: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  delegate: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  defer: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  delete: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
}

// ---------------------------------------------------------------------------
// Sources ribbon
// ---------------------------------------------------------------------------

const RIBBON_ICONS = [
  { key: 'ai' as const, label: 'AI', Icon: Bot, color: 'text-violet-400' },
  { key: 'jira' as const, label: 'Jira', Icon: Ticket, color: 'text-blue-400' },
  { key: 'confluence' as const, label: 'Confluence', Icon: FileText, color: 'text-sky-400' },
  { key: 'google' as const, label: 'Google', Icon: Globe, color: 'text-emerald-400' }
]

function SourcesRibbon({
  sourcesUsed
}: {
  sourcesUsed: ('ai' | 'jira' | 'confluence' | 'google')[] | null
}) {
  const used = new Set(sourcesUsed ?? [])
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-white/6 bg-white/[0.02]">
      {RIBBON_ICONS.map(({ key, label, Icon, color }) => {
        const active = used.has(key)
        return (
          <div
            key={key}
            className={cn(
              'flex items-center gap-1.5 transition-all',
              active ? color : 'text-muted-foreground/30 grayscale opacity-30'
            )}
            title={active ? `${label} queried` : `${label} not used`}
          >
            <Icon size={12} />
            <span className="text-[10px] font-medium">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  icon: Icon,
  children
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-muted-foreground/60 shrink-0" />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {title}
        </span>
      </div>
      {children}
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
  const reGroomTaskId = useTaskGroomerStore((s) => s.reGroomTaskId)
  const groomingActive = useTaskGroomerStore((s) => s.groomingActive)
  const startReGroom = useTaskGroomerStore((s) => s.startReGroom)
  const addComment = useTaskGroomerStore((s) => s.addComment)
  const updateComment = useTaskGroomerStore((s) => s.updateComment)
  const deleteComment = useTaskGroomerStore((s) => s.deleteComment)

  // Tab + comment edit local state — all reset via key={task?.id} on DialogContent
  const [activeTab, setActiveTab] = useState<'grooming' | 'notes'>('grooming')
  const [newCommentText, setNewCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const newCommentRef = useRef<HTMLTextAreaElement>(null)

  const stale = task ? isTaskStale(task) : false
  const hasGroomingData = task
    ? task.priority !== null || task.suggestedAction !== null || task.evidenceSummary !== null
    : false

  const isReGrooming = task ? reGroomTaskId === task.id : false
  const isAnyGroomActive = groomingActive || reGroomTaskId !== null

  // Parse research links safely
  let researchLinks: { title: string; url: string }[] = []
  if (task?.researchLinks) {
    try {
      researchLinks = JSON.parse(task.researchLinks)
    } catch {
      /* skip */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* key resets all local state (tab, edit state) when a different task is opened */}
      <DialogContent
        key={task?.id ?? 'none'}
        className="max-w-[580px] max-h-[80vh] p-0 gap-0 overflow-hidden flex flex-col"
      >
        {task && (
          <>
            {/* Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/8 shrink-0">
              <div className="flex items-start justify-between gap-4 pr-8">
                <DialogTitle className="text-base font-medium leading-snug text-left break-words flex-1">
                  {task.text}
                </DialogTitle>
              </div>

              {/* Status + Re-groom row */}
              <div className="flex items-center gap-3 mt-3">
                <StatusDropdown task={task} onStatusChange={updateTaskStatus} />
                {stale && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-400/15 border border-amber-400/20 text-amber-400">
                    <AlertTriangle size={9} />
                    Stale
                  </span>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={isAnyGroomActive}
                  onClick={() => startReGroom(task.id)}
                  aria-label={isReGrooming ? 'Grooming in progress' : 'Re-groom this task'}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    isReGrooming
                      ? 'bg-primary/20 border-primary/30 text-primary cursor-not-allowed'
                      : isAnyGroomActive
                        ? 'bg-white/4 border-white/8 text-muted-foreground opacity-50 cursor-not-allowed'
                        : 'bg-white/6 border-white/12 text-foreground hover:bg-white/10 cursor-pointer'
                  )}
                >
                  {isReGrooming ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />
                      Grooming…
                    </>
                  ) : (
                    <>
                      <RotateCcw size={11} />
                      Re-groom
                    </>
                  )}
                </button>
              </div>
            </DialogHeader>

            {/* Tab bar */}
            <div className="flex border-b border-white/8 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('grooming')}
                className={cn(
                  'px-5 py-2.5 text-xs font-medium border-b-2 transition-colors',
                  activeTab === 'grooming'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Grooming Results
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors',
                  activeTab === 'notes'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <MessageSquare size={11} />
                Notes
                {task.comments && task.comments.length > 0 && (
                  <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold">
                    {task.comments.length}
                  </span>
                )}
              </button>
            </div>

            {/* Grooming Results tab content */}
            {activeTab === 'grooming' && (
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
                {/* Metadata */}
                <Section title="Details" icon={Calendar}>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={11} className="text-muted-foreground/50 shrink-0" />
                      <span className="text-[11px] text-muted-foreground/60">Created</span>
                      <span className="text-[11px] text-foreground/80 ml-auto">
                        {formatDateTime(task.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={11} className="text-muted-foreground/50 shrink-0" />
                      <span className="text-[11px] text-muted-foreground/60">Updated</span>
                      <span className="text-[11px] text-foreground/80 ml-auto">
                        {formatDateTime(task.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag size={11} className="text-muted-foreground/50 shrink-0" />
                      <span className="text-[11px] text-muted-foreground/60">Source</span>
                      <span className="text-[11px] text-foreground/80 ml-auto capitalize">
                        {task.captureSource}
                      </span>
                    </div>
                  </div>
                </Section>

                {/* Grooming results */}
                <Section title="Grooming Results" icon={Zap}>
                  {!hasGroomingData ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-6 flex flex-col items-center gap-2 text-center">
                      <Zap size={18} className="text-muted-foreground/25" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No grooming results yet.
                      </p>
                      <p className="text-[11px] text-muted-foreground/50">
                        Click Re-groom or run a batch groom to analyze this task.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Sources ribbon — always shown in Grooming Results; unused sources are blurred */}
                      <SourcesRibbon sourcesUsed={task.sourcesUsed ?? []} />

                      {/* Priority + Action row */}
                      {(task.priority || task.suggestedAction) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.priority && (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border',
                                PRIORITY_CONFIG[task.priority].badge
                              )}
                            >
                              {PRIORITY_CONFIG[task.priority].label}
                            </span>
                          )}
                          {task.suggestedAction && ACTION_CONFIG[task.suggestedAction] && (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border capitalize',
                                ACTION_CONFIG[task.suggestedAction]
                              )}
                            >
                              {task.suggestedAction}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Priority rationale */}
                      {task.priorityRationale && (
                        <p className="text-xs text-muted-foreground leading-relaxed rounded-lg bg-white/[0.03] border border-white/6 px-3 py-2.5">
                          {task.priorityRationale}
                        </p>
                      )}

                      {/* Evidence */}
                      {task.evidenceSummary && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <FileText size={11} className="text-muted-foreground/50" />
                            <span className="text-[10.5px] text-muted-foreground/60 uppercase tracking-wide font-medium">
                              Evidence
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed pl-4 border-l border-white/10">
                            {task.evidenceSummary}
                          </p>
                        </div>
                      )}

                      {/* Research summary */}
                      {task.researchSummary && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <FileText size={11} className="text-muted-foreground/50" />
                            <span className="text-[10.5px] text-muted-foreground/60 uppercase tracking-wide font-medium">
                              Research
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed pl-4 border-l border-white/10">
                            {task.researchSummary}
                          </p>
                        </div>
                      )}

                      {/* Research links */}
                      {researchLinks.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <Link size={11} className="text-muted-foreground/50" />
                            <span className="text-[10.5px] text-muted-foreground/60 uppercase tracking-wide font-medium">
                              Links
                            </span>
                          </div>
                          <ul className="flex flex-col gap-1 pl-4">
                            {researchLinks.map((link, i) => (
                              <li key={i}>
                                <button
                                  type="button"
                                  onClick={() => window.api.app.openExternal(link.url)}
                                  className="text-xs text-primary hover:underline text-left break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
                                >
                                  {link.title || link.url}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Jira ticket */}
                      {task.jiraTicketKey && task.jiraTicketUrl && (
                        <div className="flex items-center gap-2 rounded-lg border border-blue-400/15 bg-blue-400/[0.04] px-3 py-2">
                          <span className="text-[10.5px] text-muted-foreground/60 uppercase tracking-wide font-medium">
                            Jira
                          </span>
                          <button
                            type="button"
                            onClick={() => window.api.app.openExternal(task.jiraTicketUrl!)}
                            className="text-xs text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 rounded"
                            aria-label={`Open Jira ticket ${task.jiraTicketKey}`}
                          >
                            {task.jiraTicketKey} ↗
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Section>
              </div>
            )}

            {/* Notes tab content */}
            {activeTab === 'notes' && (
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
                {/* Comment thread */}
                {!task.comments || task.comments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-6 flex flex-col items-center gap-2 text-center">
                    <MessageSquare size={18} className="text-muted-foreground/25" />
                    <p className="text-xs text-muted-foreground">No notes yet.</p>
                    <p className="text-[11px] text-muted-foreground/50">
                      Add a note below to annotate this task.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {task.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                            <Clock size={9} />
                            {new Date(comment.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                            {comment.updatedAt !== comment.createdAt && (
                              <span className="text-muted-foreground/35">(edited)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id)
                                setEditingText(comment.text)
                              }}
                              className="p-1 rounded hover:bg-white/8 text-muted-foreground/40 hover:text-foreground/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                              aria-label="Edit comment"
                            >
                              <Pencil size={10} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteComment(task.id, comment.id)}
                              className="p-1 rounded hover:bg-rose-400/10 text-muted-foreground/40 hover:text-rose-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                              aria-label="Delete comment"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30 min-h-[60px]"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(null)
                                  setEditingText('')
                                }}
                                className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-white/8 hover:border-white/16 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={!editingText.trim()}
                                onClick={async () => {
                                  if (!editingText.trim()) return
                                  try {
                                    await updateComment(task.id, comment.id, editingText.trim())
                                    setEditingCommentId(null)
                                    setEditingText('')
                                  } catch (err) {
                                    console.error('[Notes] updateComment failed:', err)
                                    const { toast } = await import('sonner')
                                    toast.error('Failed to update note — try again.')
                                  }
                                }}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-primary/80 hover:bg-primary text-primary-foreground border border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {comment.text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* New comment input */}
                <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-white/6">
                  <textarea
                    ref={newCommentRef}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30 min-h-[72px]"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!newCommentText.trim()}
                      onClick={async () => {
                        if (!newCommentText.trim()) return
                        try {
                          await addComment(task.id, newCommentText.trim())
                          setNewCommentText('')
                        } catch (err) {
                          console.error('[Notes] addComment failed:', err)
                          const { toast } = await import('sonner')
                          toast.error('Failed to save note — try again.')
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary/80 hover:bg-primary text-primary-foreground border border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      <Send size={10} />
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default TaskSidePanel
