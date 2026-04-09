import type { StartupStatus } from '@/lib/types'

const CONFIG: Record<string, { label: string; className: string }> = {
  // New statuses
  pre_screening:          { label: 'Pre-screening',          className: 'bg-gray-100 text-gray-600' },
  to_review_sector_ic:    { label: 'Sector IC Review',       className: 'bg-amber-100 text-amber-800' },
  to_review_general_ic:   { label: 'General IC Review',      className: 'bg-blue-100 text-blue-800' },
  ok_for_pitching:        { label: 'OK for Pitching',        className: 'bg-purple-100 text-purple-800' },
  in_dd:                  { label: 'In DD',                  className: 'bg-indigo-100 text-indigo-800' },
  rejected:               { label: 'Rejected',               className: 'bg-red-100 text-red-800' },
  invested:               { label: 'Invested',               className: 'bg-green-100 text-green-800' },
  // Legacy
  pending_review:         { label: 'Pending Review',         className: 'bg-yellow-100 text-yellow-800' },
  reviewed:               { label: 'Reviewed',               className: 'bg-blue-100 text-blue-800' },
  invited:                { label: 'Invited',                className: 'bg-purple-100 text-purple-800' },
  portco:                 { label: 'Portfolio Co.',          className: 'bg-green-100 text-green-800' },
}

export default function StatusBadge({ status }: { status: StartupStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.pre_screening
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
