import type { PullRequest } from '../../types/bitbucket'
import { formatRelativeTime } from '../../components/dashboard/utils'

interface PRListProps {
  pullRequests: PullRequest[]
  isLoading: boolean
  onSelect: (pr: PullRequest) => void
  selectedPrId?: number
}

/**
 * Scrollable list of open pull requests.
 * Each PR is rendered as a clickable card showing title, author,
 * branch flow, and relative timestamp.
 */
export function PRList({
  pullRequests,
  isLoading,
  onSelect,
  selectedPrId
}: PRListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        Loading pull requests...
      </p>
    )
  }

  if (pullRequests.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        No open pull requests found
      </p>
    )
  }

  return (
    <div className="space-y-1 overflow-y-auto">
      {pullRequests.map((pr) => {
        const isSelected = pr.id === selectedPrId
        return (
          <button
            key={pr.id}
            type="button"
            onClick={() => onSelect(pr)}
            className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
              isSelected
                ? 'border border-accent bg-surface-elevated'
                : 'border border-transparent hover:bg-surface-elevated'
            }`}
          >
            {/* PR title */}
            <p className="truncate font-medium text-text-primary">{pr.title}</p>

            {/* Author */}
            <p className="mt-0.5 text-sm text-text-secondary">
              {pr.author.display_name}
            </p>

            {/* Branch flow and timestamp */}
            <div className="mt-1 flex items-center justify-between">
              <span className="truncate text-xs text-text-secondary">
                {pr.source.branch.name}
                <span className="mx-1 text-text-secondary/60">&rarr;</span>
                {pr.destination.branch.name}
              </span>
              <span className="shrink-0 text-xs text-text-secondary">
                {formatRelativeTime(pr.created_on)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
