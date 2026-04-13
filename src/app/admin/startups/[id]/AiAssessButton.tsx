'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AiAssessButton({ startupId }: { startupId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/startups/${startupId}/ai-assess`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={loading}
        className="btn-secondary text-sm flex items-center gap-2"
      >
        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.416a1 1 0 01-.73.321H9.56a1 1 0 01-.73-.321l-.347-.416z" />
        </svg>
        {loading ? 'Bezig…' : 'AI beoordeling uitvoeren'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
