import { useEffect, useRef, useState, memo } from 'react'
import { Pencil, Check, X, ChevronDown, ChevronRight, Loader2, RotateCcw, AlertCircle } from 'lucide-react'
import type { ReviewSession, ReviewComment } from '../../types/review'
import { SEVERITY_CONFIG, CONFIDENCE_CONFIG, KIND_CONFIG } from '../../types/review'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Static style constants — defined once outside render
// ---------------------------------------------------------------------------

const SEV_BAR: Record<string, string> = {
  blocking:   'border-l-[hsl(0,63%,52%)]',
  important:  'border-l-[hsl(25,85%,56%)]',
  suggestion: 'border-l-[hsl(210,80%,60%)]',
  info:       'border-l-[hsl(0,0%,42%)]',
}

const SEV_DOT: Record<string, string> = {
  blocking:   'bg-[hsl(0,63%,52%)]',
  important:  'bg-[hsl(25,85%,56%)]',
  suggestion: 'bg-[hsl(210,80%,60%)]',
  info:       'bg-[hsl(0,0%,42%)]',
}

const SEV_TEXT: Record<string, string> = {
  blocking:   'text-[hsl(0,63%,62%)]',
  important:  'text-[hsl(25,85%,65%)]',
  suggestion: 'text-[hsl(210,80%,70%)]',
  info:       'text-[hsl(0,0%,52%)]',
}

const CONF_TEXT: Record<string, string> = {
  high:   'text-emerald-400',
  medium: 'text-yellow-400/80',
  low:    'text-zinc-500',
}

const PANEL_STYLES = `
  @keyframes finding-in {
    from { opacity: 0; transform: translateY(3px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  .stream-cursor {
    display: inline-block;
    width: 7px;
    height: 13px;
    background: hsl(var(--primary) / 0.7);
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: cursor-blink 1s step-end infinite;
  }
`

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

export function ReviewPanel({
  session,
  onStart,
  onCancel,
  onPostAll,
  onNewReview,
  onUpdateComment,
  isConnected,
  hasAgent,
}: ReviewPanelProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  // Auto-scroll during streaming
  useEffect(() => {
    if (session?.status === 'streaming' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [session?.rawText, session?.status])

  // Expand all cards when review completes
  const comments = session?.comments ?? []
  useEffect(() => {
    if (session?.status === 'complete' && comments.length > 0) {
      setExpandedCards(new Set(comments.map((_, i) => i)))
    }
  }, [session?.status, comments.length])

  const toggleCard = (i: number): void =>
    setExpandedCards((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const startEditing = (i: number, body: string): void => {
    setEditingIndex(i)
    setEditText(body)
  }

  const saveEdit = (): void => {
    if (editingIndex !== null && editText.trim()) {
      onUpdateComment(editingIndex, editText.trim())
    }
    setEditingIndex(null)
    setEditText('')
  }

  const cancelEdit = (): void => {
    setEditingIndex(null)
    setEditText('')
  }

  return (
    <>
      <style>{PANEL_STYLES}</style>
      <PanelContent
        session={session}
        onStart={onStart}
        onCancel={onCancel}
        onPostAll={onPostAll}
        onNewReview={onNewReview}
        scrollRef={scrollRef}
        expandedCards={expandedCards}
        editingIndex={editingIndex}
        editText={editText}
        onToggleCard={toggleCard}
        onStartEdit={startEditing}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
        onEditTextChange={setEditText}
        isConnected={isConnected}
        hasAgent={hasAgent}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// PanelContent — avoids re-rendering PANEL_STYLES on every keystroke
// ---------------------------------------------------------------------------

interface PanelContentProps {
  session: ReviewSession | null
  onStart: () => void
  onCancel: () => void
  onPostAll: () => void
  onNewReview: () => void
  scrollRef: React.RefObject<HTMLDivElement>
  expandedCards: Set<number>
  editingIndex: number | null
  editText: string
  onToggleCard: (i: number) => void
  onStartEdit: (i: number, body: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditTextChange: (text: string) => void
  isConnected: boolean
  hasAgent: boolean
}

function PanelContent({
  session,
  onStart,
  onCancel,
  onPostAll,
  onNewReview,
  scrollRef,
  expandedCards,
  editingIndex,
  editText,
  onToggleCard,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  isConnected,
  hasAgent,
}: PanelContentProps): React.JSX.Element {

  // ── No session ─────────────────────────────────────────────────────────────
  if (!session) {
    const canStart = isConnected && hasAgent
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <button
          disabled={!canStart}
          onClick={onStart}
          className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-lg border px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
            canStart
              ? 'border-primary/30 bg-primary/10 text-primary hover:border-primary/60 hover:bg-primary/18 hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
              : 'border-white/[0.07] bg-white/[0.03] text-muted-foreground/40 cursor-not-allowed'
          }`}
        >
          <span className="relative z-10">Start AI Review</span>
        </button>
        {!isConnected && (
          <p className="text-[11px] text-muted-foreground/40">Connect to Bitbucket first</p>
        )}
        {isConnected && !hasAgent && (
          <p className="text-[11px] text-muted-foreground/40">Configure AI agent in settings</p>
        )}
      </div>
    )
  }

  // ── Streaming ──────────────────────────────────────────────────────────────
  if (session.status === 'streaming') {
    return (
      <div className="flex h-full flex-col">
        {/* Status bar */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.05] bg-[hsl(220,14%,7.5%)] px-4 py-2">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
            <Loader2 size={11} className="relative shrink-0 animate-spin text-primary" />
          </div>
          <span className="text-[12px] font-medium text-foreground/80 tracking-tight">
            Analysing diff
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground/35 tabular-nums">
            {session.rawText.length.toLocaleString()} chars
          </span>
        </div>

        {/* Stream output */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-[hsl(220,14%,5.5%)] px-4 py-3 font-mono text-[11.5px] leading-[1.7] text-muted-foreground/55"
          style={{ overflowAnchor: 'auto' }}
        >
          <pre className="whitespace-pre-wrap break-words">
            {session.rawText || 'Waiting for model…'}
            <span className="stream-cursor" />
          </pre>
        </div>

        {/* Skeleton */}
        <div className="space-y-1.5 border-t border-white/[0.04] px-4 py-2.5">
          <Skeleton className="h-[28px] w-full rounded-sm opacity-50" />
          <Skeleton className="h-[28px] w-4/5 rounded-sm opacity-30" />
        </div>

        <div className="px-4 pb-4 pt-1">
          <Button variant="destructive" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // ── Complete ───────────────────────────────────────────────────────────────
  if (session.status === 'complete') {
    const safeComments = session.comments ?? []

    const counts = {
      blocking:   safeComments.filter((c) => c.severity === 'blocking').length,
      important:  safeComments.filter((c) => c.severity === 'important').length,
      suggestion: safeComments.filter((c) => c.severity === 'suggestion').length,
    }

    const postableRemaining = safeComments.filter((c) => c.shouldPost && !c.posted).length
    const allPosted = safeComments.length > 0 && safeComments.every((c) => c.posted)

    const reviewAge = Date.now() - new Date(session.startedAt).getTime()
    const ageLabel =
      reviewAge < 60_000      ? 'just now'
      : reviewAge < 3_600_000 ? `${Math.floor(reviewAge / 60_000)}m ago`
      :                         `${Math.floor(reviewAge / 3_600_000)}h ago`

    // No comments but had output
    if (safeComments.length === 0 && session.rawText.trim()) {
      return (
        <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-yellow-400/80" />
            <div>
              <p className="text-[12px] font-medium text-yellow-400/90">No findings parsed</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/55">
                AI output did not match expected format.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={onNewReview}>Retry Review</Button>
          <pre className="flex-1 overflow-auto rounded-lg border border-white/[0.06] bg-white/[0.025] p-3 text-[11px] text-muted-foreground/60 font-mono whitespace-pre-wrap">
            {session.rawText}
          </pre>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col">
        {/* Summary header */}
        <div className="border-b border-white/[0.06] bg-[hsl(220,14%,7%)] px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-foreground tabular-nums">
              {safeComments.length} finding{safeComments.length !== 1 ? 's' : ''}
            </span>

            {counts.blocking > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500/80" />
                {counts.blocking} blocking
              </span>
            )}
            {counts.important > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400/80" />
                {counts.important} important
              </span>
            )}
            {counts.suggestion > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400/80" />
                {counts.suggestion} suggestion{counts.suggestion !== 1 ? 's' : ''}
              </span>
            )}

            <span className="ml-auto text-[10px] text-muted-foreground/35">{ageLabel}</span>
          </div>

          {session.summary && (
            <p className="text-[11.5px] text-muted-foreground/65 leading-relaxed">
              {session.summary}
            </p>
          )}

          <div className="flex items-center gap-3">
            {!allPosted && postableRemaining > 0 && (
              <Button size="sm" onClick={onPostAll}>
                Post {postableRemaining} comment{postableRemaining !== 1 ? 's' : ''}
              </Button>
            )}
            {allPosted && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <Check size={11} strokeWidth={2.5} />
                All posted
              </span>
            )}
            <button
              onClick={onNewReview}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
            >
              <RotateCcw size={11} />
              New review
            </button>
          </div>
        </div>

        {/* Finding list */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.035]">
          {safeComments.map((comment, idx) => (
            <FindingCard
              key={idx}
              comment={comment}
              index={idx}
              isExpanded={expandedCards.has(idx)}
              isEditing={editingIndex === idx}
              editText={editText}
              onToggleExpand={() => onToggleCard(idx)}
              onStartEdit={() => onStartEdit(idx, comment.body)}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onEditTextChange={onEditTextChange}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (session.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 px-4">
        <div className="flex w-full items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-400/80" />
          <p className="text-[12px] text-rose-400/90">{session.error || 'Review failed'}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onNewReview(); onStart() }}>
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onNewReview}>
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  // ── Cancelled ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <p className="text-[12px] text-muted-foreground/45">Review cancelled</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { onNewReview(); onStart() }}>
          Start New Review
        </Button>
        <Button size="sm" variant="ghost" onClick={onNewReview}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FindingCard — memoized to prevent list re-renders during edits
// ---------------------------------------------------------------------------

interface FindingCardProps {
  comment: ReviewComment
  index: number
  isExpanded: boolean
  isEditing: boolean
  editText: string
  onToggleExpand: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditTextChange: (text: string) => void
}

const FindingCard = memo(function FindingCard({
  comment,
  index,
  isExpanded,
  isEditing,
  editText,
  onToggleExpand,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
}: FindingCardProps): React.JSX.Element {
  const sevConfig = SEVERITY_CONFIG[comment.severity]
  const confConfig = CONFIDENCE_CONFIG[comment.confidence]
  const kindConfig = KIND_CONFIG[comment.kind]

  return (
    <div
      className={`border-l-2 transition-opacity duration-100 ${SEV_BAR[comment.severity]} ${
        !comment.shouldPost ? 'opacity-35' : ''
      }`}
      style={{
        animation: `finding-in 100ms ease-out ${Math.min(index * 16, 120)}ms both`,
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/[0.02] transition-colors duration-75 select-none"
        onClick={onToggleExpand}
      >
        <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${SEV_DOT[comment.severity]}`} />
        <span className={`shrink-0 text-[10px] font-medium ${SEV_TEXT[comment.severity]}`}>
          {sevConfig.label}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground/35">·</span>
        <span className="shrink-0 text-[10px] text-muted-foreground/50">
          {kindConfig.label}
        </span>

        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/85">
          {comment.title}
        </span>

        {comment.posted && (
          <Check size={10} className="shrink-0 text-emerald-400/70" strokeWidth={2.5} />
        )}

        {isExpanded
          ? <ChevronDown size={11} className="shrink-0 text-muted-foreground/25" />
          : <ChevronRight size={11} className="shrink-0 text-muted-foreground/25" />
        }
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 pl-[22px]">
          <p className="mb-2 font-mono text-[10px] text-muted-foreground/35 tracking-tight">
            {comment.file}:{comment.line}
          </p>

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
                className="flex-1 resize-none rounded-md border border-white/[0.09] bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-primary/40 transition-colors"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={onSaveEdit}
                  className="rounded p-1 text-emerald-400/80 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
                  title="Save (⌘↵)"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={onCancelEdit}
                  className="rounded p-1 text-muted-foreground/40 transition-colors hover:bg-white/[0.04] hover:text-muted-foreground/70"
                  title="Cancel"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start gap-1.5">
              <p className="flex-1 text-[12px] text-foreground/80 leading-relaxed">
                {comment.body}
              </p>
              {!comment.posted && (
                <button
                  onClick={onStartEdit}
                  className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/40 hover:!text-muted-foreground/70"
                  title="Edit"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
          )}

          {comment.suggestedFix && (
            <div className="mt-2.5 rounded-lg border border-emerald-500/12 bg-emerald-500/5 px-2.5 py-2">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-emerald-500/50">
                Suggested fix
              </p>
              <p className="text-[12px] text-foreground/75 leading-relaxed">
                {comment.suggestedFix}
              </p>
            </div>
          )}

          {comment.confidence === 'medium' && (
            <p className="mt-2 text-[10px] text-yellow-500/55 italic">
              Medium confidence — verify before posting
            </p>
          )}
        </div>
      )}
    </div>
  )
})
