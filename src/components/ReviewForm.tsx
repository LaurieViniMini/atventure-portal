'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ScoreInput from './ScoreInput'
import RecommendationBadge from './RecommendationBadge'
import { GATING_CRITERIA, NO_HARM_CRITERION, SCORE_CRITERIA, THRESHOLDS } from '@/lib/criteria'
import {
  calculateWeightedTotal,
  weightedTotalToPercent,
  DEFAULT_SCORES,
  DEFAULT_GATES,
  type ScoreFields,
} from '@/lib/weighted-score'
import type { Review, Startup, Recommendation, DiverseTeam } from '@/lib/types'

interface ReviewFormProps {
  startup: Startup
  existingReview: Review | null
  icMemberId: string
}

export default function ReviewForm({ startup, existingReview, icMemberId }: ReviewFormProps) {
  const router = useRouter()
  const isSubmitted = Boolean(existingReview?.submitted_at)
  const isPassed = Boolean(existingReview?.passed)
  const isLocked = isSubmitted || isPassed

  const [gates, setGates] = useState({
    gate_10x:                  existingReview?.gate_10x                  ?? null,
    gate_problem_significance: existingReview?.gate_problem_significance ?? null,
    gate_must_have:            existingReview?.gate_must_have            ?? null,
    gate_no_harm:              existingReview?.gate_no_harm              ?? null,
  } as typeof DEFAULT_GATES)

  const [scores, setScores] = useState<ScoreFields>(() => {
    if (existingReview) {
      return {
        score_team:           existingReview.score_team           ?? 0,
        score_market:         existingReview.score_market         ?? 0,
        score_10x:            existingReview.score_10x            ?? 0,
        score_must_have:      existingReview.score_must_have      ?? 0,
        score_business_model: existingReview.score_business_model ?? 0,
        score_product_ip:     existingReview.score_product_ip     ?? 0,
        score_validation:     existingReview.score_validation     ?? 0,
        score_impact:         existingReview.score_impact         ?? 0,
        score_competition:    existingReview.score_competition     ?? 0,
        score_gtm:            existingReview.score_gtm            ?? 0,
        score_financials:     existingReview.score_financials     ?? 0,
      }
    }
    return { ...DEFAULT_SCORES }
  })

  const [comments, setComments] = useState(existingReview?.comments ?? '')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(existingReview?.recommendation ?? null)
  const [diverseTeam, setDiverseTeam] = useState<DiverseTeam | null>(existingReview?.diverse_team ?? null)
  const [keyRisks, setKeyRisks] = useState(existingReview?.key_risks ?? '')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [passing, setPassing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Stage 1 logic
  const gateTotal = (gates.gate_10x ?? 0) + (gates.gate_problem_significance ?? 0) + (gates.gate_must_have ?? 0)
  const hardStop = gates.gate_no_harm === 0
  const allGatesFilled = gates.gate_10x !== null && gates.gate_problem_significance !== null && gates.gate_must_have !== null && gates.gate_no_harm !== null

  const gateResult = useMemo(() => {
    if (!allGatesFilled) return null
    if (hardStop) return { label: 'Hard Stop', color: 'red', desc: 'No harm flag raised. Do not proceed.' }
    if (gateTotal <= 3) return { label: 'Pass', color: 'orange', desc: 'Total 0–3: recommend passing this deal.' }
    if (gateTotal <= 5) return { label: 'Discuss', color: 'yellow', desc: 'Total 4–5: borderline, discuss with the team.' }
    return { label: 'Proceed to Scoring', color: 'green', desc: 'Total 6: proceed to full scoring.' }
  }, [allGatesFilled, hardStop, gateTotal])

  // Stage 2 live score
  const weightedTotal = calculateWeightedTotal(scores)
  const pct = weightedTotalToPercent(weightedTotal)

  const suggestedRec: Recommendation = pct >= THRESHOLDS.YES ? 'YES' : pct >= THRESHOLDS.MAYBE ? 'MAYBE' : 'NO'

  const scoreColor = pct >= THRESHOLDS.YES ? 'bg-green-500' : pct >= THRESHOLDS.MAYBE ? 'bg-amber-500' : 'bg-red-400'

  async function saveReview(submit: boolean, pass = false) {
    if (pass) setPassing(true)
    else if (submit) setSubmitting(true)
    else setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup_id: startup.id,
          ic_member_id: icMemberId,
          ...scores,
          ...gates,
          weighted_total: calculateWeightedTotal(scores),
          comments,
          recommendation,
          diverse_team: diverseTeam,
          key_risks: keyRisks,
          submit,
          pass,
          existing_review_id: existingReview?.id ?? null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save review')

      setMessage({
        type: 'success',
        text: pass ? 'You have opted out of this review.'
          : submit ? 'Review submitted and locked.'
          : 'Draft saved.',
      })
      router.refresh()
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setSaving(false)
      setSubmitting(false)
      setPassing(false)
    }
  }

  if (isPassed) {
    return (
      <div className="space-y-6">
        <StartupHeader startup={startup} />
        <div className="card text-center py-10 text-gray-500">
          <p className="text-lg font-medium">You have opted out of this review.</p>
          <p className="text-sm mt-1">Contact Laurie if you'd like to be re-assigned.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <StartupHeader startup={startup} />

      {/* ── STAGE 1: GATING ── */}
      <div className="card border-l-4 border-l-amber-400">
        <h2 className="font-bold text-gray-900 text-lg mb-1">Stage 1 — Gating</h2>
        <p className="text-sm text-gray-500 mb-5">
          Complete before scoring. If No Harm scores 0, stop immediately.
          If total of first three criteria is 3 or below, pass the deal.
        </p>

        <div className="space-y-6">
          {/* No harm — shown first */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="font-semibold text-sm text-gray-800">{NO_HARM_CRITERION.label}</p>
            <p className="text-sm text-gray-600 mt-0.5 mb-3">{NO_HARM_CRITERION.question}</p>
            <div className="flex flex-col gap-2">
              {NO_HARM_CRITERION.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setGates((g) => ({ ...g, gate_no_harm: opt.value }))}
                  className={`text-left px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    gates.gate_no_harm === opt.value
                      ? opt.value === 0
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-green-500 text-white border-green-500'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.value} — {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3 gating criteria */}
          {GATING_CRITERIA.map((criterion) => (
            <div key={criterion.key} className="pb-5 border-b border-gray-100 last:border-0 last:pb-0">
              <p className="font-semibold text-sm text-gray-800">{criterion.label}</p>
              <p className="text-sm text-gray-600 mt-0.5 mb-3">{criterion.question}</p>
              <div className="flex flex-col gap-2">
                {criterion.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setGates((g) => ({ ...g, [criterion.key]: opt.value }))}
                    className={`text-left px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      gates[criterion.key] === opt.value
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-gray-600 hover:border-primary/30'
                    }`}
                  >
                    {opt.value} — {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Gate result banner */}
        {gateResult && (
          <div className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${
            gateResult.color === 'red'    ? 'bg-red-100 text-red-700 border border-red-200' :
            gateResult.color === 'orange' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
            gateResult.color === 'yellow' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                            'bg-green-100 text-green-700 border border-green-200'
          }`}>
            <span className="font-bold">{gateResult.label}</span>
            {' — '}{gateResult.desc}
            {!hardStop && allGatesFilled && (
              <span className="ml-2 text-xs font-normal opacity-75">
                (Gate total: {gateTotal}/6)
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── STAGE 2: SCORING ── */}
      {!hardStop && (
        <>
          {/* Live score preview */}
          <div className="card border-l-4 border-l-primary">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500 font-medium">Weighted Score</p>
                <p className="text-4xl font-bold text-gray-900 mt-0.5">
                  {pct.toFixed(0)}
                  <span className="text-lg text-gray-400 font-normal">%</span>
                  <span className="text-sm text-gray-400 font-normal ml-2">({weightedTotal.toFixed(2)}/5)</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Suggested recommendation</p>
                <RecommendationBadge recommendation={suggestedRec} />
              </div>
            </div>
            <div className="mt-4">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${scoreColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span className="text-red-400">50% (No)</span>
                <span className="text-amber-500">75% (Maybe)</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Scoring criteria */}
          <div className="card space-y-6">
            <h2 className="font-bold text-gray-900 text-lg">Stage 2 — Scoring</h2>

            {SCORE_CRITERIA.map((criterion) => (
              <div key={criterion.key} className="pb-5 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm">{criterion.label}</p>
                      <span className="text-xs text-gray-400">{(criterion.weight * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{criterion.question}</p>
                    <p className="text-xs text-gray-400 mt-0.5 italic">{criterion.scale}</p>
                  </div>
                  <div className="shrink-0">
                    <ScoreInput
                      value={scores[criterion.key]}
                      onChange={(val) => setScores((prev) => ({ ...prev, [criterion.key]: val }))}
                      disabled={isLocked}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Qualitative flags */}
          <div className="card space-y-5">
            <h2 className="font-bold text-gray-900 text-lg">Qualitative Flags</h2>

            <div>
              <p className="font-semibold text-sm text-gray-800 mb-1">Diverse Team</p>
              <p className="text-sm text-gray-500 mb-3">Is the founding team diverse in gender, background, ethnicity, or lived experience?</p>
              <div className="flex gap-2">
                {(['Yes', 'Partial', 'No'] as DiverseTeam[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setDiverseTeam(diverseTeam === opt ? null : opt)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      diverseTeam === opt
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-gray-600 hover:border-primary/30'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-sm text-gray-800 block mb-1">Key Risks</label>
              <p className="text-sm text-gray-500 mb-2">What are the most significant risks for this company?</p>
              <textarea
                rows={3}
                value={keyRisks}
                onChange={(e) => setKeyRisks(e.target.value)}
                disabled={isLocked}
                placeholder="Describe the key risks…"
                className="input resize-y"
              />
            </div>
          </div>

          {/* Comments */}
          <div className="card">
            <label className="font-semibold text-gray-900 text-base block mb-1">Comments & Notes</label>
            <textarea
              rows={5}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isLocked}
              placeholder="Add any thoughts, concerns, or standout observations…"
              className="input resize-y"
            />
          </div>

          {/* Recommendation */}
          <div className="card">
            <p className="font-bold text-gray-900 mb-1">Recommendation</p>
            <p className="text-xs text-gray-400 mb-3">
              Suggested based on score: <strong>{suggestedRec}</strong>
              {' '}(≥75% = Yes, 50–75% = Maybe, &lt;50% = No)
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(['YES', 'MAYBE', 'NO'] as Recommendation[]).map((rec) => {
                const selected = recommendation === rec
                const colorMap = {
                  YES:   selected ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-200' : 'border-green-300 text-green-600 hover:bg-green-50',
                  MAYBE: selected ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200' : 'border-amber-300 text-amber-600 hover:bg-amber-50',
                  NO:    selected ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200'       : 'border-red-300 text-red-600 hover:bg-red-50',
                }
                return (
                  <button
                    key={rec}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setRecommendation(selected ? null : rec)}
                    className={`py-3 rounded-xl border-2 font-bold text-lg transition-all ${isLocked ? 'cursor-default' : 'cursor-pointer'} ${colorMap[rec]}`}
                  >
                    {rec}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Messages */}
      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Actions */}
      {!isLocked && (
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button
            onClick={() => saveReview(false, true)}
            disabled={saving || submitting || passing}
            className="btn-secondary flex-1 text-sm"
          >
            {passing ? 'Saving…' : 'Pass on this review'}
          </button>
          <button
            onClick={() => saveReview(false)}
            disabled={saving || submitting || passing}
            className="btn-secondary flex-1"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => saveReview(true)}
            disabled={saving || submitting || passing || (!hardStop && !recommendation)}
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

function StartupHeader({ startup }: { startup: Startup }) {
  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{startup.name}</h1>
          <p className="text-gray-500 mt-1">{startup.one_liner}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              startup.sector === 'Health'  ? 'bg-teal-100 text-teal-700' :
              startup.sector === 'Food'    ? 'bg-green-100 text-green-700' :
              startup.sector === 'General' ? 'bg-blue-100 text-blue-700' :
                                             'bg-orange-100 text-orange-700'
            }`}>{startup.sector}</span>
          </div>
        </div>
        {startup.pitch_deck_url && (
          <a
            href={startup.pitch_deck_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent text-sm flex items-center gap-2 self-start whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Pitch Deck
          </a>
        )}
      </div>
    </div>
  )
}
