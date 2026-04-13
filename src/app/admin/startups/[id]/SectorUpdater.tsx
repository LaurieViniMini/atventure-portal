'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Sector } from '@/lib/types'

const SECTOR_OPTIONS: { value: Sector; label: string }[] = [
  { value: 'Health',  label: 'Health' },
  { value: 'Food',    label: 'Food' },
  { value: 'Retail',  label: 'Retail' },
  { value: 'General', label: 'General' },
]

export default function SectorUpdater({
  startupId,
  currentSector,
  currentSectorRaw,
}: {
  startupId: string
  currentSector: Sector
  currentSectorRaw?: string | null
}) {
  const router = useRouter()
  const [sector, setSector] = useState(currentSector)
  const [sectorRaw, setSectorRaw] = useState(currentSectorRaw ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const res = await fetch(`/api/admin/startups/${startupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sector, sector_raw: sectorRaw || null }),
    })
    if (res.ok) {
      setSaved(true)
      router.refresh()
    }
    setSaving(false)
  }

  const isDirty = sector !== currentSector || sectorRaw !== (currentSectorRaw ?? '')

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-400 font-medium block mb-1">Display sector (from submission)</label>
          <input
            type="text"
            value={sectorRaw}
            onChange={(e) => { setSectorRaw(e.target.value); setSaved(false) }}
            placeholder="e.g. Climate / Energy / Cleantech"
            className="input w-full"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-medium block mb-1">IC routing bucket</label>
          <select
            value={sector}
            onChange={(e) => { setSector(e.target.value as Sector); setSaved(false) }}
            className="input w-auto"
          >
            {SECTOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="self-end">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="btn-primary text-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
    </div>
  )
}
