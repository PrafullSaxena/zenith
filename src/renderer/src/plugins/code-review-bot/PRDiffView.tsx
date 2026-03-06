import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { DiffFile, DiffChange } from '../../types/bitbucket'
import type { ReviewComment } from '../../types/review'

interface PRDiffViewProps {
  diffFiles: DiffFile[]
  reviewComments: ReviewComment[]
  onCommentClick?: (comment: ReviewComment) => void
}

/** Map severity to left-border color class for inline comment cards. */
const SEVERITY_BORDER: Record<ReviewComment['severity'], string> = {
  critical: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  suggestion: 'border-l-cyan-500'
}

/** Map severity to badge color classes. */
const SEVERITY_BADGE: Record<ReviewComment['severity'], string> = {
  critical: 'bg-red-500/10 text-red-400',
  warning: 'bg-yellow-500/10 text-yellow-400',
  suggestion: 'bg-cyan-500/10 text-cyan-400'
}

/**
 * Unified diff viewer.
 * Renders file-by-file diffs with syntax-colored additions/deletions,
 * line numbers, and inline AI review comment cards.
 */
export function PRDiffView({
  diffFiles,
  reviewComments,
  onCommentClick
}: PRDiffViewProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  if (diffFiles.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        No diff loaded. Select a pull request to view changes.
      </p>
    )
  }

  const toggleFile = (filePath: string): void => {
    setCollapsed((prev) => ({ ...prev, [filePath]: !prev[filePath] }))
  }

  /** Find review comments for a specific file and line number. */
  const getCommentsForLine = (file: string, line: number): ReviewComment[] => {
    return reviewComments.filter((c) => c.file === file && c.line === line)
  }

  /** Get the display line number for a change. */
  const getLineNumber = (change: DiffChange): number | undefined => {
    if (change.type === 'add' || change.type === 'del') return change.ln
    return change.ln2
  }

  return (
    <div className="space-y-3 overflow-y-auto">
      {diffFiles.map((file) => {
        const filePath = file.to || file.from
        const isCollapsed = collapsed[filePath] ?? false

        return (
          <div
            key={filePath}
            className="overflow-hidden rounded-md border border-border"
          >
            {/* File header */}
            <button
              type="button"
              onClick={() => toggleFile(filePath)}
              className="flex w-full items-center gap-2 bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-elevated"
            >
              {isCollapsed ? (
                <ChevronRight size={14} className="shrink-0 text-text-secondary" />
              ) : (
                <ChevronDown size={14} className="shrink-0 text-text-secondary" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-text-primary">
                {filePath}
              </span>
              <span className="shrink-0 text-xs text-green-400">
                +{file.additions}
              </span>
              <span className="shrink-0 text-xs text-red-400">
                -{file.deletions}
              </span>
            </button>

            {/* File diff content */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                {file.chunks.map((chunk, chunkIdx) => (
                  <div key={chunkIdx}>
                    {/* Chunk header */}
                    <div className="bg-surface px-3 py-1 font-mono text-xs text-text-secondary">
                      {chunk.content}
                    </div>

                    {/* Diff lines */}
                    {chunk.changes.map((change, changeIdx) => {
                      const lineNum = getLineNumber(change)
                      const lineComments =
                        lineNum != null
                          ? getCommentsForLine(filePath, lineNum)
                          : []

                      return (
                        <div key={changeIdx}>
                          {/* Diff line */}
                          <div
                            className={`flex font-mono text-sm ${
                              change.type === 'add'
                                ? 'bg-green-950/30'
                                : change.type === 'del'
                                  ? 'bg-red-950/30'
                                  : ''
                            }`}
                          >
                            {/* Line number */}
                            <span className="inline-block w-12 shrink-0 select-none px-2 text-right text-xs leading-6 text-text-secondary">
                              {lineNum ?? ''}
                            </span>
                            {/* Change prefix and content */}
                            <span className="whitespace-pre leading-6">
                              {change.type === 'add'
                                ? '+'
                                : change.type === 'del'
                                  ? '-'
                                  : ' '}
                              {change.content.replace(/^[+-]/, '')}
                            </span>
                          </div>

                          {/* Inline AI comment cards */}
                          {lineComments.map((comment, commentIdx) => (
                            <div
                              key={commentIdx}
                              className={`ml-12 mr-3 my-1 rounded border-l-4 bg-surface-elevated p-2.5 ${SEVERITY_BORDER[comment.severity]}`}
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_BADGE[comment.severity]}`}
                                >
                                  {comment.severity}
                                </span>
                                <p className="min-w-0 flex-1 text-sm text-text-primary">
                                  {comment.comment}
                                </p>
                              </div>
                              {!comment.posted && onCommentClick && (
                                <button
                                  type="button"
                                  onClick={() => onCommentClick(comment)}
                                  className="mt-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                                >
                                  Post to Bitbucket
                                </button>
                              )}
                              {comment.posted && (
                                <span className="mt-1.5 inline-block text-xs text-green-400">
                                  Posted
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
