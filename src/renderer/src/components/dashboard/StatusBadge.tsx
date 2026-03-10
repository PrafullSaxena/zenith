import type { ActivityStatus } from '../../types/activity'

const STATUS_STYLES: Record<ActivityStatus, string> = {
  success: 'bg-success-muted text-success',
  failure: 'bg-error-muted text-error',
  pending: 'bg-warning-muted text-warning'
}

export function StatusBadge({ status }: { status: ActivityStatus }): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}
