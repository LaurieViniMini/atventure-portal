'use client'

import { useState } from 'react'
import type { Sector } from '@/lib/types'

interface Props {
  startupId: string
  sector: Sector
}

export default function SendInvitesButton({ startupId, sector }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleSend() {
    if (
      !confirm(
        `Send review invitation emails to all ${sector} IC members for this startup?`
      )
    )
      return

    setLoading(true)
    setResult(null)

    const res = await fetch('/api/admin/send-invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startupId, sector }),
    })

    const data = await res.json()
    if (res.ok) {
      setResult(`Sent to ${data.count} member${data.count !== 1 ? 's' : ''}`)
    } else {
      setResult(`Error: ${data.error}`)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleSend}
        disabled={loading}
        className="btn-secondary text-sm flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        {loading ? 'Sending…' : 'Send Invitations'}
      </button>
      {result && (
        <p
          className={`text-xs ${
            result.startsWith('Error') ? 'text-red-500' : 'text-green-600'
          }`}
        >
          {result}
        </p>
      )}
    </div>
  )
}
