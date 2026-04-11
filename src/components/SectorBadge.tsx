import type { Sector } from '@/lib/types'

const KNOWN: Record<Sector, string> = {
  Health:  'bg-teal-100 text-teal-700',
  Retail:  'bg-orange-100 text-orange-700',
  Food:    'bg-green-100 text-green-700',
  General: 'bg-blue-100 text-blue-700',
}

// Deterministic color for any unknown sector name
const EXTRA_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-yellow-100 text-yellow-700',
  'bg-indigo-100 text-indigo-700',
  'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700',
]

function colorForRaw(raw: string) {
  let hash = 0
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) & 0xffff
  return EXTRA_COLORS[hash % EXTRA_COLORS.length]
}

export default function SectorBadge({ sector, sectorRaw }: { sector: Sector; sectorRaw?: string | null }) {
  const label = sectorRaw || sector
  const className = sectorRaw && !KNOWN[sectorRaw as Sector]
    ? colorForRaw(sectorRaw)
    : KNOWN[sector]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
