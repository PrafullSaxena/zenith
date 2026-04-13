import { useEffect, useRef, useState, memo, useCallback } from 'react'
import {
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw,
  AlertCircle,
  Pencil
} from 'lucide-react'
import type { ReviewSession, ReviewComment } from '../../types/review'
import { SEVERITY_CONFIG, CONFIDENCE_CONFIG, KIND_CONFIG } from '../../types/review'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Static style constants
// ---------------------------------------------------------------------------

const SEV_BORDER: Record<string, string> = {
  blocking: 'border-l-rose-500/70',
  important: 'border-l-orange-400/60',
  suggestion: 'border-l-sky-500/50',
  info: 'border-l-zinc-500/40'
}

const SEV_DOT: Record<string, string> = {
  blocking: 'bg-rose-500',
  important: 'bg-orange-400',
  suggestion: 'bg-sky-500',
  info: 'bg-zinc-500'
}

const SEV_LABEL: Record<string, string> = {
  blocking: 'text-rose-400',
  important: 'text-orange-400',
  suggestion: 'text-sky-400',
  info: 'text-zinc-400'
}

const PANEL_STYLES = `
  @keyframes slide-in {
    from { opacity: 0; transform: translateY(2px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  .stream-cursor {
    display: inline-block;
    width: 6px;
    height: 12px;
    background: hsl(var(--primary) / 0.65);
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: cursor-blink 1s step-end infinite;
  }
  .finding-row {
    animation: slide-in 80ms ease-out both;
  }
`

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
  isConnected: boolean
  hasAgent: boolean
}

// ---------------------------------------------------------------------------
// ReviewPanel
// ---------------------------------------------------------------------------

export function ReviewPanel(props: ReviewPanelProps): React.JSX.Element {
  return (
    <>
      <style>{PANEL_STYLES}</style>
      <PanelContent {...props} />
    </>
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
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
        <Button disabled={!canStart} onClick={onStart} className="w-full max-w-[180px]">
          Start AI Review
        </Button>
        {!isConnected && (
          <p className="text-[11px] text-muted-foreground/35">Connect to Bitbucket first</p>
        )}
        {isConnected && !hasAgent && (
          <p className="text-[11px] text-muted-foreground/35">Configure AI agent in settings</p>
        )}
      </div>
    )
  }

  // ── Streaming ─────────────────────────────────────────────────────────────
  if (session.status === 'streaming') {
    return (
      <div className="flex h-full flex-col">
        {/* Status strip */}
        <div className="flex items-center gap-2 border-b border-white/[0.05] px-3 py-1.5">
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30" />
            <Loader2 size={10} className="relative animate-spin text-primary" />
          </div>
          <span className="text-[11.5px] font-medium text-foreground/70">Analysing diff</span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground/30 tabular-nums">
            {session.rawText.length.toLocaleString()} ch
          </span>
        </div>

        {/* Stream text */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-2.5 font-mono text-[11px] leading-[1.75] text-muted-foreground/45"
        >
          <pre className="whitespace-pre-wrap break-words">
            {session.rawText || 'Waiting for model…'}
            <span className="stream-cursor" />
          </pre>
        </div>

        {/* Skeleton placeholders */}
        <div className="space-y-1.5 border-t border-white/[0.04] px-3 py-2">
          <Skeleton className="h-6 w-full rounded-lg opacity-40" />
          <Skeleton className="h-6 w-3/4 rounded-lg opacity-25" />
        </div>

        <div className="px-3 pb-3 pt-1.5">
          <Button variant="destructive" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (session.status === 'error') {
    return (
      <div className="flex flex-col gap-3 px-3 py-4">
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-rose-400/80" />
          <p className="text-[11.5px] text-rose-400/80">{session.error ?? 'Review failed'}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onNewReview()
              onStart()
            }}
          >
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onNewReview}>
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (session.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-3 px-3 py-8">
        <p className="text-[12px] text-muted-foreground/40">Review cancelled</p>
        <Button
          size="sm"
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
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-2.5">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-yellow-400/80" />
          <div>
            <p className="text-[11.5px] font-medium text-yellow-400/80">No findings parsed</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/45">
              Output did not match expected format.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onNewReview}>
          Retry
        </Button>
        <pre className="max-h-48 overflow-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-[10.5px] text-muted-foreground/50 font-mono whitespace-pre-wrap">
          {session.rawText}
        </pre>
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

  const reviewAge = Date.now() - new Date(session.startedAt).getTime()
  const ageLabel =
    reviewAge < 60_000
      ? 'just now'
      : reviewAge < 3_600_000
        ? `${Math.floor(reviewAge / 60_000)}m ago`
        : `${Math.floor(reviewAge / 3_600_000)}h ago`

  // Sort: blocking → important → suggestion → info
  const SEV_ORDER = { blocking: 0, important: 1, suggestion: 2, info: 3 }
  const sortedComments = [...safeComments]
    .map((c, originalIndex) => ({ c, originalIndex }))
    .sort((a, b) => SEV_ORDER[a.c.severity] - SEV_ORDER[b.c.severity])

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
    <div className="flex h-full flex-col">
      {/* ── Summary header ── */}
      <div className="shrink-0 border-b border-white/[0.06] px-3 py-2.5 space-y-2">
        {/* Count + age */}
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-foreground tabular-nums">
            {safeComments.length} finding{safeComments.length !== 1 ? 's' : ''}
          </span>
          {counts.blocking > 0 && (
            <span className="text-[11px] font-medium text-rose-400">
              {counts.blocking} blocking
            </span>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground/30 tabular-nums">
            {ageLabel}
          </span>
        </div>

        {/* Summary prose */}
        {session.summary && (
          <p className="text-[11.5px] leading-relaxed text-muted-foreground/55 line-clamp-2">
            {session.summary}
          </p>
        )}

        {/* Severity filter tabs */}
        {FILTER_OPTIONS.length > 1 && (
          <div className="flex items-center gap-1" role="tablist" aria-label="Filter findings">
            {FILTER_OPTIONS.map(({ key, label, count }) => (
              <button
                key={key}
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
                  filter === key
                    ? 'bg-white/[0.08] text-foreground'
                    : 'text-muted-foreground/45 hover:text-muted-foreground/70'
                }`}
              >
                {key !== 'all' && (
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEV_DOT[key]}`} />
                )}
                {label}
                <span className="tabular-nums opacity-60">{count}</span>
              </button>
            ))}

            <button
              onClick={onNewReview}
              className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/30 transition-colors hover:text-muted-foreground/60"
              title="New review"
              aria-label="Start new review"
            >
              <RotateCcw size={10} />
            </button>
          </div>
        )}
      </div>

      {/* ── Finding list ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.035]" role="list">
        {visibleComments.length === 0 && (
          <p className="py-6 text-center text-[12px] text-muted-foreground/35">
            No {filter !== 'all' ? filter : ''} findings
          </p>
        )}

        {visibleComments.map(({ c: comment, originalIndex }, listIdx) => (
          <FindingCard
            key={originalIndex}
            comment={comment}
            index={originalIndex}
            listIndex={listIdx}
            isExpanded={expanded.has(originalIndex)}
            isEditing={editingIndex === originalIndex}
            editText={editText}
            onToggle={() => toggleExpand(originalIndex)}
            onStartEdit={() => startEdit(originalIndex, comment.body)}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onEditTextChange={setEditText}
          />
        ))}
      </div>

      {/* ── Sticky post footer ── */}
      {!allPosted && postableCount > 0 && (
        <div className="shrink-0 border-t border-white/[0.06] bg-[hsl(220,14%,6%)] px-3 py-2.5">
          <Button onClick={onPostAll} className="w-full" size="sm">
            Post {postableCount} comment{postableCount !== 1 ? 's' : ''} to Bitbucket
          </Button>
        </div>
      )}
      {allPosted && (
        <div className="shrink-0 border-t border-white/[0.06] px-3 py-2">
          <span className="flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-emerald-400/80">
            <Check size={11} strokeWidth={2.5} />
            All {safeComments.length} comments posted
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FindingCard — memoized, edit state is local to card
// ---------------------------------------------------------------------------

interface FindingCardProps {
  comment: ReviewComment
  index: number
  listIndex: number
  isExpanded: boolean
  isEditing: boolean
  editText: string
  onToggle: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditTextChange: (t: string) => void
}

const FindingCard = memo(function FindingCard({
  comment,
  index,
  listIndex,
  isExpanded,
  isEditing,
  editText,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange
}: FindingCardProps): React.JSX.Element {
  const kindConfig = KIND_CONFIG[comment.kind]
  const fileName = comment.file.split('/').pop() ?? comment.file

  return (
    <div
      role="listitem"
      className={`border-l-2 transition-opacity ${SEV_BORDER[comment.severity]} ${
        !comment.shouldPost ? 'opacity-40' : ''
      } finding-row`}
      style={{ animationDelay: `${Math.min(listIndex * 20, 150)}ms` }}
    >
      {/* ── Collapsed row: single scannable line ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/[0.025] transition-colors select-none"
      >
        {/* Severity dot */}
        <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${SEV_DOT[comment.severity]}`} />

        {/* Severity label */}
        <span
          className={`shrink-0 text-[10px] font-medium tabular-nums ${SEV_LABEL[comment.severity]}`}
        >
          {SEVERITY_CONFIG[comment.severity].label}
        </span>

        {/* Kind */}
        <span className="shrink-0 rounded bg-white/[0.04] px-1 py-px text-[9px] text-muted-foreground/40">
          {kindConfig.label}
        </span>

        {/* Title — primary scannable text */}
        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/80">
          {comment.title}
        </span>

        {/* File + line */}
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/30 tabular-nums">
          {fileName}:{comment.line}
        </span>

        {/* Posted badge */}
        {comment.posted && (
          <Check size={10} className="shrink-0 text-emerald-400/60" strokeWidth={2.5} />
        )}

        {/* Chevron */}
        {isExpanded ? (
          <ChevronDown size={11} className="shrink-0 text-muted-foreground/20" />
        ) : (
          <ChevronRight size={11} className="shrink-0 text-muted-foreground/20" />
        )}
      </div>

      {/* ── Expanded body ── */}
      {isExpanded && (
        <div className="px-3 pb-3 pl-[22px] pt-0">
          {/* Full file path */}
          <p className="mb-1.5 font-mono text-[10px] text-muted-foreground/30">
            {comment.file}:{comment.line}
          </p>

          {/* Edit or read mode */}
          {isEditing ? (
            <div className="flex items-start gap-1.5">
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancelEdit()
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSaveEdit()
                }}
                rows={3}
                className="flex-1 resize-none rounded-lg border border-white/[0.09] bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                aria-label="Edit comment body"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={onSaveEdit}
                  className="rounded p-1 text-emerald-400/70 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
                  title="Save (⌘↵)"
                  aria-label="Save edit"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={onCancelEdit}
                  className="rounded p-1 text-muted-foreground/35 transition-colors hover:bg-white/[0.04] hover:text-muted-foreground/70"
                  title="Cancel"
                  aria-label="Cancel edit"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start gap-1.5">
              <p className="flex-1 text-[12px] leading-relaxed text-foreground/75">
                {comment.body}
              </p>
              {!comment.posted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartEdit()
                  }}
                  className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/35 hover:!text-muted-foreground/70"
                  title="Edit"
                  aria-label="Edit finding"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
          )}

          {/* Suggested fix */}
          {comment.suggestedFix && (
            <div className="mt-2 rounded-lg border border-emerald-500/12 bg-emerald-500/[0.04] px-2.5 py-1.5">
              <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-500/45">
                Suggested fix
              </p>
              <p className="text-[12px] leading-relaxed text-foreground/70">
                {comment.suggestedFix}
              </p>
            </div>
          )}

          {/* Medium confidence warning */}
          {comment.confidence === 'medium' && (
            <p className="mt-1.5 text-[10px] text-yellow-500/50 italic">
              Medium confidence — verify before posting
            </p>
          )}
        </div>
      )}
    </div>
  )
})
