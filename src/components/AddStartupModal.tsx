'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AddStartupModalProps {
  onClose: () => void
}

export default function AddStartupModal({ onClose }: AddStartupModalProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    one_liner: '',
    sector: 'Health' as 'General' | 'Retail' | 'Health' | 'Food',
    pitch_deck_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/startups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to add startup')
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          Add New Startup
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Company name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. HealthTech BV"
            />
          </div>

          <div>
            <label className="label">One-liner</label>
            <input
              className="input"
              required
              value={form.one_liner}
              onChange={(e) => setForm({ ...form, one_liner: e.target.value })}
              placeholder="Short description of what they do"
            />
          </div>

          <div>
            <label className="label">Sector</label>
            <select
              className="input"
              value={form.sector}
              onChange={(e) =>
                setForm({
                  ...form,
                  sector: e.target.value as 'General' | 'Retail' | 'Health' | 'Food',
                })
              }
            >
              <option value="Health">Health</option>
              <option value="Retail">Retail</option>
              <option value="Food">Food</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label className="label">Pitch deck URL</label>
            <input
              className="input"
              type="url"
              value={form.pitch_deck_url}
              onChange={(e) =>
                setForm({ ...form, pitch_deck_url: e.target.value })
              }
              placeholder="https://…"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Adding…' : 'Add Startup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
