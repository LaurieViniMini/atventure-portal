'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StartupStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: StartupStatus; label: string }[] = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'invited', label: 'Invited' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'portco', label: 'Portfolio Co.' },
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
        onChange={(e) => {
          setStatus(e.target.value as StartupStatus)
          setSaved(false)
        }}
        className="input w-auto"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={saving || status === currentStatus}
        className="btn-primary text-sm"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved && (
        <span className="text-green-600 text-sm font-medium">Saved!</span>
      )}
    </div>
  )
}
