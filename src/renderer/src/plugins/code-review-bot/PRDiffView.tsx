import React, { useState, useCallback, memo } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, Plus, Pencil, X } from 'lucide-react'
import type { DiffFile, DiffChange } from '../../types/bitbucket'
import type { ReviewComment, UserComment, UserCommentMap } from '../../types/review'
import { SEVERITY_CONFIG, KIND_CONFIG } from '../../types/review'
import { highlightCode } from '../../lib/highlight'
import { Button } from '@renderer/components/ui/button'

// ---------------------------------------------------------------------------
// Static lookup tables
// ---------------------------------------------------------------------------

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', sql: 'sql', json: 'json', yaml: 'yaml', yml: 'yaml',
  sh: 'bash', bash: 'bash', css: 'css', html: 'xml', xml: 'xml',
  md: 'markdown', diff: 'diff', java: 'java', kt: 'kotlin', go: 'go',
  rs: 'rust', rb: 'ruby', php: 'php', swift: 'swift', scala: 'scala'
}

function getLang(filePath: string): string | undefined {
  return EXT_TO_LANG[filePath.split('.').pop()?.toLowerCase() ?? '']
}

function getPathSegments(filePath: string): { dirs: string[]; file: string } {
  const parts = filePath.split('/')
  const file = parts.pop() ?? filePath
  return { dirs: parts, file }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PRDiffViewProps {
  diffFiles: DiffFile[]
  reviewComments: ReviewComment[]
  userComments?: UserCommentMap
  onAddUserComment?: (file: string, line: number, body: string) => void
  onDeleteUserComment?: (commentId: string) => void
  onUpdateUserComment?: (commentId: string, newBody: string) => void
  onCommentClick?: (comment: ReviewComment) => void
}

// ---------------------------------------------------------------------------
// InlineComposer — owns its own text state to prevent diff re-renders on keystrokes
// ---------------------------------------------------------------------------

interface InlineComposerProps {
  filePath: string
  lineNumber: number
  onSave: (file: string, line: number, body: string) => void
  onCancel: () => void
}

const InlineComposer = memo(function InlineComposer({
  filePath,
  lineNumber,
  onSave,
  onCancel,
}: InlineComposerProps): React.JSX.Element {
  const [text, setText] = useState('')
  const canSave = text.trim().length > 0

  const handleSave = useCallback(() => {
    if (canSave) onSave(filePath, lineNumber, text.trim())
  }, [canSave, filePath, lineNumber, text, onSave])

  return (
    <tr>
      <td colSpan={4} className="p-0">
        <div className="mx-3 my-2 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel()
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSave) handleSave()
            }}
            placeholder="Leave a comment…"
            rows={2}
            className="w-full resize-none bg-transparent px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          <div className="flex items-center gap-2 border-t border-white/[0.05] px-3 py-2">
            <Button size="sm" disabled={!canSave} onClick={handleSave}>
              Save comment
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </td>
    </tr>
  )
})

// ---------------------------------------------------------------------------
// UserCommentCard
// ---------------------------------------------------------------------------

interface UserCommentCardProps {
  comment: UserComment
  onDelete?: (id: string) => void
  onUpdate?: (id: string, newBody: string) => void
}

const UserCommentCard = memo(function UserCommentCard({
  comment,
  onDelete,
  onUpdate,
}: UserCommentCardProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.body)

  const handleSave = useCallback(() => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== comment.body) onUpdate?.(comment.id, trimmed)
    setIsEditing(false)
  }, [editText, comment.id, comment.body, onUpdate])

  const handleCancel = useCallback(() => {
    setEditText(comment.body)
    setIsEditing(false)
  }, [comment.body])

  return (
    <tr>
      <td colSpan={4} className="p-0">
        <div className="mx-3 my-1.5 overflow-hidden rounded-md border border-white/[0.06] border-l-2 border-l-amber-500/50 bg-white/[0.02]">
          {/* Header — mirrors AICommentCard header row */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="shrink-0 inline-flex items-center rounded-sm bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              You
            </span>
            {!isEditing && (
              <div className="ml-auto flex items-center gap-1">
                {onUpdate && (
                  <button
                    type="button"
                    onClick={() => { setEditText(comment.body); setIsEditing(true) }}
                    className="rounded p-0.5 text-muted-foreground/25 transition-colors hover:text-muted-foreground/60"
                    title="Edit"
                  >
                    <Pencil size={10} />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    className="rounded p-0.5 text-muted-foreground/25 transition-colors hover:text-rose-400/60"
                    title="Delete"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Body — mirrors AICommentCard body section */}
          <div className="border-t border-white/[0.04] px-3 py-2">
            {isEditing ? (
              <>
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancel()
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
                  }}
                  rows={2}
                  className="w-full resize-none bg-transparent px-0 py-0.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" disabled={!editText.trim()} onClick={handleSave}>
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-muted-foreground/80 whitespace-pre-wrap">
                {comment.body}
              </p>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
})

// ---------------------------------------------------------------------------
// AICommentCard
// ---------------------------------------------------------------------------

interface AICommentCardProps {
  comment: ReviewComment
  onPostClick?: (comment: ReviewComment) => void
}

const AICommentCard = memo(function AICommentCard({
  comment,
  onPostClick,
}: AICommentCardProps): React.JSX.Element {
  const sevConfig = SEVERITY_CONFIG[comment.severity]
  const kindConfig = KIND_CONFIG[comment.kind]

  return (
    <tr>
      <td colSpan={4} className="p-0">
        <div
          className={`mx-3 my-1.5 overflow-hidden rounded-md border border-white/[0.06] border-l-2 bg-white/[0.02] ${sevConfig.border}`}
        >
          {/* Header row */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className={`shrink-0 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${sevConfig.badge}`}>
              {sevConfig.emoji} {sevConfig.label}
            </span>
            <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-white/[0.05] text-muted-foreground/60">
              {kindConfig.icon} {kindConfig.label}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground/90">
              {comment.title}
            </span>
          </div>

          {/* Body */}
          <div className="border-t border-white/[0.04] px-3 py-2">
            <p className="text-[13px] leading-relaxed text-muted-foreground/80">
              {comment.body}
            </p>

            {/* Suggested fix */}
            {comment.suggestedFix && (
              <div className="mt-2 rounded-md border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
                <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-500/50">
                  Suggested fix
                </p>
                <p className="text-[11.5px] text-emerald-400/80 leading-relaxed">
                  {comment.suggestedFix}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-2 flex items-center gap-2">
              {!comment.posted && onPostClick && (
                <button
                  type="button"
                  onClick={() => onPostClick(comment)}
                  className="text-[11px] font-medium text-primary/80 transition-colors hover:text-primary"
                >
                  Post to Bitbucket
                </button>
              )}
              {comment.posted && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <Check size={10} strokeWidth={2.5} />
                  Posted
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
})


// ---------------------------------------------------------------------------
// PRDiffView
// ---------------------------------------------------------------------------

export function PRDiffView({
  diffFiles,
  reviewComments,
  userComments,
  onAddUserComment,
  onDeleteUserComment,
  onUpdateUserComment,
  onCommentClick,
}: PRDiffViewProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [viewed, setViewed] = useState<Record<string, boolean>>({})
  // Key = `${filePath}:${lineNumber}`
  const [activeComposerKey, setActiveComposerKey] = useState<string | null>(null)

  if (!diffFiles || diffFiles.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-muted-foreground/50">
        No diff loaded. Select a pull request to view changes.
      </p>
    )
  }

  const toggleFile = useCallback((filePath: string): void => {
    setCollapsed((prev) => ({ ...prev, [filePath]: !prev[filePath] }))
  }, [])

  const toggleViewed = useCallback((filePath: string): void => {
    setViewed((prev) => ({ ...prev, [filePath]: !prev[filePath] }))
  }, [])

  const toggleComposer = useCallback((key: string): void => {
    setActiveComposerKey((prev) => (prev === key ? null : key))
  }, [])

  const closeComposer = useCallback((): void => {
    setActiveComposerKey(null)
  }, [])

  const handleSaveComment = useCallback(
    (file: string, line: number, body: string) => {
      onAddUserComment?.(file, line, body)
      setActiveComposerKey(null)
    },
    [onAddUserComment]
  )

  const getCommentsForLine = (file: string, line: number): ReviewComment[] =>
    reviewComments.filter((c) => c.file === file && c.line === line)

  const getUserCommentsForLine = (file: string, line: number): UserComment[] =>
    userComments?.[`${file}:${line}`] ?? []

  const getLineNumbers = (change: DiffChange): { oldLn: number | null; newLn: number | null } => {
    if (change.type === 'add') return { oldLn: null, newLn: change.ln ?? null }
    if (change.type === 'del') return { oldLn: change.ln ?? null, newLn: null }
    return { oldLn: change.ln1 ?? null, newLn: change.ln2 ?? null }
  }

  return (
    <>
      <style>{DIFF_STYLES}</style>
      <div className="space-y-3 overflow-y-auto">
        {diffFiles.map((file) => {
          const filePath = file.to || file.from
          const isCollapsed = collapsed[filePath] ?? false
          const isViewed = viewed[filePath] ?? false
          const { dirs, file: fileName } = getPathSegments(filePath)

          // Determine file status accent
          const fileStatus =
            file.from === '/dev/null' ? 'added'
            : file.to === '/dev/null' ? 'deleted'
            : 'modified'

          return (
            <div
              key={filePath}
              className="diff-file-card overflow-hidden rounded-lg border border-white/[0.07] bg-[hsl(220,14%,6%)]"
              data-status={fileStatus}
            >
              {/* ── File header ──────────────────────────────────────── */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.025] px-3 py-1.5">
                <button
                  onClick={() => toggleFile(filePath)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Status dot */}
                <span
                  className={`shrink-0 h-1.5 w-1.5 rounded-full ${
                    fileStatus === 'added' ? 'bg-emerald-400 shadow-[0_0_6px_hsl(142,60%,50%,0.8)]'
                    : fileStatus === 'deleted' ? 'bg-rose-400 shadow-[0_0_6px_hsl(0,60%,55%,0.8)]'
                    : 'bg-blue-400 shadow-[0_0_6px_hsl(210,80%,60%,0.8)]'
                  }`}
                />

                {/* Breadcrumb */}
                <div className="min-w-0 flex-1 flex items-center gap-0.5 font-mono text-[12px] overflow-hidden">
                  {dirs.map((dir, i) => (
                    <span key={i} className="flex items-center gap-0.5 shrink-0">
                      <span className="text-muted-foreground/40">{dir}</span>
                      <span className="text-muted-foreground/25">/</span>
                    </span>
                  ))}
                  <span className="font-semibold text-foreground/90 truncate">{fileName}</span>
                </div>

                {/* Copy path */}
                <button
                  onClick={() => navigator.clipboard.writeText(filePath)}
                  className="shrink-0 rounded p-1 text-muted-foreground/25 transition-colors hover:text-muted-foreground/60"
                  title="Copy file path"
                >
                  <Copy size={11} />
                </button>

                {/* Stats */}
                <div className="shrink-0 flex items-center gap-1.5 font-mono text-[11px]">
                  {file.additions > 0 && (
                    <span className="text-emerald-400/80">+{file.additions}</span>
                  )}
                  {file.deletions > 0 && (
                    <span className="text-rose-400/80">-{file.deletions}</span>
                  )}
                </div>

                {/* Viewed toggle */}
                <label className="shrink-0 flex items-center gap-1.5 cursor-pointer select-none">
                  <span className="text-[10px] text-muted-foreground/40">Viewed</span>
                  <div
                    onClick={(e) => { e.stopPropagation(); toggleViewed(filePath) }}
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                      isViewed
                        ? 'border-emerald-500/50 bg-emerald-500/20 shadow-[0_0_6px_hsl(142,60%,50%,0.3)]'
                        : 'border-white/[0.12] bg-white/[0.03] hover:border-white/[0.22]'
                    }`}
                  >
                    {isViewed && <Check size={10} className="text-emerald-400" strokeWidth={3} />}
                  </div>
                </label>
              </div>

              {/* ── Diff table ───────────────────────────────────────── */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse font-mono text-[12px] leading-[20px]">
                    <tbody>
                      {file.chunks.map((chunk, chunkIdx) => (
                        <React.Fragment key={`chunk-${chunkIdx}`}>
                          {/* Chunk hunk header */}
                          <tr>
                            <td
                              colSpan={4}
                              className="bg-[hsl(212,50%,14%,0.4)] px-3 py-1 text-[10.5px] font-mono text-[hsl(212,70%,60%,0.7)] border-y border-white/[0.035] select-none"
                            >
                              {chunk.content}
                            </td>
                          </tr>

                          {chunk.changes.map((change, changeIdx) => {
                            const { oldLn, newLn } = getLineNumbers(change)
                            const activeLn = change.type === 'add' ? newLn : change.type === 'del' ? oldLn : newLn
                            const userCommentLn = change.type === 'del' ? null : newLn
                            const lineComments = activeLn != null ? getCommentsForLine(filePath, activeLn) : []
                            const userLineComments = userCommentLn != null ? getUserCommentsForLine(filePath, userCommentLn) : []
                            const composerKey = userCommentLn != null ? `${filePath}:${userCommentLn}` : null
                            const isComposerOpen = composerKey != null && activeComposerKey === composerKey

                            const rowBg =
                              change.type === 'add' ? 'bg-[hsl(142,50%,40%,0.10)]'
                              : change.type === 'del' ? 'bg-[hsl(0,50%,45%,0.10)]'
                              : ''
                            const gutterBg =
                              change.type === 'add' ? 'bg-[hsl(142,50%,40%,0.18)]'
                              : change.type === 'del' ? 'bg-[hsl(0,50%,45%,0.18)]'
                              : 'bg-white/[0.018]'
                            const prefixColor =
                              change.type === 'add' ? 'text-emerald-400'
                              : change.type === 'del' ? 'text-rose-400/80'
                              : 'text-transparent'
                            const lineNumColor =
                              change.type === 'normal' ? 'text-muted-foreground/30' : 'text-muted-foreground/55'

                            return (
                              <React.Fragment key={`line-${chunkIdx}-${changeIdx}`}>
                                <tr className={`group diff-row ${rowBg}`}>
                                  {/* Old line number */}
                                  <td
                                    className={`w-[1px] whitespace-nowrap select-none text-right px-2 py-0 ${gutterBg} ${lineNumColor} border-r border-white/[0.035]`}
                                  >
                                    {oldLn ?? ''}
                                  </td>

                                  {/* New line number — clickable, shows + icon on row hover */}
                                  <td
                                    className={`w-[1px] whitespace-nowrap select-none px-2 py-0 ${gutterBg} border-r border-white/[0.035] ${
                                      userCommentLn != null ? 'cursor-pointer' : ''
                                    }`}
                                    onClick={() => {
                                      if (composerKey == null) return
                                      toggleComposer(composerKey)
                                    }}
                                  >
                                    {userCommentLn != null ? (
                                      <span className="flex items-center justify-end gap-1">
                                        <Plus
                                          size={10}
                                          className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity text-muted-foreground"
                                        />
                                        <span className={lineNumColor}>{newLn ?? ''}</span>
                                      </span>
                                    ) : (
                                      <span className={`text-right block ${lineNumColor}`}>{newLn ?? ''}</span>
                                    )}
                                  </td>

                                  {/* +/- prefix */}
                                  <td
                                    className={`w-[1px] select-none pl-2 pr-1 font-bold ${prefixColor}`}
                                  >
                                    {change.type === 'add' ? '+' : change.type === 'del' ? '-' : ' '}
                                  </td>

                                  {/* Code content */}
                                  <td className="whitespace-pre pr-4">
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: highlightCode(
                                          change.content.replace(/^[+-]/, ''),
                                          getLang(filePath)
                                        ),
                                      }}
                                    />
                                  </td>
                                </tr>

                                {/* AI comment cards */}
                                {lineComments.map((comment, commentIdx) => (
                                  <AICommentCard
                                    key={`ai-${commentIdx}`}
                                    comment={comment}
                                    onPostClick={onCommentClick}
                                  />
                                ))}

                                {/* User comment cards */}
                                {userLineComments.map((uc) => (
                                  <UserCommentCard
                                    key={uc.id}
                                    comment={uc}
                                    onDelete={onDeleteUserComment}
                                    onUpdate={onUpdateUserComment}
                                  />
                                ))}

                                {/* Inline composer */}
                                {isComposerOpen && (
                                  <InlineComposer
                                    filePath={filePath}
                                    lineNumber={userCommentLn!}
                                    onSave={handleSaveComment}
                                    onCancel={closeComposer}
                                  />
                                )}
                              </React.Fragment>
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Static styles (defined once, not inside render)
// ---------------------------------------------------------------------------

const DIFF_STYLES = `
  .diff-file-card[data-status="added"] {
    box-shadow: -2px 0 0 hsl(142, 60%, 45%, 0.5);
  }
  .diff-file-card[data-status="deleted"] {
    box-shadow: -2px 0 0 hsl(0, 60%, 55%, 0.5);
  }
  .diff-file-card[data-status="modified"] {
    box-shadow: -2px 0 0 hsl(210, 80%, 60%, 0.4);
  }
  .diff-row td {
    padding-top: 0;
    padding-bottom: 0;
    line-height: 20px;
  }
`
