'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ScoreInput from './ScoreInput'
import RecommendationBadge from './RecommendationBadge'
import { SCORE_CRITERIA } from '@/lib/criteria'
import {
  calculateWeightedTotal,
  DEFAULT_SCORES,
  type ScoreFields,
} from '@/lib/weighted-score'
import type { Review, Startup, Recommendation } from '@/lib/types'

interface ReviewFormProps {
  startup: Startup
  existingReview: Review | null
  icMemberId: string
}

export default function ReviewForm({
  startup,
  existingReview,
  icMemberId,
}: ReviewFormProps) {
  const router = useRouter()
  const isSubmitted = Boolean(existingReview?.submitted_at)

  const [scores, setScores] = useState<ScoreFields>(() => {
    if (existingReview) {
      return {
        score_market: existingReview.score_market ?? 0,
        score_audience: existingReview.score_audience ?? 0,
        score_competition: existingReview.score_competition ?? 0,
        score_gtm: existingReview.score_gtm ?? 0,
        score_value_prop: existingReview.score_value_prop ?? 0,
        score_financials: existingReview.score_financials ?? 0,
        score_product_ip: existingReview.score_product_ip ?? 0,
        score_business_model: existingReview.score_business_model ?? 0,
        score_team: existingReview.score_team ?? 0,
        score_timing: existingReview.score_timing ?? 0,
        score_validation: existingReview.score_validation ?? 0,
        score_risks: existingReview.score_risks ?? 0,
      }
    }
    return { ...DEFAULT_SCORES }
  })

  const [comments, setComments] = useState(existingReview?.comments ?? '')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    existingReview?.recommendation ?? null
  )
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const weightedTotal = calculateWeightedTotal(scores)
  const maxScore = 5
  const pct = (weightedTotal / maxScore) * 100

  function scoreColor(pct: number) {
    if (pct >= 70) return 'bg-green-500'
    if (pct >= 40) return 'bg-amber-500'
    return 'bg-red-400'
  }

  async function saveReview(submit: boolean) {
    if (submit) setSubmitting(true)
    else setSaving(true)
    setMessage(null)

    try {
      const payload = {
        startup_id: startup.id,
        ic_member_id: icMemberId,
        ...scores,
        weighted_total: calculateWeightedTotal(scores),
        comments,
        recommendation,
        submit,
        existing_review_id: existingReview?.id ?? null,
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to save review')
      }

      setMessage({
        type: 'success',
        text: submit
          ? 'Review submitted! Scores are now locked.'
          : 'Draft saved.',
      })

      router.refresh()
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setSaving(false)
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Startup header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{startup.name}</h1>
            <p className="text-gray-500 mt-1">{startup.one_liner}</p>
            <div className="flex gap-2 mt-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  startup.sector === 'Health'  ? 'bg-teal-100 text-teal-700'
                  : startup.sector === 'Food'  ? 'bg-green-100 text-green-700'
                  : startup.sector === 'General' ? 'bg-blue-100 text-blue-700'
                  : 'bg-orange-100 text-orange-700'
                }`}
              >
                {startup.sector}
              </span>
              {isSubmitted && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Submitted
                </span>
              )}
            </div>
          </div>
          {startup.pitch_deck_url && (
            <a
              href={startup.pitch_deck_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent text-sm flex items-center gap-2 self-start whitespace-nowrap"
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Pitch Deck
            </a>
          )}
        </div>
      </div>

      {/* Live score preview */}
      <div className="card border-l-4 border-l-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Weighted Total Score
            </p>
            <p className="text-4xl font-bold text-gray-900 mt-0.5">
              {weightedTotal.toFixed(2)}
              <span className="text-lg text-gray-400 font-normal"> / 5</span>
            </p>
          </div>
          {recommendation && (
            <div className="flex flex-col items-start sm:items-end gap-1">
              <p className="text-xs text-gray-400">Recommendation</p>
              <RecommendationBadge recommendation={recommendation} />
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${scoreColor(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>5</span>
          </div>
        </div>
      </div>

      {/* Scoring criteria */}
      <div className="card space-y-6">
        <h2 className="font-semibold text-gray-900 text-lg">Scoring Criteria</h2>

        {SCORE_CRITERIA.map((criterion) => (
          <div
            key={criterion.key}
            className="pb-5 border-b border-gray-100 last:border-0 last:pb-0"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 text-sm">
                    {criterion.label}
                  </p>
                  <span className="text-xs text-gray-400 font-normal">
                    {(criterion.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  {criterion.question}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 italic">
                  {criterion.scale}
                </p>
              </div>
              <div className="shrink-0">
                <ScoreInput
                  value={scores[criterion.key]}
                  onChange={(val) =>
                    setScores((prev) => ({ ...prev, [criterion.key]: val }))
                  }
                  disabled={isSubmitted}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comments */}
      <div className="card">
        <label htmlFor="comments" className="label text-base font-semibold">
          Comments & Notes
        </label>
        <textarea
          id="comments"
          rows={5}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={isSubmitted}
          placeholder="Add any thoughts, concerns, or standout observations…"
          className="input resize-y"
        />
      </div>

      {/* Recommendation */}
      <div className="card">
        <p className="font-semibold text-gray-900 mb-3">Recommendation</p>
        <div className="grid grid-cols-3 gap-3">
          {(['YES', 'MAYBE', 'NO'] as Recommendation[]).map((rec) => {
            const selected = recommendation === rec
            const colorMap = {
              YES: selected
                ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-200'
                : 'border-green-300 text-green-600 hover:bg-green-50',
              MAYBE: selected
                ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200'
                : 'border-amber-300 text-amber-600 hover:bg-amber-50',
              NO: selected
                ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200'
                : 'border-red-300 text-red-600 hover:bg-red-50',
            }
            return (
              <button
                key={rec}
                type="button"
                disabled={isSubmitted}
                onClick={() => setRecommendation(selected ? null : rec)}
                className={`
                  py-3 rounded-xl border-2 font-bold text-lg transition-all
                  ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}
                  ${colorMap[rec]}
                `}
              >
                {rec}
              </button>
            )
          })}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Actions */}
      {!isSubmitted && (
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button
            onClick={() => saveReview(false)}
            disabled={saving || submitting}
            className="btn-secondary flex-1"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => saveReview(true)}
            disabled={saving || submitting || !recommendation}
            className="btn-primary flex-1"
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      )}

      {isSubmitted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-700 text-sm text-center mb-8">
          This review has been submitted and is now locked.
        </div>
      )}
    </div>
  )
}
