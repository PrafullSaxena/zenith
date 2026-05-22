/**
 * TaskSidePanel — Task detail modal with structured sections:
 *   Title · Status/Priority/Action row · Details · Raw Text
 *   Summary · Next Steps · References · Notes
 */
import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { useTaskGroomerStore, isTaskStale } from '@renderer/stores/task-groomer-store'
import StatusDropdown from './StatusDropdown'
import { cn } from '@renderer/lib/utils'
import { ContentRenderer } from '@renderer/components/shared/content-renderer'
import {
  Loader2, RotateCcw, Clock, AlertTriangle, Zap, Link, Bot, Ticket, Globe,
  FileText, MessageSquare, Pencil, Trash2, Send, ChevronDown
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}

function normalizeGroomingMarkdown(text: string): string {
  return text
    .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
    .replace(/([^#\n])(#{2,6}\s)/g, '$1\n\n$2')
    .replace(/([^\n])\n([-*]\s)/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const PRIORITY_OPTIONS: { label: string; value: Task['priority']; cls: string }[] = [
  { label: 'P1 — High', value: 'p1', cls: 'text-red-400 bg-red-400/15 border-red-400/25' },
  { label: 'P2 — Medium', value: 'p2', cls: 'text-amber-400 bg-amber-400/15 border-amber-400/25' },
  { label: 'P3 — Low', value: 'p3', cls: 'text-blue-400 bg-blue-400/15 border-blue-400/25' },
]
const PRIORITY_CLS: Record<string, string> = {
  p1: 'text-red-400 bg-red-400/15 border-red-400/25',
  p2: 'text-amber-400 bg-amber-400/15 border-amber-400/25',
  p3: 'text-blue-400 bg-blue-400/15 border-blue-400/25',
}
const ACTION_CLS: Record<string, string> = {
  do: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  delegate: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  defer: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  delete: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
}
const CATEGORY_CLS: Record<string, string> = {
  research: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  bug: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  chore: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
}

// ── Sources ribbon ─────────────────────────────────────────────────────────

const RIBBON_ICONS = [
  { key: 'ai' as const, label: 'AI', Icon: Bot, color: 'text-violet-400' },
  { key: 'jira' as const, label: 'Jira', Icon: Ticket, color: 'text-blue-400' },
  { key: 'confluence' as const, label: 'Confluence', Icon: FileText, color: 'text-sky-400' },
  { key: 'google' as const, label: 'Google', Icon: Globe, color: 'text-emerald-400' },
]
function SourcesRibbon({ sourcesUsed }: { sourcesUsed: ('ai'|'jira'|'confluence'|'google')[]|null }) {
  const used = new Set(sourcesUsed ?? [])
  return (
    <div className="flex items-center gap-3 py-1.5 px-3 rounded-lg border border-white/6 bg-white/[0.02]">
      {RIBBON_ICONS.map(({ key, label, Icon, color }) => {
        const active = used.has(key)
        return (
          <div key={key} className={cn('flex items-center gap-1 transition-all', active ? color : 'text-muted-foreground/25 grayscale opacity-30')} title={active ? `${label} queried` : `${label} not used`}>
            <Icon size={11} /><span className="text-[9.5px] font-medium">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ label, icon: Icon, collapsible = false, children }: {
  label: string; icon: React.ElementType; collapsible?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => collapsible && setOpen(!open)}
        className={cn('flex items-center gap-2', collapsible && 'cursor-pointer group')}
      >
        <Icon size={11} className="text-muted-foreground/50 shrink-0" />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/55 flex-1 text-left">{label}</span>
        {collapsible && <ChevronDown size={11} className={cn('text-muted-foreground/30 transition-transform', !open && '-rotate-90')} />}
      </button>
      {open && children}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

interface TaskSidePanelProps { task: Task | null; open: boolean; onClose: () => void }

export function TaskSidePanel({ task, open, onClose }: TaskSidePanelProps): React.JSX.Element {
  const updateTaskStatus = useTaskGroomerStore((s) => s.updateTaskStatus)
  const updateTaskPriority = useTaskGroomerStore((s) => s.updateTaskPriority)
  const reGroomTaskId = useTaskGroomerStore((s) => s.reGroomTaskId)
  const groomingActive = useTaskGroomerStore((s) => s.groomingActive)
  const startReGroom = useTaskGroomerStore((s) => s.startReGroom)
  const addComment = useTaskGroomerStore((s) => s.addComment)
  const updateComment = useTaskGroomerStore((s) => s.updateComment)
  const deleteComment = useTaskGroomerStore((s) => s.deleteComment)

  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details')
  const [newCommentText, setNewCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const newCommentRef = useRef<HTMLTextAreaElement>(null)

  const stale = task ? isTaskStale(task) : false
  const hasGroomingData = task ? (task.priority !== null || task.summarySection !== null || task.evidenceSummary !== null) : false
  const isReGrooming = task ? reGroomTaskId === task.id : false
  const isAnyGroomActive = groomingActive || reGroomTaskId !== null

  let researchLinks: { title: string; url: string }[] = []
  if (task?.researchLinks) {
    try { researchLinks = JSON.parse(task.researchLinks) } catch { /* skip */ }
  }

  const title = task ? (task.shortTitle ?? task.text.slice(0, 80) + (task.text.length > 80 ? '…' : '')) : ''

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent key={task?.id ?? 'none'} className="max-w-[620px] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        {task && (
          <>
            {/* ── Title ── */}
            <DialogHeader className="px-6 pt-5 pb-3 border-b border-white/8 shrink-0">
              <DialogTitle className="text-[15px] font-semibold leading-snug text-left break-words">
                {title}
              </DialogTitle>
              {task.shortTitle && task.text !== title && (
                <p className="text-[11px] text-muted-foreground/50 mt-1 leading-snug line-clamp-2">{task.text}</p>
              )}

              {/* ── Status / Priority / Action / Re-groom row ── */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <StatusDropdown task={task} onStatusChange={updateTaskStatus} />

                {/* Category badge */}
                {task.category && (
                  <span className={cn('text-[10px] font-medium border rounded-full px-2 py-0.5 capitalize', CATEGORY_CLS[task.category])}>
                    {task.category}
                  </span>
                )}

                {/* Priority inline dropdown */}
                <div className="relative">
                  <select
                    value={task.priority ?? ''}
                    onChange={(e) => updateTaskPriority(task.id, e.target.value as Task['priority'])}
                    className={cn(
                      'appearance-none text-[10px] font-medium border rounded-full px-2 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 bg-transparent transition-colors',
                      task.priority ? PRIORITY_CLS[task.priority] : 'text-muted-foreground/50 border-white/10'
                    )}
                  >
                    <option value="" disabled>Priority</option>
                    {PRIORITY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value ?? ''} className="bg-popover text-foreground">{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Suggested action */}
                {task.suggestedAction && ACTION_CLS[task.suggestedAction] && (
                  <span className={cn('text-[10px] font-medium border rounded-full px-2 py-0.5 capitalize', ACTION_CLS[task.suggestedAction])}>
                    {task.suggestedAction}
                  </span>
                )}

                {stale && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-400/15 border border-amber-400/20 text-amber-400">
                    <AlertTriangle size={9} />Stale
                  </span>
                )}

                <div className="flex-1" />

                {/* Re-groom */}
                <button
                  type="button"
                  disabled={isAnyGroomActive}
                  onClick={() => startReGroom(task.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    isReGrooming ? 'bg-primary/20 border-primary/30 text-primary cursor-not-allowed' :
                    isAnyGroomActive ? 'bg-white/4 border-white/8 text-muted-foreground opacity-50 cursor-not-allowed' :
                    'bg-white/6 border-white/12 text-foreground hover:bg-white/10 cursor-pointer'
                  )}
                >
                  {isReGrooming ? <><Loader2 size={11} className="animate-spin" />Grooming…</> : <><RotateCcw size={11} />Re-groom</>}
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 mt-3 -mb-3 border-b border-white/6">
                {(['details', 'notes'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-1.5 text-[11px] font-medium capitalize transition-colors border-b-2 -mb-px',
                      activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab}
                    {tab === 'notes' && (task.comments?.length ?? 0) > 0 && (
                      <span className="ml-1.5 text-[9px] bg-primary/20 text-primary rounded-full px-1.5 py-0.5">{task.comments.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </DialogHeader>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto">

              {/* DETAILS TAB */}
              {activeTab === 'details' && (
                <div className="px-6 py-5 flex flex-col gap-5">

                  {/* Details metadata */}
                  <Section label="Details" icon={Clock} collapsible>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 text-[11px]">
                      {[
                        ['Created', formatDateTime(task.createdAt)],
                        ['Updated', formatDateTime(task.updatedAt)],
                        ['Source', task.captureSource],
                        task.category ? ['Category', task.category] : null,
                      ].filter(Boolean).map(([k, v]) => (
                        <div key={k as string} className="flex gap-2">
                          <span className="text-muted-foreground/50 w-16 shrink-0">{k}</span>
                          <span className="text-foreground/70 capitalize">{v as string}</span>
                        </div>
                      ))}
                    </div>
                  </Section>

                  {/* Raw Text */}
                  <Section label="Raw Text" icon={FileText} collapsible>
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
                      <p className="text-[12px] text-muted-foreground/80 leading-relaxed whitespace-pre-wrap break-words">{task.text}</p>
                    </div>
                  </Section>

                  {/* Grooming data */}
                  {hasGroomingData ? (
                    <>
                      {/* Integration sources ribbon */}
                      <SourcesRibbon sourcesUsed={task.sourcesUsed ?? []} />

                      {/* Priority rationale */}
                      {task.priorityRationale && (
                        <p className="text-[11px] text-muted-foreground/60 leading-relaxed italic px-1">
                          {task.priorityRationale}
                        </p>
                      )}

                      {/* Summary */}
                      {(task.summarySection || task.evidenceSummary) && (
                        <Section label="Summary" icon={Zap}>
                          <div className="text-[12px] text-muted-foreground leading-relaxed [&_ul]:space-y-1 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground/80 [&_p]:leading-relaxed [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-foreground/70 [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:mt-2 [&_h2]:mb-1">
                            <ContentRenderer content={normalizeGroomingMarkdown(task.summarySection ?? task.evidenceSummary ?? '')} />
                          </div>
                        </Section>
                      )}

                      {/* Next Steps */}
                      {task.nextStepsSection && (
                        <Section label="Next Steps" icon={Zap}>
                          <div className="text-[12px] text-muted-foreground leading-relaxed [&_ul]:space-y-1 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground/80">
                            <ContentRenderer content={normalizeGroomingMarkdown(task.nextStepsSection)} />
                          </div>
                        </Section>
                      )}

                      {/* References */}
                      {(researchLinks.length > 0 || (task.jiraTicketKey && task.jiraTicketUrl)) && (
                        <Section label="References" icon={Link}>
                          <div className="flex flex-col gap-1">
                            {task.jiraTicketKey && task.jiraTicketUrl && (
                              <div className="flex items-center gap-2 rounded-lg border border-blue-400/15 bg-blue-400/[0.04] px-3 py-2">
                                <Ticket size={11} className="text-blue-400 shrink-0" />
                                <button type="button" onClick={() => window.api.app.openExternal(task.jiraTicketUrl!)}
                                  className="text-[11px] text-blue-400 hover:underline focus-visible:outline-none rounded">
                                  {task.jiraTicketKey} ↗
                                </button>
                              </div>
                            )}
                            {researchLinks.map((link, i) => (
                              <button key={i} type="button" onClick={() => window.api.app.openExternal(link.url)}
                                className="text-left text-[11px] text-primary hover:underline break-all focus-visible:outline-none rounded px-1">
                                {link.title || link.url}
                              </button>
                            ))}
                          </div>
                        </Section>
                      )}
                    </>
                  ) : (
                    /* Empty grooming state */
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-8 flex flex-col items-center gap-2 text-center">
                      <Zap size={20} className="text-muted-foreground/20" />
                      <p className="text-[11px] text-muted-foreground/60">No grooming results yet</p>
                      <p className="text-[10.5px] text-muted-foreground/40">Click Re-groom or run a batch groom to analyse this task.</p>
                    </div>
                  )}
                </div>
              )}

              {/* NOTES TAB */}
              {activeTab === 'notes' && (
                <div className="px-6 py-5 flex flex-col gap-4">
                  {/* Thread */}
                  {(!task.comments || task.comments.length === 0) ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-8 flex flex-col items-center gap-2 text-center">
                      <MessageSquare size={18} className="text-muted-foreground/25" />
                      <p className="text-xs text-muted-foreground/60">No notes yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {task.comments.map((comment) => (
                        <div key={comment.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                              <Clock size={9} />
                              {new Date(comment.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                              {comment.updatedAt !== comment.createdAt && <span className="text-muted-foreground/35">(edited)</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.text) }}
                                className="p-1 rounded hover:bg-white/8 text-muted-foreground/40 hover:text-foreground/70 transition-colors">
                                <Pencil size={10} />
                              </button>
                              <button type="button" onClick={() => deleteComment(task.id, comment.id)}
                                className="p-1 rounded hover:bg-rose-400/10 text-muted-foreground/40 hover:text-rose-400 transition-colors">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="flex flex-col gap-2">
                              <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)}
                                className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-foreground/90 focus:outline-none focus:border-primary/40 min-h-[60px]" rows={3} />
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setEditingCommentId(null); setEditingText('') }}
                                  className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-white/8 transition-colors">Cancel</button>
                                <button type="button" disabled={!editingText.trim()}
                                  onClick={async () => { try { await updateComment(task.id, comment.id, editingText.trim()); setEditingCommentId(null); setEditingText('') } catch { const {toast} = await import('sonner'); toast.error('Failed to update note') }}}
                                  className="px-3 py-1 rounded-lg text-xs font-medium bg-primary/80 hover:bg-primary text-primary-foreground border border-primary/50 transition-colors disabled:opacity-50">Save</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* New comment */}
                  <div className="flex flex-col gap-2 border-t border-white/6 pt-3">
                    <textarea ref={newCommentRef} value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add a note…"
                      className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 min-h-[72px]" rows={3} />
                    <div className="flex justify-end">
                      <button type="button" disabled={!newCommentText.trim()}
                        onClick={async () => { if (!newCommentText.trim()) return; try { await addComment(task.id, newCommentText.trim()); setNewCommentText('') } catch { const {toast} = await import('sonner'); toast.error('Failed to save note') }}}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary/80 hover:bg-primary text-primary-foreground border border-primary/50 transition-colors disabled:opacity-50">
                        <Send size={10} />Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default TaskSidePanel
