import React, { useState, useCallback, memo } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, Plus, MessageSquare } from 'lucide-react'
import type { DiffFile, DiffChange } from '../../types/bitbucket'
import type { ReviewComment, UserComment, UserCommentMap } from '../../types/review'
import { SEVERITY_CONFIG, KIND_CONFIG } from '../../types/review'
import { highlightCode } from '../../lib/highlight'
import { Button } from '@renderer/components/ui/button'

// ---------------------------------------------------------------------------
// Static lookup tables
// ---------------------------------------------------------------------------

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  sql: 'sql',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  css: 'css',
  html: 'xml',
  xml: 'xml',
  md: 'markdown',
  diff: 'diff',
  java: 'java',
  kt: 'kotlin',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  scala: 'scala'
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
  onCommentClick?: (comment: ReviewComment) => void
}

// ---------------------------------------------------------------------------
// InlineComposer — isolated memo: owns text state, zero parent re-renders
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
  onCancel
}: InlineComposerProps): React.JSX.Element {
  const [text, setText] = useState('')
  const trimmed = text.trim()

  const handleSave = useCallback(() => {
    if (trimmed) onSave(filePath, lineNumber, trimmed)
  }, [trimmed, filePath, lineNumber, onSave])

  return (
    <tr>
      <td colSpan={4} className="p-0">
        <div className="mx-0 border-y border-white/[0.06] bg-[hsl(220,14%,8%)]">
          {/* Left accent bar matching line gutter width */}
          <div className="flex">
            <div className="w-[80px] shrink-0 border-r border-white/[0.06] bg-white/[0.02]" />
            <div className="flex-1 py-2 pr-3 pl-3">
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    onCancel()
                  }
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && trimmed) {
                    e.preventDefault()
                    handleSave()
                  }
                }}
                placeholder="Add a note on this line…"
                rows={2}
                className="w-full resize-none bg-transparent text-[12.5px] text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none leading-relaxed"
              />
              <div className="mt-1.5 flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-6 px-2.5 text-[11px]"
                  disabled={!trimmed}
                  onClick={handleSave}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground/25 tabular-nums select-none">
                  ⌘↵ save · esc cancel
                </span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
})

// ---------------------------------------------------------------------------
// UserCommentCard — compact read-only chip, expandable
// ---------------------------------------------------------------------------

interface UserCommentCardProps {
  comment: UserComment
  onDelete?: (id: string) => void
}

const UserCommentCard = memo(function UserCommentCard({
  comment,
  onDelete
}: UserCommentCardProps): React.JSX.Element {
  return (
    <tr>
      <td colSpan={4} className="p-0">
        <div className="flex border-b border-white/[0.04]">
          {/* Gutter indent */}
          <div className="w-[80px] shrink-0 border-r border-white/[0.04] bg-white/[0.015]" />
          {/* Comment body */}
          <div className="group flex flex-1 items-start gap-2 px-3 py-1.5 bg-amber-500/[0.04]">
            <span className="mt-0.5 shrink-0 inline-flex items-center rounded bg-amber-500/10 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-amber-400/80">
              You
            </span>
            <p className="flex-1 text-[12px] leading-relaxed text-foreground/70 whitespace-pre-wrap">
              {comment.body}
            </p>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="mt-0.5 shrink-0 text-[10px] text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/30 hover:!text-rose-400/70"
                title="Delete"
                aria-label="Delete comment"
              >
                ✕
              </button>
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

const SEV_ACCENT: Record<string, string> = {
  blocking: 'border-l-rose-500/70   bg-rose-500/[0.04]',
  important: 'border-l-orange-500/60 bg-orange-500/[0.03]',
  suggestion: 'border-l-blue-500/50   bg-blue-500/[0.03]',
  info: 'border-l-zinc-500/40   bg-white/[0.015]'
}

const AICommentCard = memo(function AICommentCard({
  comment,
  onPostClick
}: AICommentCardProps): React.JSX.Element {
  const sevConfig = SEVERITY_CONFIG[comment.severity]
  const kindConfig = KIND_CONFIG[comment.kind]

  return (
    <tr>
      <td colSpan={4} className="p-0">
        <div className="flex border-b border-white/[0.04]">
          <div className="w-[80px] shrink-0 border-r border-white/[0.04] bg-white/[0.015]" />
          <div className={`flex-1 border-l-2 px-3 py-2 ${SEV_ACCENT[comment.severity]}`}>
            {/* Meta row */}
            <div className="mb-1 flex items-center gap-1.5">
              <span
                className={`text-[10px] font-semibold ${sevConfig.badge
                  .split(' ')
                  .filter((c) => c.startsWith('text-'))
                  .join(' ')}`}
              >
                {sevConfig.label}
              </span>
              <span className="text-muted-foreground/25 text-[10px]">·</span>
              <span className="text-[10px] text-muted-foreground/45">{kindConfig.label}</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground/30">
                :{comment.line}
              </span>
            </div>

            {/* Title + body */}
            <p className="text-[12px] font-medium text-foreground/85 leading-snug">
              {comment.title}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground/65">
              {comment.body}
            </p>

            {/* Suggested fix */}
            {comment.suggestedFix && (
              <div className="mt-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-1.5">
                <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-500/50">
                  Fix
                </p>
                <p className="text-[11.5px] text-emerald-400/75 leading-relaxed">
                  {comment.suggestedFix}
                </p>
              </div>
            )}

            {/* Action */}
            <div className="mt-1.5">
              {!comment.posted && onPostClick && (
                <button
                  type="button"
                  onClick={() => onPostClick(comment)}
                  className="text-[11px] font-medium text-primary/70 transition-colors hover:text-primary"
                >
                  Post to Bitbucket →
                </button>
              )}
              {comment.posted && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400/70">
                  <Check size={9} strokeWidth={2.5} /> Posted
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
  onCommentClick
}: PRDiffViewProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [viewed, setViewed] = useState<Record<string, boolean>>({})
  const [activeComposerKey, setActiveComposerKey] = useState<string | null>(null)

  // All hooks before early return
  const toggleFile = useCallback((path: string) => {
    setCollapsed((p) => ({ ...p, [path]: !p[path] }))
  }, [])

  const toggleViewed = useCallback((path: string) => {
    setViewed((p) => ({ ...p, [path]: !p[path] }))
  }, [])

  const openComposer = useCallback((key: string) => {
    setActiveComposerKey((p) => (p === key ? null : key))
  }, [])

  const closeComposer = useCallback(() => setActiveComposerKey(null), [])

  const handleSave = useCallback(
    (file: string, line: number, body: string) => {
      onAddUserComment?.(file, line, body)
      setActiveComposerKey(null)
    },
    [onAddUserComment]
  )

  if (!diffFiles || diffFiles.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-muted-foreground/40">
        No diff loaded. Select a pull request to view changes.
      </p>
    )
  }

  const getAIComments = (file: string, line: number): ReviewComment[] =>
    reviewComments.filter((c) => c.file === file && c.line === line)

  const getUserComments = (file: string, line: number): UserComment[] =>
    userComments?.[`${file}:${line}`] ?? []

  const getLineNumbers = (change: DiffChange): { oldLn: number | null; newLn: number | null } => {
    if (change.type === 'add') return { oldLn: null, newLn: change.ln ?? null }
    if (change.type === 'del') return { oldLn: change.ln ?? null, newLn: null }
    return { oldLn: change.ln1 ?? null, newLn: change.ln2 ?? null }
  }

  return (
    <>
      <style>{DIFF_STYLES}</style>
      <div className="space-y-2">
        {diffFiles.map((file) => {
          const filePath = file.to || file.from
          const isCollapsed = collapsed[filePath] ?? false
          const isViewed = viewed[filePath] ?? false
          const { dirs, file: fileName } = getPathSegments(filePath)

          const fileStatus =
            file.from === '/dev/null' ? 'added' : file.to === '/dev/null' ? 'deleted' : 'modified'

          // Count AI comments for this file
          const aiCount = reviewComments.filter((c) => c.file === filePath).length
          const userCount = Object.entries(userComments ?? {})
            .filter(([k]) => k.startsWith(`${filePath}:`))
            .reduce((sum, [, arr]) => sum + arr.length, 0)

          return (
            <div
              key={filePath}
              className="overflow-hidden rounded-xl border border-white/[0.07] bg-[hsl(220,14%,6%)]"
            >
              {/* ── File header ── */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-2 py-1">
                <button
                  onClick={() => toggleFile(filePath)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-foreground"
                  aria-label={isCollapsed ? 'Expand file' : 'Collapse file'}
                >
                  {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                </button>

                {/* Status glyph */}
                <span
                  className={`shrink-0 font-mono text-[10.5px] font-bold tabular-nums ${
                    fileStatus === 'added'
                      ? 'text-emerald-400/70'
                      : fileStatus === 'deleted'
                        ? 'text-rose-400/70'
                        : 'text-muted-foreground/35'
                  }`}
                >
                  {fileStatus === 'added' ? 'A' : fileStatus === 'deleted' ? 'D' : 'M'}
                </span>

                {/* Breadcrumb */}
                <div className="min-w-0 flex-1 flex items-center overflow-hidden font-mono text-[11.5px]">
                  {dirs.map((dir, i) => (
                    <span key={i} className="flex shrink-0 items-center">
                      <span className="text-muted-foreground/30">{dir}</span>
                      <span className="text-muted-foreground/20">/</span>
                    </span>
                  ))}
                  <span className="truncate font-medium text-foreground/80">{fileName}</span>
                </div>

                {/* Comment count badges */}
                {(aiCount > 0 || userCount > 0) && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    {aiCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                        <MessageSquare size={9} />
                        {aiCount}
                      </span>
                    )}
                    {userCount > 0 && (
                      <span className="text-[10px] text-amber-400/50">
                        {userCount} note{userCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Diff stats */}
                <div className="shrink-0 flex items-center gap-1 font-mono text-[11px]">
                  {file.additions > 0 && (
                    <span className="text-emerald-400/70">+{file.additions}</span>
                  )}
                  {file.deletions > 0 && (
                    <span className="text-rose-400/70">-{file.deletions}</span>
                  )}
                </div>

                {/* Copy path */}
                <button
                  onClick={() => navigator.clipboard.writeText(filePath)}
                  className="shrink-0 rounded p-1 text-muted-foreground/20 transition-colors hover:text-muted-foreground/55"
                  title="Copy path"
                  aria-label="Copy file path"
                >
                  <Copy size={10} />
                </button>

                {/* Viewed */}
                <div
                  role="checkbox"
                  aria-checked={isViewed}
                  aria-label="Mark as viewed"
                  onClick={() => toggleViewed(filePath)}
                  className={`flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded border transition-all ${
                    isViewed
                      ? 'border-emerald-500/40 bg-emerald-500/15'
                      : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2]'
                  }`}
                >
                  {isViewed && <Check size={10} className="text-emerald-400" strokeWidth={3} />}
                </div>
              </div>

              {/* ── Diff table ── */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse font-mono text-[12px] leading-[20px]">
                    <colgroup>
                      {/* old ln, new ln, prefix, code */}
                      <col className="w-10" />
                      <col className="w-10" />
                      <col className="w-[18px]" />
                      <col />
                    </colgroup>
                    <tbody>
                      {file.chunks.map((chunk, ci) => (
                        <React.Fragment key={`chunk-${ci}`}>
                          <tr>
                            <td
                              colSpan={4}
                              className="bg-[hsl(212,45%,13%,0.35)] px-3 py-0.5 text-[10.5px] text-[hsl(212,60%,58%,0.6)] border-y border-white/[0.03] select-none"
                            >
                              {chunk.content}
                            </td>
                          </tr>

                          {chunk.changes.map((change, li) => {
                            const { oldLn, newLn } = getLineNumbers(change)
                            const activeLn =
                              change.type === 'add' ? newLn : change.type === 'del' ? oldLn : newLn
                            const userCommentLn = change.type === 'del' ? null : newLn
                            const aiComments =
                              activeLn != null ? getAIComments(filePath, activeLn) : []
                            const userLineComments =
                              userCommentLn != null ? getUserComments(filePath, userCommentLn) : []
                            const composerKey =
                              userCommentLn != null ? `${filePath}:${userCommentLn}` : null
                            const composerOpen =
                              composerKey != null && activeComposerKey === composerKey
                            const hasAnnotations =
                              aiComments.length > 0 || userLineComments.length > 0

                            const rowBg =
                              change.type === 'add'
                                ? 'bg-[hsl(142,45%,38%,0.09)]'
                                : change.type === 'del'
                                  ? 'bg-[hsl(0,45%,42%,0.09)]'
                                  : ''
                            const gutterBg =
                              change.type === 'add'
                                ? 'bg-[hsl(142,45%,38%,0.15)]'
                                : change.type === 'del'
                                  ? 'bg-[hsl(0,45%,42%,0.15)]'
                                  : 'bg-white/[0.016]'
                            const prefixColor =
                              change.type === 'add'
                                ? 'text-emerald-500/70'
                                : change.type === 'del'
                                  ? 'text-rose-500/60'
                                  : 'text-transparent'
                            const lnColor =
                              change.type === 'normal'
                                ? 'text-muted-foreground/25'
                                : 'text-muted-foreground/50'

                            return (
                              <React.Fragment key={`line-${ci}-${li}`}>
                                <tr
                                  className={`group diff-row ${rowBg} ${hasAnnotations ? 'diff-row--annotated' : ''}`}
                                >
                                  {/* Old line number */}
                                  <td
                                    className={`select-none text-right pr-2 pl-1 py-0 ${gutterBg} ${lnColor} border-r border-white/[0.03]`}
                                  >
                                    {oldLn ?? ''}
                                  </td>

                                  {/* New line number — clickable for composer */}
                                  <td
                                    className={`select-none py-0 pl-1 ${gutterBg} border-r border-white/[0.03] ${
                                      userCommentLn != null ? 'cursor-pointer' : ''
                                    }`}
                                    onClick={() => composerKey && openComposer(composerKey)}
                                    title={userCommentLn != null ? 'Add note' : undefined}
                                  >
                                    <span className="flex items-center justify-end gap-0.5 pr-2">
                                      {/* + affordance: always faintly visible, stronger on hover */}
                                      {userCommentLn != null && (
                                        <Plus
                                          size={8}
                                          className={`shrink-0 transition-opacity ${
                                            composerOpen
                                              ? 'opacity-60 text-primary'
                                              : 'opacity-20 text-muted-foreground group-hover:opacity-50'
                                          }`}
                                        />
                                      )}
                                      <span className={lnColor}>{newLn ?? ''}</span>
                                    </span>
                                  </td>

                                  {/* Prefix */}
                                  <td
                                    className={`select-none pl-1.5 pr-0.5 font-bold ${prefixColor}`}
                                  >
                                    {change.type === 'add'
                                      ? '+'
                                      : change.type === 'del'
                                        ? '-'
                                        : ' '}
                                  </td>

                                  {/* Code */}
                                  <td className="whitespace-pre pr-4 pl-1">
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: highlightCode(
                                          change.content.replace(/^[+-]/, ''),
                                          getLang(filePath)
                                        )
                                      }}
                                    />
                                  </td>
                                </tr>

                                {/* AI findings */}
                                {aiComments.map((c, ci2) => (
                                  <AICommentCard
                                    key={`ai-${ci2}`}
                                    comment={c}
                                    onPostClick={onCommentClick}
                                  />
                                ))}

                                {/* User notes */}
                                {userLineComments.map((uc) => (
                                  <UserCommentCard
                                    key={uc.id}
                                    comment={uc}
                                    onDelete={onDeleteUserComment}
                                  />
                                ))}

                                {/* Inline composer */}
                                {composerOpen && (
                                  <InlineComposer
                                    filePath={filePath}
                                    lineNumber={userCommentLn!}
                                    onSave={handleSave}
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
// Static styles
// ---------------------------------------------------------------------------

const DIFF_STYLES = `
  .diff-row td {
    padding-top: 0;
    padding-bottom: 0;
    line-height: 20px;
  }
  .diff-row--annotated {
    border-left: 1px solid hsl(48, 60%, 50%, 0.25);
  }
  .diff-row:hover td:first-child,
  .diff-row:hover td:nth-child(2) {
    background-color: hsl(220, 14%, 10%, 0.6);
  }
`
