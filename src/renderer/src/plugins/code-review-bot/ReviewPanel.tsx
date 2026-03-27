import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import type { ReviewSession, ReviewComment } from '../../types/review'
import { SEVERITY_CONFIG, CONFIDENCE_CONFIG, KIND_CONFIG } from '../../types/review'
import { Card } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { staggerContainer, staggerItem } from '../../lib/motion'

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

/**
 * AI review streaming display with start/cancel controls,
 * rich comment cards (severity/confidence/kind), editable comments,
 * and post-to-Bitbucket buttons.
 */
export function ReviewPanel({
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
  const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  // Auto-scroll streaming output to bottom
  useEffect(() => {
    if (session?.status === 'streaming' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [session?.rawText, session?.status])

  // Initialize all postable comments as selected & expand all when review completes
  const comments = session?.comments ?? []
  useEffect(() => {
    if (session?.status === 'complete' && comments.length > 0) {
      const postable = comments
        .map((c, i) => (c.shouldPost ? i : -1))
        .filter((i) => i >= 0)
      setSelectedComments(new Set(postable))
      setExpandedCards(new Set(comments.map((_, i) => i)))
    }
  }, [session?.status, comments.length])

  const toggleComment = (index: number): void => {
    setSelectedComments((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleCard = (index: number): void => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const startEditing = (index: number, currentText: string): void => {
    setEditingIndex(index)
    setEditText(currentText)
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

  // --- No active review ---
  if (!session) {
    const canStart = isConnected && hasAgent
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Button
          variant={canStart ? 'default' : 'ghost'}
          disabled={!canStart}
          onClick={onStart}
        >
          Start Review
        </Button>
        {!isConnected && (
          <p className="mt-3 text-xs text-muted-foreground">
            Connect to Bitbucket first
          </p>
        )}
        {isConnected && !hasAgent && (
          <p className="mt-3 text-xs text-muted-foreground">
            Configure AI agent in settings
          </p>
        )}
      </div>
    )
  }

  // --- Streaming ---
  if (session.status === 'streaming') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
          <span className="text-sm font-medium text-foreground">
            AI Review in progress...
          </span>
        </div>

        <Card className="mx-4 mb-3 flex-1 overflow-y-auto p-4">
          <div ref={scrollRef} className="font-mono text-sm text-foreground">
            <pre className="whitespace-pre-wrap">{session.rawText || 'Waiting for response...'}</pre>
          </div>
        </Card>

        {/* Streaming placeholder skeleton */}
        <div className="mx-4 mb-3">
          <Skeleton className="h-4 w-full" />
        </div>

        <div className="px-4 pb-4">
          <Button variant="destructive" onClick={onCancel}>
            Cancel Review
          </Button>
        </div>
      </div>
    )
  }

  // --- Complete ---
  if (session.status === 'complete') {
    const safeComments = session.comments ?? []
    const blockingCount = safeComments.filter((c) => c.severity === 'blocking').length
    const importantCount = safeComments.filter((c) => c.severity === 'important').length
    const suggestionCount = safeComments.filter((c) => c.severity === 'suggestion').length
    const postedCount = safeComments.filter((c) => c.posted).length
    const allPosted = postedCount === safeComments.length && safeComments.length > 0

    const reviewAge = Date.now() - new Date(session.startedAt).getTime()
    const reviewAgeLabel =
      reviewAge < 60_000
        ? 'just now'
        : reviewAge < 3_600_000
          ? `${Math.floor(reviewAge / 60_000)}m ago`
          : `${Math.floor(reviewAge / 3_600_000)}h ago`

    // If AI produced output but parser found 0 comments, show the raw output
    if (safeComments.length === 0 && session.rawText.trim().length > 0) {
      return (
        <div className="flex h-full flex-col overflow-y-auto p-4 gap-3">
          <Card className="bg-yellow-500/10 p-4">
            <p className="text-sm font-medium text-yellow-400">
              AI review completed but no comments were parsed
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The AI output did not match the expected format. Raw output is shown below.
            </p>
          </Card>
          <div className="flex gap-2">
            <Button variant="default" onClick={onNewReview}>
              Retry Review
            </Button>
          </div>
          <pre className="flex-1 overflow-auto rounded-xl bg-card p-4 text-xs text-muted-foreground font-mono whitespace-pre-wrap">
            {session.rawText}
          </pre>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col">
        {/* Summary header */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">
                {safeComments.length} findings
              </p>
              {blockingCount > 0 && (
                <Badge variant="destructive">
                  {SEVERITY_CONFIG.blocking.emoji} {blockingCount} Blocking
                </Badge>
              )}
              {importantCount > 0 && (
                <Badge variant="secondary">
                  {SEVERITY_CONFIG.important.emoji} {importantCount} Important
                </Badge>
              )}
              {suggestionCount > 0 && (
                <Badge variant="secondary">
                  {SEVERITY_CONFIG.suggestion.emoji} {suggestionCount} Suggestion
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">Reviewed {reviewAgeLabel}</span>
          </div>

          {/* Summary text */}
          {session.summary && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {session.summary}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            {!allPosted && (
              <Button variant="default" onClick={onPostAll}>
                {postedCount > 0
                  ? `Post Remaining (${safeComments.filter((c) => c.shouldPost && !c.posted).length})`
                  : 'Post All Inline Comments'}
              </Button>
            )}
            {allPosted && (
              <Badge variant="default">
                All comments posted
              </Badge>
            )}
            <Button variant="ghost" onClick={onNewReview}>
              New Review
            </Button>
          </div>
        </div>

        {/* Finding cards — staggered Card entries */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex-1 space-y-3 p-4"
        >
          {safeComments.map((comment, idx) => (
            <motion.div key={idx} variants={staggerItem}>
              <FindingCard
                comment={comment}
                index={idx}
                isSelected={selectedComments.has(idx)}
                isExpanded={expandedCards.has(idx)}
                isEditing={editingIndex === idx}
                editText={editText}
                onToggleSelect={() => toggleComment(idx)}
                onToggleExpand={() => toggleCard(idx)}
                onStartEdit={() => startEditing(idx, comment.body)}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onEditTextChange={setEditText}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    )
  }

  // --- Error ---
  if (session.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="bg-red-500/10 text-center p-4">
          <p className="text-sm text-red-400">{session.error || 'An error occurred during the review.'}</p>
        </Card>
        <div className="mt-4 flex gap-2">
          <Button variant="default" onClick={() => { onNewReview(); onStart() }}>
            Retry Review
          </Button>
          <Button variant="ghost" onClick={onNewReview}>
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  // --- Cancelled ---
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-sm text-muted-foreground">Review was cancelled</p>
      {session.rawText && (
        <p className="mt-1 text-xs text-muted-foreground/60">
          {session.rawText.length} characters of output received before cancellation
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="default" onClick={() => { onNewReview(); onStart() }}>
          Start New Review
        </Button>
        <Button variant="ghost" onClick={onNewReview}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FindingCard — individual review finding with rich formatting
// ---------------------------------------------------------------------------

interface FindingCardProps {
  comment: ReviewComment
  index: number
  isSelected: boolean
  isExpanded: boolean
  isEditing: boolean
  editText: string
  onToggleSelect: () => void
  onToggleExpand: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditTextChange: (text: string) => void
}

function FindingCard({
  comment,
  isSelected,
  isExpanded,
  isEditing,
  editText,
  onToggleSelect,
  onToggleExpand,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange
}: FindingCardProps): React.JSX.Element {
  const sevConfig = SEVERITY_CONFIG[comment.severity]
  const confConfig = CONFIDENCE_CONFIG[comment.confidence]
  const kindConfig = KIND_CONFIG[comment.kind]

  return (
    <Card
      className={`overflow-hidden border-l-4 p-0 ${sevConfig.border} ${
        !comment.shouldPost ? 'opacity-50' : ''
      }`}
    >
      {/* Card header -- always visible */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={onToggleExpand}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          onClick={(e) => e.stopPropagation()}
          className="accent-accent cursor-pointer shrink-0"
        />

        {/* Severity badge */}
        <Badge variant={comment.severity === 'blocking' ? 'destructive' : comment.severity === 'important' ? 'warning' : 'info'}>
          {sevConfig.emoji} {sevConfig.label}
        </Badge>

        {/* Kind tag */}
        <span className="inline-flex shrink-0 items-center rounded-lg px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-muted-foreground">
          {kindConfig.icon} {kindConfig.label}
        </span>

        {/* Title */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {comment.title}
        </span>

        {/* Confidence badge */}
        <Badge variant={comment.confidence === 'high' ? 'success' : comment.confidence === 'medium' ? 'warning' : 'default'}>
          {confConfig.label}
        </Badge>

        {/* Posted indicator */}
        {comment.posted && (
          <Badge variant="default">Posted</Badge>
        )}

        {/* Expand/collapse chevron */}
        {isExpanded ? (
          <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 px-3 py-2.5 pl-9">
          {/* File and line */}
          <p className="mb-2 font-mono text-xs text-muted-foreground">
            {comment.file}:{comment.line}
          </p>

          {/* Explanation / body */}
          {isEditing ? (
            <div className="flex items-start gap-1">
              <textarea
                className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                value={editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                rows={3}
                autoFocus
              />
              <button
                type="button"
                onClick={onSaveEdit}
                className="rounded-lg p-1 text-green-400 hover:bg-green-500/10"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="group flex items-start gap-1">
              <p className="flex-1 text-sm text-foreground leading-relaxed">
                {comment.body}
              </p>
              {!comment.posted && (
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="shrink-0 rounded-lg p-0.5 text-muted-foreground/0 transition group-hover:text-muted-foreground hover:!text-foreground"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}

          {/* Suggested fix */}
          {comment.suggestedFix && (
            <div className="mt-2 rounded-lg bg-green-500/5 border border-green-500/10 px-2.5 py-1.5">
              <p className="text-[11px] font-semibold text-green-400 uppercase tracking-wide mb-0.5">
                Suggested Fix
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {comment.suggestedFix}
              </p>
            </div>
          )}

          {/* Medium confidence warning */}
          {comment.confidence === 'medium' && (
            <p className="mt-2 text-[11px] text-yellow-400 italic">
              Medium confidence -- please verify this finding
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
