import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { DiffFile, DiffChange } from '../../types/bitbucket'
import type { ReviewComment } from '../../types/review'
import { SEVERITY_CONFIG, KIND_CONFIG } from '../../types/review'
import { highlightCode } from '../../lib/highlight'
import { Card } from '@renderer/components/ui/card'

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', sql: 'sql', json: 'json', yaml: 'yaml', yml: 'yaml',
  sh: 'bash', bash: 'bash', css: 'css', html: 'xml', xml: 'xml',
  md: 'markdown', diff: 'diff'
}

function getLang(filePath: string): string | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext]
}

interface PRDiffViewProps {
  diffFiles: DiffFile[]
  reviewComments: ReviewComment[]
  onCommentClick?: (comment: ReviewComment) => void
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

  if (!diffFiles || diffFiles.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
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
          <Card key={filePath} className="overflow-hidden p-0">
            {/* File header toolbar */}
            <Card
             
              onClick={() => toggleFile(filePath)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary rounded-none border-x-0 border-t-0"
            >
              {isCollapsed ? (
                <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                {filePath}
              </span>
              <span className="shrink-0 text-xs text-diff-add-text">
                +{file.additions}
              </span>
              <span className="shrink-0 text-xs text-diff-del-text">
                -{file.deletions}
              </span>
            </Card>

            {/* File diff content — preserved without modification */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                {file.chunks.map((chunk, chunkIdx) => (
                  <div key={chunkIdx}>
                    {/* Chunk header */}
                    <div className="bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
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
                                ? 'bg-diff-add'
                                : change.type === 'del'
                                  ? 'bg-diff-del'
                                  : ''
                            }`}
                          >
                            {/* Line number */}
                            <span className="inline-block w-12 shrink-0 select-none px-2 text-right text-xs leading-6 text-muted-foreground">
                              {lineNum ?? ''}
                            </span>
                            {/* Change prefix */}
                            <span className="whitespace-pre leading-6">
                              {change.type === 'add'
                                ? '+'
                                : change.type === 'del'
                                  ? '-'
                                  : ' '}
                            </span>
                            {/* Syntax-highlighted content */}
                            <span
                              className="whitespace-pre leading-6"
                              dangerouslySetInnerHTML={{
                                __html: highlightCode(
                                  change.content.replace(/^[+-]/, ''),
                                  getLang(filePath)
                                )
                              }}
                            />
                          </div>

                          {/* Inline AI comment cards */}
                          {lineComments.map((comment, commentIdx) => {
                            const sevConfig = SEVERITY_CONFIG[comment.severity]
                            const kindConfig = KIND_CONFIG[comment.kind]

                            return (
                              <div
                                key={commentIdx}
                                className={`ml-12 mr-3 my-1 rounded-lg border-l-4 bg-secondary p-2.5 ${sevConfig.border}`}
                              >
                                {/* Header row: severity + kind + title */}
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${sevConfig.badge}`}
                                  >
                                    {sevConfig.emoji} {sevConfig.label}
                                  </span>
                                  <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-card text-muted-foreground">
                                    {kindConfig.icon} {kindConfig.label}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                    {comment.title}
                                  </span>
                                </div>

                                {/* Body */}
                                <p className="text-sm text-foreground leading-relaxed">
                                  {comment.body}
                                </p>

                                {/* Suggested fix */}
                                {comment.suggestedFix && (
                                  <div className="mt-1.5 rounded bg-success-muted border border-success/10 px-2 py-1">
                                    <p className="text-xs text-success">
                                      <span className="font-semibold">Fix: </span>
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
                                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                    >
                                      Post to Bitbucket
                                    </button>
                                  )}
                                  {comment.posted && (
                                    <span className="text-xs text-success">
                                      Posted
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
