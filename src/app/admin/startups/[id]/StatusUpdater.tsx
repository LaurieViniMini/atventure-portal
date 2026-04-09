'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StartupStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: StartupStatus; label: string }[] = [
  { value: 'pre_screening',        label: 'Pre-screening' },
  { value: 'to_review_sector_ic',  label: 'Sector IC Review' },
  { value: 'to_review_general_ic', label: 'General IC Review' },
  { value: 'ok_for_pitching',      label: 'OK for Pitching' },
  { value: 'in_dd',                label: 'In DD' },
  { value: 'rejected',             label: 'Rejected' },
  { value: 'invested',             label: 'Invested' },
]

interface Props {
  startupId: string
  currentStatus: StartupStatus
}

export default function StatusUpdater({ startupId, currentStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const res = await fetch(`/api/admin/startups/${startupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setSaved(true)
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value as StartupStatus); setSaved(false) }}
        className="input w-auto"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
        {/* Show legacy status if current status is legacy */}
        {!STATUS_OPTIONS.find(o => o.value === currentStatus) && (
          <option value={currentStatus}>{currentStatus}</option>
        )}
      </select>
      <button
        onClick={handleSave}
        disabled={saving || status === currentStatus}
        className="btn-primary text-sm"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
    </div>
  )
}
