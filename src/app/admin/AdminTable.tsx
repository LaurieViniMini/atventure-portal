'use client'

import { useState } from 'react'
import Link from 'next/link'
import SectorBadge from '@/components/SectorBadge'
import StatusBadge from '@/components/StatusBadge'
import RecommendationBadge from '@/components/RecommendationBadge'
import EditStartupButton from './EditStartupButton'
import type { Startup, Recommendation } from '@/lib/types'

export type ReviewerStatus = { name: string; submitted: boolean; draft: boolean; passed: boolean }

export type StartupRow = {
  startup: Startup
  reviewCount: number
  avgScore: number | null
  yesCnt: number
  maybeCnt: number
  noCnt: number
  overallRec: Recommendation | null
  reviewers: ReviewerStatus[]
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

export default function AdminTable({ rows }: { rows: StartupRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [filterSector, setFilterSector] = useState('')
  const [filterReviewer, setFilterReviewer] = useState('')
  const [filterBizModel, setFilterBizModel] = useState('')

  const ARCHIVED_STATUSES = ['rejected', 'invested']
  const activeRows = rows.filter(r => !ARCHIVED_STATUSES.includes(r.startup.status))
  const archivedRows = rows.filter(r => ARCHIVED_STATUSES.includes(r.startup.status))

  // Derive unique sectors and reviewer names from active rows
  const allSectors = Array.from(new Set(activeRows.map(r => r.startup.sector))).sort()
  const allReviewerNames = Array.from(
    new Set(activeRows.flatMap(r => r.reviewers.map(rv => rv.name)))
  ).sort()

  const filteredRows = activeRows.filter(r => {
    if (filterSector && r.startup.sector !== filterSector) return false
    if (filterReviewer && !r.reviewers.some(rv => rv.name === filterReviewer)) return false
    if (filterBizModel && !(r.startup.business_model_description ?? '').toLowerCase().includes(filterBizModel.toLowerCase())) return false
    return true
  })

  const allIds = filteredRows.map(r => r.startup.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds))
  }

  async function handleBulkSend() {
    const targets = rows.filter(r => selected.has(r.startup.id))
    if (!confirm(`Uitnodigingen sturen voor ${targets.length} startup${targets.length !== 1 ? 's' : ''}?`)) return

    setSending(true)
    setSendResult(null)

    let totalSent = 0
    let totalFailed = 0

    for (const { startup } of targets) {
      try {
        const res = await fetch('/api/admin/send-invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startupId: startup.id, sector: startup.sector }),
        })
        const data = await res.json()
        totalSent += data.count ?? 0
        totalFailed += data.failed?.length ?? 0
      } catch {
        totalFailed++
      }
    }

    setSendResult(
      totalFailed === 0
        ? `${totalSent} uitnodigingen verstuurd voor ${targets.length} startups`
        : `${totalSent} verstuurd, ${totalFailed} mislukt`
    )
    setSelected(new Set())
    setSending(false)
  }

  const hasFilters = filterSector || filterReviewer || filterBizModel

  return (
    <div className="relative">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterSector}
          onChange={e => setFilterSector(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Alle sectoren</option>
          {allSectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterReviewer}
          onChange={e => setFilterReviewer(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Alle reviewers</option>
          {allReviewerNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        <input
          type="text"
          placeholder="Zoek business model…"
          value={filterBizModel}
          onChange={e => setFilterBizModel(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px]"
        />

        {hasFilters && (
          <button
            onClick={() => { setFilterSector(''); setFilterReviewer(''); setFilterBizModel('') }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-2"
          >
            Wis filters
          </button>
        )}

        {hasFilters && (
          <span className="text-sm text-gray-400 self-center">
            {filteredRows.length} van {activeRows.length} startups
          </span>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sector</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Days</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Reviews</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Avg Score</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Y / M / N</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Overall</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reviewers</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRows.map(({ startup, reviewCount, avgScore, yesCnt, maybeCnt, noCnt, overallRec, reviewers }) => {
              const isSelected = selected.has(startup.id)
              return (
                <tr
                  key={startup.id}
                  className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(startup.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{startup.name}</p>
                      <p className="text-xs text-gray-400 truncate max-w-xs">{startup.one_liner}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <SectorBadge sector={startup.sector} sectorRaw={startup.sector_raw} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={startup.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const d = daysSince(startup.created_at)
                      return (
                        <span className={`text-sm font-medium ${d > 30 ? 'text-red-500' : d > 14 ? 'text-amber-500' : 'text-gray-500'}`}>
                          {d}d
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 font-medium">{reviewCount}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-800">
                    {avgScore != null ? avgScore.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-green-600 font-medium">{yesCnt}</span>
                    {' / '}
                    <span className="text-amber-600 font-medium">{maybeCnt}</span>
                    {' / '}
                    <span className="text-red-500 font-medium">{noCnt}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RecommendationBadge recommendation={overallRec} />
                  </td>
                  <td className="px-4 py-3">
                    {reviewers.length === 0 ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {reviewers.map(r => (
                          <span
                            key={r.name}
                            title={`${r.name} — ${r.submitted ? 'Submitted' : r.draft ? 'Draft' : r.passed ? 'Passed' : 'Not started'}`}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.submitted ? 'bg-green-100 text-green-700' :
                              r.draft     ? 'bg-amber-100 text-amber-700' :
                              r.passed    ? 'bg-gray-100 text-gray-400 line-through' :
                                            'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {r.name.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <EditStartupButton startup={startup} />
                      <Link
                        href={`/admin/startups/${startup.id}`}
                        className="text-primary hover:text-primary-dark font-medium transition-colors"
                      >
                        View →
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-gray-400">
                  {hasFilters ? 'Geen startups gevonden met deze filters.' : 'No startups yet. Add your first startup above.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Archived (rejected / invested) — collapsible */}
      {archivedRows.length > 0 && (
        <div className="hidden md:block mt-4">
          <button
            onClick={() => setArchivedOpen(o => !o)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${archivedOpen ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Afgewezen / Geïnvesteerd ({archivedRows.length})
          </button>

          {archivedOpen && (
            <div className="card p-0 overflow-hidden mt-2 opacity-80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Sector</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Reviews</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Avg Score</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Overall</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {archivedRows.map(({ startup, reviewCount, avgScore, overallRec }) => (
                    <tr key={startup.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-600">{startup.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{startup.one_liner}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <SectorBadge sector={startup.sector} sectorRaw={startup.sector_raw} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={startup.status} />
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{reviewCount}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-600">
                        {avgScore != null ? avgScore.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RecommendationBadge recommendation={overallRec} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/startups/${startup.id}`}
                          className="text-primary hover:text-primary-dark font-medium transition-colors"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {filteredRows.map(({ startup, reviewCount, avgScore, yesCnt, maybeCnt, noCnt, overallRec }) => {
          const isSelected = selected.has(startup.id)
          return (
            <div
              key={startup.id}
              className={`card ${isSelected ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(startup.id)}
                  className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Link href={`/admin/startups/${startup.id}`} className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{startup.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{startup.one_liner}</p>
                    </div>
                    <SectorBadge sector={startup.sector} sectorRaw={startup.sector_raw} />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={startup.status} />
                    <span className="text-xs text-gray-500">{reviewCount} reviews</span>
                    {avgScore != null && <span className="text-xs font-bold text-gray-700">{avgScore.toFixed(2)}/5</span>}
                    <span className="text-xs">
                      <span className="text-green-600">{yesCnt}Y</span>{' '}
                      <span className="text-amber-600">{maybeCnt}M</span>{' '}
                      <span className="text-red-500">{noCnt}N</span>
                    </span>
                    {overallRec && <RecommendationBadge recommendation={overallRec} />}
                  </div>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile archived section */}
      {archivedRows.length > 0 && (
        <div className="md:hidden mt-4">
          <button
            onClick={() => setArchivedOpen(o => !o)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${archivedOpen ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Afgewezen / Geïnvesteerd ({archivedRows.length})
          </button>
          {archivedOpen && (
            <div className="space-y-3 mt-2 opacity-80">
              {archivedRows.map(({ startup, reviewCount, avgScore, overallRec }) => (
                <Link key={startup.id} href={`/admin/startups/${startup.id}`} className="block card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-gray-600">{startup.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{startup.one_liner}</p>
                    </div>
                    <SectorBadge sector={startup.sector} sectorRaw={startup.sector_raw} />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={startup.status} />
                    <span className="text-xs text-gray-500">{reviewCount} reviews</span>
                    {avgScore != null && <span className="text-xs font-bold text-gray-600">{avgScore.toFixed(2)}/5</span>}
                    {overallRec && <RecommendationBadge recommendation={overallRec} />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {(selected.size > 0 || sendResult) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          {selected.size > 0 && (
            <>
              <span className="text-sm font-medium">
                {selected.size} startup{selected.size !== 1 ? 's' : ''} geselecteerd
              </span>
              <div className="w-px h-4 bg-white/20" />
              <button
                onClick={handleBulkSend}
                disabled={sending}
                className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Versturen…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Stuur uitnodigingen
                  </>
                )}
              </button>
              <button onClick={() => setSelected(new Set())} className="text-white/40 hover:text-white/70 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </>
          )}
          {sendResult && selected.size === 0 && (
            <>
              <span className="text-sm text-green-400 font-medium">{sendResult}</span>
              <button onClick={() => setSendResult(null)} className="text-white/40 hover:text-white/70 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
