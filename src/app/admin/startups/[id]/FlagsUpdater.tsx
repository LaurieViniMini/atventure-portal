'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  startupId: string
  isUrgent: boolean
  isNotUrgent: boolean
  isAlreadyInDd: boolean
  adminNotes: string | null
  isAngelAccelerator: boolean
}

function Checkbox({
  checked,
  onToggle,
  disabled,
  label,
  activeClass,
}: {
  checked: boolean
  onToggle: () => void
  disabled: boolean
  label: string
  activeClass: string
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
        checked ? activeClass : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
      }`}
    >
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
        checked ? 'bg-current border-current' : 'border-gray-300'
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {label}
    </button>
  )
}

export default function FlagsUpdater({
  startupId,
  isUrgent,
  isNotUrgent,
  isAlreadyInDd,
  adminNotes,
  isAngelAccelerator,
}: Props) {
  const router = useRouter()
  const [urgent, setUrgent] = useState(isUrgent)
  const [notUrgent, setNotUrgent] = useState(isNotUrgent)
  const [alreadyInDd, setAlreadyInDd] = useState(isAlreadyInDd)
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

  async function toggle(
    current: boolean,
    setter: (v: boolean) => void,
    field: string,
  ) {
    const next = !current
    setter(next)
    await save({ [field]: next })
  }

  async function saveNotes() {
    await save({ admin_notes: notes || null })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Urgent */}
        <button
          onClick={() => toggle(urgent, setUrgent, 'is_urgent')}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            urgent
              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${urgent ? 'bg-red-500' : 'bg-gray-300'}`} />
          Urgent
        </button>

        {/* Not urgent */}
        <Checkbox
          checked={notUrgent}
          onToggle={() => toggle(notUrgent, setNotUrgent, 'is_not_urgent')}
          disabled={saving}
          label="Niet urgent"
          activeClass="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
        />

        {/* Already in DD */}
        <Checkbox
          checked={alreadyInDd}
          onToggle={() => toggle(alreadyInDd, setAlreadyInDd, 'is_already_in_dd')}
          disabled={saving}
          label="Already in DD"
          activeClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        />

        {/* Angel Accelerator */}
        <Checkbox
          checked={angel}
          onToggle={() => toggle(angel, setAngel, 'is_angel_accelerator')}
          disabled={saving}
          label="Angel Accelerator"
          activeClass="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
        />
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
