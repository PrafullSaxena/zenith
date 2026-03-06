import type { ActivityStatus } from '../../types/activity'

const STATUS_STYLES: Record<ActivityStatus, string> = {
  success: 'bg-green-500/10 text-green-400',
  failure: 'bg-red-500/10 text-red-400',
  pending: 'bg-yellow-500/10 text-yellow-400'
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
