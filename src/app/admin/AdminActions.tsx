'use client'

import { useState } from 'react'
import AddStartupModal from '@/components/AddStartupModal'

export default function AdminActions() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-primary flex items-center gap-2"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Startup
      </button>

      {showModal && <AddStartupModal onClose={() => setShowModal(false)} />}
    </>
  )
}
