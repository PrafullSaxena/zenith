import React, { useState, useCallback, memo } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, Plus, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
// Elevated InlineComposer
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
      <td colSpan={4} className="p-0 border-none bg-transparent">
        <motion.div
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="mx-4 my-2 overflow-hidden rounded-xl border border-primary/30 shadow-lg shadow-black/40 bg-[hsl(224,20%,12%)] relative z-10"
        >
          <div className="flex flex-col p-3">
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
              placeholder="Add a custom review note..."
              rows={3}
              className="w-full resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 leading-relaxed"
            />
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2">
              <span className="font-mono text-[11px] text-muted-foreground/50 select-none">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-sans shadow-sm mr-1">⌘</kbd>
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-sans shadow-sm">↵</kbd> save
                &nbsp;&middot;&nbsp; 
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-sans shadow-sm">esc</kbd> cancel
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-[12px] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-4 text-[12px] bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!trimmed}
                  onClick={handleSave}
                >
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
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
}

const UserCommentCard = memo(function UserCommentCard({
  comment,
  onDelete
}: UserCommentCardProps): React.JSX.Element {
  return (
    <tr>
      <td colSpan={4} className="p-0 border-none bg-transparent">
        <div className="mx-4 my-1.5 flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 shadow-none">
          <span className="mt-0.5 shrink-0 inline-flex items-center rounded-sm bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-none">
            You
          </span>
          <p className="flex-1 text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {comment.body}
          </p>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="mt-0.5 shrink-0 rounded-sm p-1 text-muted-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground"
              title="Delete"
              aria-label="Delete comment"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          )}
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
  blocking: 'border-l-fuchsia-500 bg-white/[0.02] border-y-white/5 border-r-white/5',
  important: 'border-l-amber-500 bg-white/[0.02] border-y-white/5 border-r-white/5',
  suggestion: 'border-l-sky-500 bg-white/[0.02] border-y-white/5 border-r-white/5',
  info: 'border-l-slate-400 bg-white/[0.02] border-y-white/5 border-r-white/5'
}

const AICommentCard = memo(function AICommentCard({
  comment,
  onPostClick
}: AICommentCardProps): React.JSX.Element {
  const sevConfig = SEVERITY_CONFIG[comment.severity]
  const kindConfig = KIND_CONFIG[comment.kind]

  return (
    <tr>
      <td colSpan={4} className="p-0 border-none bg-transparent">
        <div className={`mx-4 my-1.5 flex flex-col rounded-lg border-y border-r border-l-2 shadow-none px-4 py-3 ${SEV_ACCENT[comment.severity]}`}>
          {/* Meta row */}
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevConfig.badge
                .split(' ')
                .filter((c) => c.startsWith('text-') || c.startsWith('bg-'))
                .join(' ')}`}
            >
              {sevConfig.label}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground/60 bg-white/5 px-1.5 py-0.5 rounded">{kindConfig.label}</span>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground/40">
              Line {comment.line}
            </span>
          </div>

          {/* Title + body */}
          <p className="text-[14px] font-semibold text-foreground/90 leading-snug mb-1">
            {comment.title}
          </p>
          <p className="text-[13px] leading-relaxed text-foreground/75">
            {comment.body}
          </p>

          {/* Suggested fix */}
          {comment.suggestedFix && (
            <div className="mt-3 overflow-hidden rounded-md border border-white/10 bg-black/40 relative">
              <span className="absolute top-0 right-0 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground rounded-bl-md">
                SUGGESTED FIX
              </span>
              <pre className="p-3 text-[12px] font-mono text-foreground/80 overflow-x-auto">
                {comment.suggestedFix}
              </pre>
            </div>
          )}

          {/* Action */}
          <div className="mt-3 flex items-center">
            {!comment.posted && onPostClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPostClick(comment)}
                className="h-7 text-[11px] font-semibold text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                Post to Bitbucket <ChevronRight size={14} className="ml-1" />
              </Button>
            )}
            {comment.posted && (
              <span className="flex items-center gap-1 text-[12px] font-medium text-foreground/70">
                <Check size={14} strokeWidth={3} className="bg-white/10 rounded-full p-0.5" /> 
                Successfully Posted
              </span>
            )}
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
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg className="w-12 h-12 text-muted-foreground/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-[14px] font-medium text-foreground/60">No diff loaded</p>
        <p className="text-[13px] text-muted-foreground/50 mt-1">Select a pull request to review changes.</p>
      </div>
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
      <div className="space-y-4 px-1 py-2">
        {diffFiles.map((file) => {
          const filePath = file.to || file.from
          const isCollapsed = collapsed[filePath] ?? false
          const isViewed = viewed[filePath] ?? false
          const { dirs, file: fileName } = getPathSegments(filePath)

          const fileStatus =
            file.from === '/dev/null' ? 'added' : file.to === '/dev/null' ? 'deleted' : 'modified'

          const aiCount = reviewComments.filter((c) => c.file === filePath).length
          const userCount = Object.entries(userComments ?? {})
            .filter(([k]) => k.startsWith(`${filePath}:`))
            .reduce((sum, [, arr]) => sum + arr.length, 0)

          return (
            <div
              key={filePath}
              className={`overflow-hidden rounded-xl border transition-colors bg-[hsl(220,12%,7%)] shadow-sm ${
                isViewed ? 'border-emerald-500/20' : 'border-white/[0.08]'
              }`}
            >
              {/* ── File header ── */}
              <div className="flex items-center gap-3 border-b border-black/20 bg-black/40 px-3 py-2">
                <button
                  onClick={() => toggleFile(filePath)}
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  aria-label={isCollapsed ? 'Expand file' : 'Collapse file'}
                >
                  {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                </button>

                {/* Status glyph */}
                <div
                  className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-sm font-mono text-[11px] font-bold ${
                    fileStatus === 'added'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : fileStatus === 'deleted'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {fileStatus === 'added' ? 'A' : fileStatus === 'deleted' ? 'D' : 'M'}
                </div>

                {/* Breadcrumb */}
                <div className="min-w-0 flex-1 flex items-center overflow-hidden font-mono text-[13px]">
                  {dirs.map((dir, i) => (
                    <span key={i} className="flex shrink-0 items-center">
                      <span className="text-muted-foreground/40">{dir}</span>
                      <span className="text-muted-foreground/20 mx-1">/</span>
                    </span>
                  ))}
                  <span className="truncate font-semibold text-foreground/90">{fileName}</span>
                </div>

                {/* Comment count badges */}
                {(aiCount > 0 || userCount > 0) && (
                  <div className="shrink-0 flex items-center gap-2 px-3 border-l border-white/10">
                    {aiCount > 0 && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/70 bg-white/5 px-2 py-0.5 rounded-full">
                        <MessageSquare size={12} className="text-primary/70" />
                        {aiCount}
                      </span>
                    )}
                    {userCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        {userCount} note{userCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Diff stats */}
                <div className="shrink-0 flex items-center gap-2 font-mono text-[12px] font-medium px-3 border-l border-white/10">
                  {file.additions > 0 && (
                    <span className="text-emerald-400">+{file.additions}</span>
                  )}
                  {file.deletions > 0 && (
                    <span className="text-rose-400">-{file.deletions}</span>
                  )}
                </div>

                {/* Copy path */}
                <button
                  onClick={() => navigator.clipboard.writeText(filePath)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground/40 transition-colors hover:bg-white/10 hover:text-foreground"
                  title="Copy path"
                  aria-label="Copy file path"
                >
                  <Copy size={13} />
                </button>

                {/* Viewed Checkback */}
                <button
                  role="checkbox"
                  aria-checked={isViewed}
                  aria-label="Mark as viewed"
                  onClick={() => toggleViewed(filePath)}
                  className={`flex h-6 px-2 text-[11px] font-semibold shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border transition-all ${
                    isViewed
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                      : 'border-white/[0.1] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]'
                  }`}
                >
                  {isViewed && <Check size={12} strokeWidth={3} />}
                  {isViewed ? 'Viewed' : 'Mark Viewed'}
                </button>
              </div>

              {/* ── Diff table ── */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-x-auto overflow-y-hidden"
                  >
                    <table className="w-full border-collapse font-mono text-[13px] leading-[22px]">
                      <colgroup>
                        <col className="w-12" />
                        <col className="w-12" />
                        <col className="w-[20px]" />
                        <col />
                      </colgroup>
                      <tbody>
                        {file.chunks.map((chunk, ci) => (
                          <React.Fragment key={`chunk-${ci}`}>
                            <tr>
                              <td
                                colSpan={4}
                                className="bg-[hsl(215,30%,12%,0.5)] px-4 py-1.5 text-[11px] text-[hsl(215,50%,65%,0.8)] border-y border-white/[0.04] select-none text-center tracking-widest font-semibold"
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

                              const rowBg =
                                change.type === 'add'
                                  ? 'bg-[hsl(142,45%,38%,0.1)]'
                                  : change.type === 'del'
                                    ? 'bg-[hsl(0,45%,42%,0.1)]'
                                    : ''
                              const gutterBg =
                                change.type === 'add'
                                  ? 'bg-[hsl(142,45%,38%,0.15)]'
                                  : change.type === 'del'
                                    ? 'bg-[hsl(0,45%,42%,0.15)]'
                                    : 'bg-black/20'
                              const prefixColor =
                                change.type === 'add'
                                  ? 'text-emerald-500/80 font-bold'
                                  : change.type === 'del'
                                    ? 'text-rose-500/80 font-bold'
                                    : 'text-transparent'
                              const lnColor =
                                change.type === 'normal'
                                  ? 'text-muted-foreground/30'
                                  : 'text-muted-foreground/60'

                              return (
                                <React.Fragment key={`line-${ci}-${li}`}>
                                  <tr
                                    className={`group diff-row ${rowBg} hover:bg-white/[0.04] cursor-text`}
                                  >
                                    {/* Old line number */}
                                    <td
                                      className={`relative select-none text-right pr-3 pl-2 py-0 border-r border-white/[0.04] ${gutterBg} ${lnColor}`}
                                    >
                                      {/* Hover affordance border indicator */}
                                      {userCommentLn != null && (
                                        <div className="absolute inset-y-0 left-0 w-1 bg-primary/0 group-hover:bg-primary transition-colors cursor-pointer" onClick={() => composerKey && openComposer(composerKey)}></div>
                                      )}
                                      {oldLn ?? ''}
                                    </td>

                                    {/* New line number — clickable for composer */}
                                    <td
                                      className={`relative select-none py-0 pl-2 pr-3 border-r border-white/[0.04] text-right ${gutterBg} ${
                                        userCommentLn != null ? 'cursor-pointer' : ''
                                      }`}
                                      onClick={() => composerKey && openComposer(composerKey)}
                                      title={userCommentLn != null ? 'Click to add a note' : undefined}
                                    >
                                      <div className="flex items-center justify-end">
                                        <Plus
                                          size={12}
                                          className={`absolute left-2 shrink-0 transition-all ${
                                            composerOpen
                                              ? 'opacity-100 text-primary scale-110'
                                              : 'opacity-0 text-primary group-hover:opacity-100'
                                          }`}
                                        />
                                        <span className={lnColor}>{newLn ?? ''}</span>
                                      </div>
                                    </td>

                                    {/* Prefix */}
                                    <td
                                      className={`select-none pl-2.5 pr-1 font-bold ${prefixColor}`}
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
                                        className={change.type === 'add' ? 'text-emerald-100' : change.type === 'del' ? 'text-rose-100/80' : 'text-foreground/90'}
                                        dangerouslySetInnerHTML={{
                                          __html: highlightCode(
                                            change.content.replace(/^[+-]/, ''),
                                            getLang(filePath)
                                          )
                                        }}
                                      />
                                    </td>
                                  </tr>

                                  <AnimatePresence>
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
                                  </AnimatePresence>
                                </React.Fragment>
                              )
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Static styles remain minimal, handled mostly via Tailwind
// ---------------------------------------------------------------------------

const DIFF_STYLES = `
  .diff-row td {
    padding-top: 0;
    padding-bottom: 0;
    line-height: 22px;
  }
  .diff-row:hover td:first-child .absolute.inset-y-0.left-0 {
    width: 3px;
  }
`
