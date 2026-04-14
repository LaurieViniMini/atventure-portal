'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { IcMember } from '@/lib/types'

interface Props {
  startupId: string
  allMembers: IcMember[]
  assignedIds: string[]
  invitedAtMap: Record<string, string | null>
  reviewStatusMap: Record<string, 'draft' | 'submitted' | 'passed'>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReviewerManager({ startupId, allMembers, assignedIds, invitedAtMap, reviewStatusMap }: Props) {
  const router = useRouter()
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

      router.refresh()
    })
  }

  const hasAssignments = assigned.size > 0

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {hasAssignments
          ? 'Expliciete reviewers geselecteerd — alleen deze leden zien deze startup.'
          : 'Geen expliciete toewijzing — sector-gebaseerde toegang geldt.'}
      </p>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {allMembers.map((m) => {
          const isOn = assigned.has(m.id)
          const invitedAt = invitedAtMap[m.id]
          const reviewStatus = reviewStatusMap[m.id]

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
              <span className="shrink-0 text-right space-y-0.5">
                {reviewStatus === 'submitted' && (
                  <span className="block text-xs font-medium text-green-600">Review ingediend</span>
                )}
                {reviewStatus === 'draft' && (
                  <span className="block text-xs font-medium text-amber-500">Bezig met review</span>
                )}
                {reviewStatus === 'passed' && (
                  <span className="block text-xs text-gray-400">Gepasst</span>
                )}
                {invitedAt ? (
                  <span className="block text-xs text-gray-400">
                    Uitgenodigd {formatDate(invitedAt)}
                  </span>
                ) : isOn ? (
                  <span className="block text-xs text-gray-300">Nog niet uitgenodigd</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
