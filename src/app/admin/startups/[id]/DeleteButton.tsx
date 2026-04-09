'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteButton({ startupId }: { startupId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Are you sure you want to permanently delete this startup? This cannot be undone.')) return
    setLoading(true)
    const res = await fetch(`/api/admin/startups/${startupId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin')
    } else {
      const data = await res.json()
      alert(`Error: ${data.error}`)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? 'Deleting…' : 'Delete startup'}
    </button>
  )
}
