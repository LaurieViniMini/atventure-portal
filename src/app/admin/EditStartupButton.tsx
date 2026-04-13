'use client'

import { useState } from 'react'
import EditStartupModal from '@/components/EditStartupModal'
import type { Startup } from '@/lib/types'

export default function EditStartupButton({ startup }: { startup: Startup }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); setOpen(true) }}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
        title="Bewerken"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </button>
      {open && <EditStartupModal startup={startup} onClose={() => setOpen(false)} />}
    </>
  )
}
