import type { Sector } from '@/lib/types'

const CONFIG: Record<Sector, { className: string }> = {
  Health:  { className: 'bg-teal-100 text-teal-700' },
  Retail:  { className: 'bg-orange-100 text-orange-700' },
  Food:    { className: 'bg-green-100 text-green-700' },
  General: { className: 'bg-blue-100 text-blue-700' },
}

export default function SectorBadge({ sector }: { sector: Sector }) {
  const { className } = CONFIG[sector]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {sector}
    </span>
  )
}
