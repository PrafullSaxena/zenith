import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, MessageSquarePlus } from 'lucide-react'
import type { DiffFile, DiffChange } from '../../types/bitbucket'
import type { ReviewComment, UserComment, UserCommentMap } from '../../types/review'
import { SEVERITY_CONFIG, KIND_CONFIG } from '../../types/review'
import { highlightCode } from '../../lib/highlight'

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', sql: 'sql', json: 'json', yaml: 'yaml', yml: 'yaml',
  sh: 'bash', bash: 'bash', css: 'css', html: 'xml', xml: 'xml',
  md: 'markdown', diff: 'diff', java: 'java', kt: 'kotlin', go: 'go',
  rs: 'rust', rb: 'ruby', php: 'php', swift: 'swift', scala: 'scala'
}

function getLang(filePath: string): string | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext]
}

/** Extract the short filename from a path for display. */
function getFileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath
}

/** Build breadcrumb segments from file path. */
function getPathSegments(filePath: string): { dirs: string[]; file: string } {
  const parts = filePath.split('/')
  const file = parts.pop() ?? filePath
  return { dirs: parts, file }
}

interface PRDiffViewProps {
  diffFiles: DiffFile[]
  reviewComments: ReviewComment[]
  userComments?: UserCommentMap
  onAddUserComment?: (file: string, line: number, body: string) => void
  onDeleteUserComment?: (commentId: string) => void
  onCommentClick?: (comment: ReviewComment) => void
}

/**
 * GitHub-style unified diff viewer.
 * Renders file-by-file diffs with dual line numbers (old/new),
 * syntax-colored additions/deletions, and inline AI review comment cards.
 * Also supports user-authored inline annotations with an amber "You" badge.
 */
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
  const [composerText, setComposerText] = useState('')

  if (!diffFiles || diffFiles.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-muted-foreground">
        No diff loaded. Select a pull request to view changes.
      </p>
    )
  }

  const toggleFile = (filePath: string): void => {
    setCollapsed((prev) => ({ ...prev, [filePath]: !prev[filePath] }))
  }

  const toggleViewed = (filePath: string): void => {
    setViewed((prev) => ({ ...prev, [filePath]: !prev[filePath] }))
  }

  /** Find review comments for a specific file and line number. */
  const getCommentsForLine = (file: string, line: number): ReviewComment[] => {
    return reviewComments.filter((c) => c.file === file && c.line === line)
  }

  /** Find user comments for a specific file and line number. */
  const getUserCommentsForLine = (file: string, line: number): UserComment[] => {
    if (!userComments) return []
    return userComments[`${file}:${line}`] ?? []
  }

  /** Get old and new line numbers for a change. */
  const getLineNumbers = (
    change: DiffChange
  ): { oldLn: number | null; newLn: number | null } => {
    if (change.type === 'add') return { oldLn: null, newLn: change.ln ?? null }
    if (change.type === 'del') return { oldLn: change.ln ?? null, newLn: null }
    return { oldLn: change.ln1 ?? null, newLn: change.ln2 ?? null }
  }

  return (
    <div className="space-y-3 overflow-y-auto">
      {diffFiles.map((file) => {
        const filePath = file.to || file.from
        const isCollapsed = collapsed[filePath] ?? false
        const isViewed = viewed[filePath] ?? false
        const { dirs, file: fileName } = getPathSegments(filePath)

        return (
          <div
            key={filePath}
            className="overflow-hidden rounded-lg border border-white/[0.08] bg-[hsl(220,13%,7%)]"
          >
            {/* ── File header ──────────────────────────────────────── */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
              {/* Collapse toggle */}
              <button
                onClick={() => toggleFile(filePath)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition"
              >
                {isCollapsed ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>

              {/* File path breadcrumb */}
              <div className="min-w-0 flex-1 flex items-center gap-0.5 font-mono text-[12px] overflow-hidden">
                {dirs.map((dir, i) => (
                  <span key={i} className="flex items-center gap-0.5 shrink-0">
                    <span className="text-muted-foreground/60">{dir}</span>
                    <span className="text-muted-foreground/40">/</span>
                  </span>
                ))}
                <span className="font-medium text-foreground truncate">
                  {fileName}
                </span>
              </div>

              {/* Copy path */}
              <button
                onClick={() => navigator.clipboard.writeText(filePath)}
                className="shrink-0 rounded p-1 text-muted-foreground/40 hover:text-muted-foreground transition"
                title="Copy file path"
              >
                <Copy size={12} />
              </button>

              {/* Stats */}
              <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-mono">
                {file.additions > 0 && (
                  <span className="text-[hsl(142,71%,55%)]">+{file.additions}</span>
                )}
                {file.deletions > 0 && (
                  <span className="text-[hsl(0,63%,65%)]">-{file.deletions}</span>
                )}
              </div>

              {/* Viewed checkbox */}
              <label className="shrink-0 flex items-center gap-1.5 cursor-pointer select-none">
                <span className="text-[11px] text-muted-foreground">Viewed</span>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleViewed(filePath)
                  }}
                  className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                    isViewed
                      ? 'border-primary bg-primary'
                      : 'border-white/[0.15] bg-white/[0.04] hover:border-white/[0.25]'
                  }`}
                >
                  {isViewed && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
                </div>
              </label>
            </div>

            {/* ── Diff content ─────────────────────────────────────── */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-mono text-[12px] leading-[20px]">
                  <tbody>
                    {file.chunks.map((chunk, chunkIdx) => (
                      <>
                        {/* Chunk header — @@ -620,14 +620,14 @@ ... */}
                        <tr key={`chunk-${chunkIdx}`}>
                          <td
                            colSpan={4}
                            className="bg-[hsl(212,60%,16%/0.3)] px-3 py-1 text-[11px] text-[hsl(212,70%,65%)] border-y border-white/[0.04] select-none"
                          >
                            {chunk.content}
                          </td>
                        </tr>

                        {/* Diff lines */}
                        {chunk.changes.map((change, changeIdx) => {
                          const { oldLn, newLn } = getLineNumbers(change)
                          const activeLn = change.type === 'add' ? newLn : change.type === 'del' ? oldLn : newLn
                          const lineComments =
                            activeLn != null
                              ? getCommentsForLine(filePath, activeLn)
                              : []

                          const rowBg =
                            change.type === 'add'
                              ? 'bg-green-500/20'
                              : change.type === 'del'
                                ? 'bg-red-500/20'
                                : ''
                          const gutterBg =
                            change.type === 'add'
                              ? 'bg-green-500/30'
                              : change.type === 'del'
                                ? 'bg-red-500/30'
                                : ''
                          const prefixColor =
                            change.type === 'add'
                              ? 'text-[hsl(142,71%,55%)]'
                              : change.type === 'del'
                                ? 'text-[hsl(0,63%,65%)]'
                                : 'text-transparent'
                          const lineNumColor =
                            change.type === 'normal'
                              ? 'text-muted-foreground/40'
                              : 'text-muted-foreground/60'

                          return (
                            <>
                              <tr key={`line-${chunkIdx}-${changeIdx}`} className={`group ${rowBg} hover:brightness-125 transition-[filter] duration-75`}>
                                {/* Old line number */}
                                <td
                                  className={`w-[1px] whitespace-nowrap select-none text-right px-2 ${gutterBg} ${lineNumColor} border-r border-white/[0.04]`}
                                >
                                  {oldLn ?? ''}
                                </td>
                                {/* New line number — clickable to open inline composer */}
                                <td
                                  className={`w-[1px] whitespace-nowrap select-none text-right px-2 ${gutterBg} ${lineNumColor} border-r border-white/[0.04] cursor-pointer hover:text-amber-400 transition-colors`}
                                  onClick={() => {
                                    const key = `${filePath}:${activeLn}`
                                    setActiveComposerKey((prev) => prev === key ? null : key)
                                    setComposerText('')
                                  }}
                                >
                                  {newLn ?? ''}
                                  <span className="ml-1 opacity-0 group-hover:opacity-60 inline-block">
                                    <MessageSquarePlus size={9} />
                                  </span>
                                </td>
                                {/* +/- prefix */}
                                <td
                                  className={`w-[1px] whitespace-pre select-none pl-2 pr-1 ${prefixColor} font-medium`}
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
                                      )
                                    }}
                                  />
                                </td>
                              </tr>

                              {/* Inline AI comment cards */}
                              {lineComments.map((comment, commentIdx) => {
                                const sevConfig = SEVERITY_CONFIG[comment.severity]
                                const kindConfig = KIND_CONFIG[comment.kind]

                                return (
                                  <tr key={`comment-${chunkIdx}-${changeIdx}-${commentIdx}`}>
                                    <td colSpan={4} className="p-0">
                                      <div
                                        className={`mx-3 my-1.5 rounded-lg border border-white/[0.08] border-l-[3px] bg-white/[0.03] p-3 ${sevConfig.border}`}
                                      >
                                        {/* Header row: severity + kind + title */}
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span
                                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sevConfig.badge}`}
                                          >
                                            {sevConfig.emoji} {sevConfig.label}
                                          </span>
                                          <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-white/[0.05] text-muted-foreground">
                                            {kindConfig.icon} {kindConfig.label}
                                          </span>
                                          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                                            {comment.title}
                                          </span>
                                        </div>

                                        {/* Body */}
                                        <p className="text-[12px] text-muted-foreground/90 leading-relaxed">
                                          {comment.body}
                                        </p>

                                        {/* Suggested fix */}
                                        {comment.suggestedFix && (
                                          <div className="mt-2 rounded-md bg-[hsl(142,71%,45%/0.08)] border border-[hsl(142,71%,45%/0.15)] px-3 py-2">
                                            <p className="text-[11px] text-[hsl(142,71%,55%)]">
                                              <span className="font-medium uppercase tracking-wide text-[10px] mr-1 opacity-70">
                                                Suggested Fix:
                                              </span>
                                              {comment.suggestedFix}
                                            </p>
                                          </div>
                                        )}

                                        {/* Actions */}
                                        <div className="mt-1.5 flex items-center gap-2">
                                          {!comment.posted && onCommentClick && (
                                            <button
                                              type="button"
                                              onClick={() => onCommentClick(comment)}
                                              className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                                            >
                                              Post to Bitbucket
                                            </button>
                                          )}
                                          {comment.posted && (
                                            <span className="text-[11px] text-[hsl(142,71%,55%)]">
                                              Posted
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}

                              {/* Inline user comment cards */}
                              {activeLn != null && getUserCommentsForLine(filePath, activeLn).map((uc) => (
                                <tr key={`uc-${uc.id}`}>
                                  <td colSpan={4} className="p-0">
                                    <div className="mx-3 my-1 rounded-lg border border-amber-500/20 border-l-[3px] border-l-amber-400 bg-amber-500/5 px-3 py-2 flex items-start gap-2">
                                      <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 mt-0.5">
                                        You
                                      </span>
                                      <p className="flex-1 text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{uc.body}</p>
                                      {onDeleteUserComment && (
                                        <button
                                          type="button"
                                          onClick={() => onDeleteUserComment(uc.id)}
                                          className="shrink-0 text-[10px] text-muted-foreground/40 hover:text-red-400 transition-colors mt-0.5"
                                          title="Delete comment"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}

                              {/* Inline composer */}
                              {activeComposerKey === `${filePath}:${activeLn}` && (
                                <tr key={`composer-${chunkIdx}-${changeIdx}`}>
                                  <td colSpan={4} className="p-0">
                                    <div className="mx-3 my-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
                                      <div className="mb-1.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                                        Add your note
                                      </div>
                                      <textarea
                                        autoFocus
                                        value={composerText}
                                        onChange={(e) => setComposerText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Escape') { setActiveComposerKey(null); setComposerText('') }
                                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            if (composerText.trim() && onAddUserComment && activeLn != null) {
                                              onAddUserComment(filePath, activeLn, composerText.trim())
                                              setActiveComposerKey(null)
                                              setComposerText('')
                                            }
                                          }
                                        }}
                                        placeholder="Type a note about this line… (Cmd+Enter to save, Esc to cancel)"
                                        rows={2}
                                        className="w-full resize-none rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-amber-500/50 transition-colors"
                                      />
                                      <div className="mt-1.5 flex items-center gap-2">
                                        <button
                                          type="button"
                                          disabled={!composerText.trim()}
                                          onClick={() => {
                                            if (composerText.trim() && onAddUserComment && activeLn != null) {
                                              onAddUserComment(filePath, activeLn, composerText.trim())
                                              setActiveComposerKey(null)
                                              setComposerText('')
                                            }
                                          }}
                                          className="text-[11px] font-medium px-3 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { setActiveComposerKey(null); setComposerText('') }}
                                          className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          )
                        })}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
