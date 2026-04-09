'use client'

import { useState, useTransition } from 'react'
import type { IcMember } from '@/lib/types'

interface Props {
  startupId: string
  allMembers: IcMember[]
  assignedIds: string[]
}

export default function ReviewerManager({ startupId, allMembers, assignedIds }: Props) {
  const [assigned, setAssigned] = useState<Set<string>>(new Set(assignedIds))
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function toggle(memberId: string) {
    const isAssigned = assigned.has(memberId)
    const method = isAssigned ? 'DELETE' : 'POST'

    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/admin/startup-reviewers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startup_id: startupId, ic_member_id: memberId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong')
        return
      }

      setAssigned((prev) => {
        const next = new Set(prev)
        if (isAssigned) next.delete(memberId)
        else next.add(memberId)
        return next
      })
    })
  }

  const hasAssignments = assigned.size > 0

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {hasAssignments
          ? 'Explicit reviewers selected — only these members will see this startup.'
          : 'No explicit assignment — sector-based access applies.'}
      </p>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {allMembers.map((m) => {
          const isOn = assigned.has(m.id)
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              disabled={pending}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all text-sm ${
                isOn
                  ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              } disabled:opacity-50`}
            >
              <span
                className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                  isOn ? 'bg-primary border-primary' : 'border-gray-300'
                }`}
              >
                {isOn && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate">{m.name}</span>
                <span className="block text-xs text-gray-400 truncate">{m.ic_type}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
