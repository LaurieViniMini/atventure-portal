'use client'

import { useState } from 'react'
import RecommendationBadge from '@/components/RecommendationBadge'
import { GATING_CRITERIA, NO_HARM_CRITERION, SCORE_CRITERIA } from '@/lib/criteria'
import { weightedTotalToPercent } from '@/lib/weighted-score'
import type { ReviewWithMember } from '@/lib/types'

interface Props {
  reviews: ReviewWithMember[]
}

export default function ReviewDetail({ reviews }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  if (reviews.length === 0) return null

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Review Details</h2>
      </div>

      <div className="divide-y divide-gray-100">
        {reviews.map((review) => {
          const isOpen = open === review.id
          const pct = weightedTotalToPercent(review.weighted_total ?? 0)

          return (
            <div key={review.id}>
              {/* Header row */}
              <button
                onClick={() => setOpen(isOpen ? null : review.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-800">
                    {review.ic_members?.name ?? '—'}
                  </span>
                  <RecommendationBadge recommendation={review.recommendation} />
                  <span className="text-sm text-gray-500">
                    {pct.toFixed(0)}% ({review.weighted_total?.toFixed(2)}/5)
                  </span>
                  {review.passed && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Passed</span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-6 pb-6 space-y-5 bg-gray-50 border-t border-gray-100">

                  {/* Stage 1 gating */}
                  <div className="pt-4">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Stage 1 — Gating</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <GateBox label={NO_HARM_CRITERION.label} value={review.gate_no_harm} max={1} />
                      {GATING_CRITERIA.map((c) => (
                        <GateBox key={c.key} label={c.label} value={review[c.key] as number | null} max={2} />
                      ))}
                    </div>
                  </div>

                  {/* Stage 2 scores */}
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Stage 2 — Scores</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SCORE_CRITERIA.map((c) => (
                        <div key={c.key} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <p className="text-xs text-gray-400">{c.label}</p>
                          <p className="text-lg font-bold text-gray-800">
                            {review[c.key] ?? '—'}
                            <span className="text-xs text-gray-400 font-normal">/5</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Qualitative */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {review.diverse_team && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Diverse Team</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          review.diverse_team === 'Yes' ? 'bg-green-100 text-green-700' :
                          review.diverse_team === 'Partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {review.diverse_team}
                        </span>
                      </div>
                    )}
                    {review.key_risks && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Key Risks</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{review.key_risks}</p>
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  {review.comments && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Comments</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{review.comments}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GateBox({ label, value, max }: { label: string; value: number | null; max: number }) {
  return (
    <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold text-amber-700">
        {value ?? '—'}
        <span className="text-xs text-gray-400 font-normal">/{max}</span>
      </p>
    </div>
  )
}
