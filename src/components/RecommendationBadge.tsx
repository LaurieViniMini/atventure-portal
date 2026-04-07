import type { Recommendation } from '@/lib/types'

const CONFIG: Record<Recommendation, { label: string; className: string }> = {
  YES: { label: 'YES', className: 'bg-green-100 text-green-700 border-green-200' },
  MAYBE: { label: 'MAYBE', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  NO: { label: 'NO', className: 'bg-red-100 text-red-700 border-red-200' },
}

export default function RecommendationBadge({
  recommendation,
}: {
  recommendation: Recommendation | null
}) {
  if (!recommendation) return <span className="text-gray-400 text-sm">—</span>
  const { label, className } = CONFIG[recommendation]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${className}`}
    >
      {label}
    </span>
  )
}
