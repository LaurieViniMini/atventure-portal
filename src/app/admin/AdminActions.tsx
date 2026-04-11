'use client'

import { useState } from 'react'
import AddStartupModal from '@/components/AddStartupModal'

export default function AdminActions() {
  const [showModal, setShowModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  async function handleImport() {
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/admin/wix-reprocess', { method: 'POST' })
      const data = await res.json()
      if (data.inserted === 0) {
        setImportResult(`Geen nieuwe submissions gevonden in de afgelopen 48 uur.`)
      } else {
        setImportResult(`${data.inserted} startup${data.inserted !== 1 ? 's' : ''} geïmporteerd!`)
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch {
      setImportResult('Er ging iets mis. Probeer opnieuw.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleImport}
          disabled={importing}
          className="btn-secondary flex items-center gap-2"
        >
          {importing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
          )}
          {importing ? 'Importeren...' : 'Wix importeren'}
        </button>

        {importResult && (
          <span className="text-sm text-gray-600">{importResult}</span>
        )}

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Add Startup
        </button>
      </div>

      {showModal && <AddStartupModal onClose={() => setShowModal(false)} />}
    </>
  )
}
