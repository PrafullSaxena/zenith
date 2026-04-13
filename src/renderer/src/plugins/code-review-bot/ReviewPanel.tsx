import { useEffect, useRef, useState, memo, useCallback, useMemo } from 'react'
import {
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw,
  AlertCircle,
  Pencil,
  FileCode2,
  CheckCircle2,
  Send,
  Square,
  CheckSquare
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReviewSession, ReviewComment } from '../../types/review'
import { SEVERITY_CONFIG, KIND_CONFIG } from '../../types/review'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Static style constants
// ---------------------------------------------------------------------------

const SEV_CARD_STYLE: Record<string, string> = {
  blocking: 'border-l-fuchsia-500 border-white/5 bg-white/[0.02]',
  important: 'border-l-amber-500 border-white/5 bg-white/[0.02]',
  suggestion: 'border-l-sky-500 border-white/5 bg-white/[0.02]',
  info: 'border-l-slate-400 border-white/5 bg-white/[0.02]'
}

const SEV_DOT: Record<string, string> = {
  blocking: 'bg-fuchsia-500',
  important: 'bg-amber-500',
  suggestion: 'bg-sky-400',
  info: 'bg-slate-400'
}

type SeverityFilter = 'all' | 'blocking' | 'important' | 'suggestion'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReviewPanelProps {
  session: ReviewSession | null
  onStart: () => void
  onCancel: () => void
  onPostAll: () => void
  onNewReview: () => void
  onUpdateComment: (index: number, newText: string) => void
  onToggleCommentPost: (index: number) => void
  isConnected: boolean
  hasAgent: boolean
}

// ---------------------------------------------------------------------------
// ReviewPanel
// ---------------------------------------------------------------------------

export function ReviewPanel(props: ReviewPanelProps): React.JSX.Element {
  return (
    <PanelContent {...props} />
  )
}

// ---------------------------------------------------------------------------
// PanelContent
// ---------------------------------------------------------------------------

function PanelContent({
  session,
  onStart,
  onCancel,
  onPostAll,
  onNewReview,
  onUpdateComment,
  onToggleCommentPost,
  isConnected,
  hasAgent
}: ReviewPanelProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<SeverityFilter>('all')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  // Auto-scroll during streaming
  useEffect(() => {
    if (session?.status === 'streaming' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [session?.rawText, session?.status])

  // Auto-expand only if ≤3 findings — prevents cognitive overload on dense reviews
  const comments = session?.comments ?? []
  useEffect(() => {
    if (session?.status === 'complete' && comments.length > 0 && comments.length <= 3) {
      setExpanded(new Set(comments.map((_, i) => i)))
    } else if (session?.status === 'complete') {
      // Expand only blocking findings by default
      const blockingIndices = comments
        .map((c, i) => (c.severity === 'blocking' ? i : -1))
        .filter((i) => i !== -1)
      setExpanded(new Set(blockingIndices))
    }
  }, [session?.status, comments.length])

  const toggleExpand = useCallback((i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }, [])

  const startEdit = useCallback((i: number, body: string) => {
    setEditingIndex(i)
    setEditText(body)
  }, [])

  const saveEdit = useCallback(() => {
    if (editingIndex !== null && editText.trim()) {
      onUpdateComment(editingIndex, editText.trim())
    }
    setEditingIndex(null)
    setEditText('')
  }, [editingIndex, editText, onUpdateComment])

  const cancelEdit = useCallback(() => {
    setEditingIndex(null)
    setEditText('')
  }, [])

  // ── No session ────────────────────────────────────────────────────────────
  if (!session) {
    const canStart = isConnected && hasAgent
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
          <FileCode2 size={32} className="text-primary/70" />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-foreground">Code Review Ready</h2>
          <p className="mt-1 text-[13px] text-muted-foreground/60 max-w-[240px]">
            Have the AI agent review your PR diff for complex logic errors, performance issues, and stylistic mistakes.
          </p>
        </div>
        <Button disabled={!canStart} onClick={onStart} className="w-full max-w-[200px] mt-2 h-10">
          Start AI Review
        </Button>
        {!isConnected && (
          <p className="text-[12px] text-amber-500/70 mt-2">Connect to Bitbucket first to pull diffs</p>
        )}
        {isConnected && !hasAgent && (
          <p className="text-[12px] text-amber-500/70 mt-2">Configure an AI agent in settings</p>
        )}
      </div>
    )
  }

  // ── Streaming ─────────────────────────────────────────────────────────────
  if (session.status === 'streaming') {
    return (
      <div className="flex h-full flex-col">
        {/* Status strip */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3 bg-[hsl(220,12%,6%)] shadow-sm">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
            <Loader2 size={12} className="relative animate-spin text-primary" />
          </div>
          <span className="text-[13px] font-semibold text-foreground/80 tracking-wide">ANALYSING DIFF</span>
          <span className="ml-auto font-mono text-[12px] text-muted-foreground/40 tabular-nums bg-white/5 px-2 py-0.5 rounded">
            {session.rawText.length.toLocaleString()} chars
          </span>
        </div>

        {/* Stream text with fading mask */}
        <div className="relative flex-1 overflow-hidden bg-black/10">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto px-4 py-4 font-mono text-[12px] leading-[1.8] text-muted-foreground/60"
          >
            <pre className="whitespace-pre-wrap break-words pb-8">
              {session.rawText || 'Initializing models and reading diff chunks...'}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="inline-block w-2.5 h-3.5 bg-primary/70 ml-1 translate-y-[2px]"
              />
            </pre>
          </div>
          {/* Subtle fade out at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[hsl(220,12%,6%)] to-transparent pointer-events-none" />
        </div>

        <div className="border-t border-white/[0.06] bg-[hsl(220,12%,6%)] px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full opacity-20" />
            <Skeleton className="h-5 w-16 rounded-full opacity-10" />
          </div>
          <Button variant="destructive" size="sm" onClick={onCancel} className="h-8 text-[12px] uppercase font-bold tracking-wider">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (session.status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
          <AlertCircle size={32} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-rose-400">Review Failed</h2>
          <p className="mt-1 text-[13px] text-muted-foreground/70 max-w-[260px] whitespace-pre-wrap">
            {session.error ?? 'An unexpected error occurred during the review process.'}
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <Button
            size="sm"
            className="w-24 h-9"
            onClick={() => {
              onNewReview()
              onStart()
            }}
          >
            Retry
          </Button>
          <Button size="sm" variant="ghost" className="w-24 h-9" onClick={onNewReview}>
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (session.status === 'cancelled') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-muted-foreground/40">
          <X size={32} strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-foreground/80">Review Cancelled</h2>
          <p className="mt-1 text-[13px] text-muted-foreground/50 max-w-[240px]">
            The AI review was manually stopped before completion.
          </p>
        </div>
        <Button
          size="sm"
          className="mt-2 h-9 px-6"
          onClick={() => {
            onNewReview()
            onStart()
          }}
        >
          Start New Review
        </Button>
      </div>
    )
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  const safeComments = session.comments ?? []

  // Parse failed
  if (safeComments.length === 0 && session.rawText.trim()) {
    return (
      <div className="flex flex-col gap-4 p-4 h-full">
        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 shadow-sm">
          <AlertCircle size={20} className="shrink-0 text-yellow-500" />
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-yellow-500/90">Output Parse Error</h3>
            <p className="mt-1 text-[13px] text-yellow-500/70 leading-relaxed">
              The AI successfully generated a response, but it didn't match the expected structured format for findings.
            </p>
            <Button size="sm" onClick={onNewReview} className="mt-3 bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 border-yellow-500/40">
               Retry Review
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-xl border border-white/[0.08] bg-black/40 p-3">
          <div className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Raw Output Log</div>
          <pre className="text-[12px] text-muted-foreground/60 font-mono whitespace-pre-wrap leading-relaxed">
            {session.rawText}
          </pre>
        </div>
      </div>
    )
  }

  const counts = {
    blocking: safeComments.filter((c) => c.severity === 'blocking').length,
    important: safeComments.filter((c) => c.severity === 'important').length,
    suggestion: safeComments.filter((c) => c.severity === 'suggestion').length,
    info: safeComments.filter((c) => c.severity === 'info').length
  }

  const postableCount = safeComments.filter((c) => c.shouldPost && !c.posted).length
  const allPosted = safeComments.length > 0 && safeComments.every((c) => c.posted)

  // Sort: blocking → important → suggestion → info
  const SEV_ORDER = { blocking: 0, important: 1, suggestion: 2, info: 3 }
  const sortedComments = useMemo(() => {
    return [...safeComments]
      .map((c, originalIndex) => ({ c, originalIndex }))
      .sort((a, b) => SEV_ORDER[a.c.severity] - SEV_ORDER[b.c.severity])
  }, [safeComments])

  // Apply severity filter
  const visibleComments = sortedComments.filter(
    ({ c }) => filter === 'all' || c.severity === filter
  )

  const FILTER_OPTIONS: Array<{ key: SeverityFilter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: safeComments.length },
    { key: 'blocking', label: 'Blocking', count: counts.blocking },
    { key: 'important', label: 'Important', count: counts.important },
    { key: 'suggestion', label: 'Suggestion', count: counts.suggestion }
  ].filter((f) => f.key === 'all' || f.count > 0)

  return (
    <div className="flex h-full flex-col bg-[hsl(224,14%,6%)] rounded-xl border border-white/[0.08] overflow-hidden m-2 shadow-2xl">
      {/* ── Summary header ── */}
      <div className="shrink-0 border-b border-white/[0.08] bg-black/20 p-4">
        {/* Count Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <h2 className="text-[18px] font-bold text-foreground">
              {safeComments.length} {safeComments.length === 1 ? 'Finding' : 'Findings'} Found
            </h2>
            {counts.blocking > 0 && (
              <p className="text-[13px] font-semibold text-fuchsia-400 mt-0.5 flex items-center gap-1.5">
                <AlertCircle size={14} /> Attention required: {counts.blocking} blocking
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewReview}
            className="flex items-center gap-1.5 text-[12px] text-muted-foreground/60 transition-colors hover:text-foreground hover:bg-white/10"
            title="Start fresh review"
            aria-label="Start new review"
          >
            <RotateCcw size={14} /> <span>Refresh</span>
          </Button>
        </div>

        {/* Severity filter tabs */}
        {FILTER_OPTIONS.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 mt-4" role="tablist" aria-label="Filter findings">
            {FILTER_OPTIONS.map(({ key, label, count }) => {
              const isSelected = filter === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setFilter(key)}
                  className={`
                    relative flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all
                    ${isSelected ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'}
                  `}
                >
                  {key !== 'all' && (
                    <span className={`h-2 w-2 shrink-0 rounded-full ${SEV_DOT[key]}`} />
                  )}
                  {label}
                  <span className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] ${isSelected ? 'bg-primary/20 text-primary' : 'bg-black/20 text-muted-foreground'}`}>{count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Finding list ── */}
      <div className="flex-1 overflow-y-auto p-3" role="list">
        {safeComments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-80">
            <div className="rounded-full bg-white/5 p-4 mb-4">
              <CheckCircle2 size={48} className="text-muted-foreground" />
            </div>
            <h3 className="text-[18px] font-bold text-foreground">Looks Good!</h3>
            <p className="mt-2 text-[14px] text-muted-foreground/60 max-w-[240px]">
              The AI didn't spot any significant issues or suggestions for this diff.
            </p>
          </div>
        ) : visibleComments.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-muted-foreground/40 font-medium">
            No {filter !== 'all' ? filter : ''} findings found.
          </div>
        ) : (
          <motion.div layout className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {visibleComments.map(({ c: comment, originalIndex }) => (
                <FindingCard
                  key={originalIndex}
                  comment={comment}
                  index={originalIndex}
                  isExpanded={expanded.has(originalIndex)}
                  isEditing={editingIndex === originalIndex}
                  editText={editText}
                  onToggle={() => toggleExpand(originalIndex)}
                  onStartEdit={() => startEdit(originalIndex, comment.body)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onEditTextChange={setEditText}
                  onTogglePost={() => onToggleCommentPost(originalIndex)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Sticky post footer ── */}
      {!allPosted && postableCount > 0 && (
        <div className="shrink-0 border-t border-white/[0.08] bg-black/40 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
          <Button onClick={onPostAll} className="w-full text-[14px] h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
            <Send size={16} className="mr-2" /> Post {postableCount} Comment{postableCount !== 1 ? 's' : ''} to Bitbucket
          </Button>
        </div>
      )}
      {allPosted && safeComments.length > 0 && postableCount === 0 && (
        <div className="shrink-0 border-t border-white/[0.08] bg-white/[0.04] p-3">
          <span className="flex items-center justify-center gap-2 text-[14px] font-semibold text-foreground/80">
            <Check size={18} strokeWidth={3} className="bg-white/10 rounded-full p-0.5" />
            All comments posted successfully
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FindingCard 
// ---------------------------------------------------------------------------

interface FindingCardProps {
  comment: ReviewComment
  index: number
  isExpanded: boolean
  isEditing: boolean
  editText: string
  onToggle: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditTextChange: (t: string) => void
  onTogglePost: () => void
}

const FindingCard = memo(function FindingCard({
  comment,
  index,
  isExpanded,
  isEditing,
  editText,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  onTogglePost
}: FindingCardProps): React.JSX.Element {
  const kindConfig = KIND_CONFIG[comment.kind]
  const fileName = comment.file.split('/').pop() ?? comment.file

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      role="listitem"
      className={`relative overflow-hidden rounded-xl border-l-2 border-y border-r transition-all duration-200 ${SEV_CARD_STYLE[comment.severity]} ${
        !comment.shouldPost ? 'opacity-60 grayscale-[0.5] shadow-none' : ''
      } ${isEditing ? 'ring-2 ring-primary/50 shadow-lg z-10' : ''}`}
    >
      {/* ── Collapsed view / Header ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-colors select-none"
      >
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <button
            type="button"
            className="shrink-0 text-muted-foreground/60 hover:text-primary transition-colors focus:outline-none"
            onClick={(e) => {
              e.stopPropagation()
              onTogglePost()
            }}
            title={comment.shouldPost ? "Exclude from posting" : "Include in posting"}
          >
            {comment.shouldPost ? (
              <CheckSquare size={16} className="text-primary" />
            ) : (
              <Square size={16} className="opacity-80" />
            )}
          </button>
          <span className={`shrink-0 h-2 w-2 rounded-full ${SEV_DOT[comment.severity]}`} />
          
          <div className="flex flex-col flex-1 min-w-0 gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[14px] font-semibold text-foreground/90">
                {comment.title}
              </span>
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/5 font-mono text-[11px] text-muted-foreground/60 border border-white/10">
                {fileName}:{comment.line}
              </span>
            </div>
            
            {!isExpanded && (
              <span className="truncate text-[13px] text-muted-foreground/60">
                {comment.body}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {comment.posted && (
            <span className="flex items-center justify-center p-1 bg-white/10 rounded-full text-foreground/70">
               <Check size={12} strokeWidth={3} />
            </span>
          )}
          {isExpanded ? (
            <ChevronDown size={18} className="text-muted-foreground/40" />
          ) : (
            <ChevronRight size={18} className="text-muted-foreground/40" />
          )}
        </div>
      </div>

      {/* ── Expanded body ── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 ml-[11px] border-l border-white/5 pl-4">
              {/* Badges line */}
              <div className="flex gap-2 mb-3">
                <span className={`inline-block rounded font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 ${
                  SEVERITY_CONFIG[comment.severity].badge.split(' ').filter(c => c.startsWith('text-') || c.startsWith('bg-')).join(' ')
                }`}>
                  {SEVERITY_CONFIG[comment.severity].label}
                </span>
                <span className="inline-block rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {kindConfig.label}
                </span>
              </div>

              {/* Edit or read mode */}
              {isEditing ? (
                <div className="flex flex-col gap-2 mt-2">
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={(e) => onEditTextChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') onCancelEdit()
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSaveEdit()
                    }}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-primary/40 bg-black/40 px-3 py-2 text-[13px] text-foreground shadow-inner focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30"
                    aria-label="Edit comment body"
                    placeholder="Refine the AI's comment..."
                  />
                  <div className="flex items-center justify-between">
                     <span className="font-mono text-[11px] text-muted-foreground/40">
                      <kbd className="border border-white/10 rounded px-1">⌘</kbd> + <kbd className="border border-white/10 rounded px-1">↵</kbd> to save
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={onCancelEdit} className="h-7 text-[12px]">Cancel</Button>
                      <Button size="sm" onClick={onSaveEdit} className="h-7 text-[12px] bg-primary text-primary-foreground hover:bg-primary/90">Save Edits</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="group relative pr-8">
                  <p className="text-[13px] leading-[1.6] text-foreground/85 whitespace-pre-wrap">
                    {comment.body}
                  </p>
                  {!comment.posted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStartEdit()
                      }}
                      className="absolute top-0 right-0 p-1.5 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 text-muted-foreground"
                      title="Edit"
                      aria-label="Edit finding"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Suggested fix */}
              {comment.suggestedFix && (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/40 overflow-hidden">
                  <div className="bg-white/5 px-3 py-1.5 border-b border-white/10 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-muted-foreground" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                      Suggested fix
                    </span>
                  </div>
                  <pre className="p-3 text-[13px] leading-relaxed text-foreground/80 font-mono overflow-auto">
                    {comment.suggestedFix}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
