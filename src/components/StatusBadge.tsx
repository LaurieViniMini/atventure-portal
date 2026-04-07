import type { StartupStatus } from '@/lib/types'

const CONFIG: Record<
  StartupStatus,
  { label: string; className: string }
> = {
  pending_review: {
    label: 'Pending Review',
    className: 'bg-yellow-100 text-yellow-800',
  },
  reviewed: {
    label: 'Reviewed',
    className: 'bg-blue-100 text-blue-800',
  },
  invited: {
    label: 'Invited',
    className: 'bg-purple-100 text-purple-800',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800',
  },
  portco: {
    label: 'Portfolio Co.',
    className: 'bg-green-100 text-green-800',
  },
}

export default function StatusBadge({ status }: { status: StartupStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.pending_review
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
