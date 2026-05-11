'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  startupId: string
  isUrgent: boolean
  adminNotes: string | null
  isAngelAccelerator: boolean
}

export default function FlagsUpdater({ startupId, isUrgent, adminNotes, isAngelAccelerator }: Props) {
  const router = useRouter()
  const [urgent, setUrgent] = useState(isUrgent)
  const [angel, setAngel] = useState(isAngelAccelerator)
  const [notes, setNotes] = useState(adminNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(patch: Record<string, unknown>) {
    setSaving(true)
    setSaved(false)
    const res = await fetch(`/api/admin/startups/${startupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      setSaved(true)
      router.refresh()
    }
    setSaving(false)
  }

  async function toggleUrgent() {
    const next = !urgent
    setUrgent(next)
    await save({ is_urgent: next })
  }

  async function toggleAngel() {
    const next = !angel
    setAngel(next)
    await save({ is_angel_accelerator: next })
  }

  async function saveNotes() {
    await save({ admin_notes: notes || null })
  }

  return (
    <div className="space-y-4">
      {/* Urgency + Angel toggles */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={toggleUrgent}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            urgent
              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${urgent ? 'bg-red-500' : 'bg-gray-300'}`} />
          {urgent ? 'Urgent' : 'Niet urgent'}
        </button>

        <button
          onClick={toggleAngel}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            angel
              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
            angel ? 'bg-amber-400 border-amber-400' : 'border-gray-300'
          }`}>
            {angel && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          Angel Accelerator
        </button>
      </div>

      {/* Admin notes */}
      <div>
        <label className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block">
          Notitie voor reviewers
        </label>
        <div className="flex gap-2">
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false) }}
            rows={3}
            placeholder="Voeg een notitie toe die zichtbaar is voor de reviewers…"
            className="input flex-1 resize-none text-sm"
          />
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={saveNotes}
              disabled={saving}
              className="btn-primary text-sm h-9 px-4"
            >
              {saving ? '…' : 'Opslaan'}
            </button>
            {saved && <span className="text-green-600 text-xs font-medium text-center">Opgeslagen</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
