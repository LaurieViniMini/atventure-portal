import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import SectorBadge from '@/components/SectorBadge'
import StatusBadge from '@/components/StatusBadge'
import RecommendationBadge from '@/components/RecommendationBadge'
import type { Startup, Review, IcMember, Recommendation } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function HealthICPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.email !== (process.env.ADMIN_EMAIL ?? '').trim()) redirect('/review')

  const adminClient = createAdminClient()

  const [
    { data: startups = [] },
    { data: reviews = [] },
    { data: assignments = [] },
    { data: members = [] },
  ] = await Promise.all([
    adminClient.from('startups').select('*').eq('sector', 'Health').neq('status', 'rejected').order('created_at', { ascending: false }) as unknown as Promise<{ data: Startup[] | null }>,
    adminClient.from('reviews').select('*') as unknown as Promise<{ data: Review[] | null }>,
    adminClient.from('startup_reviewers').select('startup_id, ic_member_id') as unknown as Promise<{ data: { startup_id: string; ic_member_id: string }[] | null }>,
    adminClient.from('ic_members').select('*').order('name') as unknown as Promise<{ data: IcMember[] | null }>,
  ])

  const healthMembers = (members ?? []).filter(m => m.ic_type === 'Health' || m.ic_type === 'All' || m.ic_type === 'PreScreen')

  const rows = (startups ?? []).map(startup => {
    const sr = (reviews ?? []).filter(r => r.startup_id === startup.id && r.submitted_at)
    const avgScore = sr.length > 0 ? sr.reduce((s, r) => s + (r.weighted_total ?? 0), 0) / sr.length : null
    const yesCnt = sr.filter(r => r.recommendation === 'YES').length
    const maybeCnt = sr.filter(r => r.recommendation === 'MAYBE').length
    const noCnt = sr.filter(r => r.recommendation === 'NO').length
    let overallRec: Recommendation | null = null
    if (sr.length > 0) {
      if (yesCnt >= maybeCnt && yesCnt >= noCnt) overallRec = 'YES'
      else if (maybeCnt >= noCnt) overallRec = 'MAYBE'
      else overallRec = 'NO'
    }

    const assignedIds = (assignments ?? []).filter(a => a.startup_id === startup.id).map(a => a.ic_member_id)
    const assignedMembers = healthMembers.filter(m => assignedIds.includes(m.id))

    const reviewerStatuses = assignedMembers.map(m => {
      const r = (reviews ?? []).find(r => r.startup_id === startup.id && r.ic_member_id === m.id)
      return {
        name: m.name,
        submitted: Boolean(r?.submitted_at),
        draft: Boolean(r && !r.submitted_at && !r.passed),
        passed: Boolean(r?.passed),
        score: r?.submitted_at ? r.weighted_total : null,
        rec: r?.submitted_at ? r.recommendation : null,
      }
    })

    return { startup, avgScore, yesCnt, maybeCnt, noCnt, overallRec, reviewerStatuses, reviewCount: sr.length }
  })

  const total = rows.length
  const reviewed = rows.filter(r => r.reviewCount > 0).length

  const STAGES = [
    { status: 'pending_review',        label: 'Pending Review' },
    { status: 'pre_screening',         label: 'Pre-Screen' },
    { status: 'to_review_sector_ic',   label: 'Sector IC' },
    { status: 'to_review_general_ic',  label: 'General IC' },
    { status: 'ok_for_pitching',       label: 'Pitching' },
    { status: 'in_dd',                 label: 'Due Diligence' },
    { status: 'invested',              label: 'Geïnvesteerd' },
    { status: 'rejected',              label: 'Afgewezen' },
  ] as const

  const stageCounts = STAGES.map(({ status, label }) => ({
    label,
    status,
    count: (startups ?? []).filter(s => s.status === status).length,
  })).filter(s => s.count > 0)

  const yesCount    = rows.filter(r => r.overallRec === 'YES').length
  const maybeCount  = rows.filter(r => r.overallRec === 'MAYBE').length
  const noCount     = rows.filter(r => r.overallRec === 'NO').length
  const avgAll      = rows.filter(r => r.avgScore != null).length > 0
    ? rows.reduce((s, r) => s + (r.avgScore ?? 0), 0) / rows.filter(r => r.avgScore != null).length
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-brand-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="text-white/60 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-px h-5 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
              <span className="text-teal-300 font-bold text-xs">H</span>
            </div>
            <span className="text-white font-semibold text-sm">Health IC</span>
          </div>
          <span className="text-white/40 text-xs ml-auto hidden sm:block">
            {total} proposities · {reviewed} beoordeeld
          </span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Health IC — Overzicht</h1>
          <p className="text-gray-500 mt-1">{total} proposities in de Health pipeline</p>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="card py-3 px-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-400 mt-1">Totaal</p>
          </div>
          <div className="card py-3 px-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{reviewed}</p>
            <p className="text-xs text-gray-400 mt-1">Beoordeeld</p>
          </div>
          <div className="card py-3 px-4 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {avgAll != null ? avgAll.toFixed(2) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Gem. score /5</p>
          </div>
          <div className="card py-3 px-4 text-center">
            <p className="text-2xl font-bold">
              <span className="text-green-600">{yesCount}</span>
              <span className="text-gray-300 text-lg"> / </span>
              <span className="text-amber-500">{maybeCount}</span>
              <span className="text-gray-300 text-lg"> / </span>
              <span className="text-red-500">{noCount}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">YES / MAYBE / NO</p>
          </div>
        </div>

        {/* Pipeline status breakdown */}
        {stageCounts.length > 0 && (
          <div className="card p-0 overflow-hidden mb-6">
            <div className="flex divide-x divide-gray-100">
              {stageCounts.map(({ label, status, count }) => (
                <div key={status} className="flex-1 py-3 px-4 text-center min-w-0">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}


        {rows.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            Geen Health startups in de pipeline.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map(({ startup, avgScore, yesCnt, maybeCnt, noCnt, overallRec, reviewerStatuses, reviewCount }) => (
              <div key={startup.id} className="card">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-gray-900">{startup.name}</h2>
                      <SectorBadge sector={startup.sector} sectorRaw={startup.sector_raw} />
                      <StatusBadge status={startup.status} />
                      {overallRec && <RecommendationBadge recommendation={overallRec} />}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{startup.one_liner}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {startup.pitch_deck_url && (
                      <a
                        href={startup.pitch_deck_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-accent text-xs px-3 py-1.5"
                      >
                        Pitch Deck
                      </a>
                    )}
                    <Link
                      href={`/admin/startups/${startup.id}`}
                      className="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
                    >
                      View →
                    </Link>
                  </div>
                </div>

                {/* Key figures */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {startup.stage && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400">Stage</p>
                      <p className="text-sm font-semibold text-gray-800">{startup.stage}</p>
                    </div>
                  )}
                  {startup.funding_target && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400">Target</p>
                      <p className="text-sm font-semibold text-gray-800">€{Number(startup.funding_target).toLocaleString('nl-NL')}</p>
                    </div>
                  )}
                  {startup.amount_committed && startup.amount_committed !== '0' && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400">Committed</p>
                      <p className="text-sm font-semibold text-gray-800">€{Number(startup.amount_committed).toLocaleString('nl-NL')}</p>
                    </div>
                  )}
                  {startup.location && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400">Locatie</p>
                      <p className="text-sm font-semibold text-gray-800">{startup.location}</p>
                    </div>
                  )}
                </div>

                {/* Traction snippet */}
                {startup.traction && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Traction</p>
                    <p className="text-sm text-gray-700 line-clamp-3">{startup.traction}</p>
                  </div>
                )}

                {/* Review scores */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    {reviewCount > 0 ? (
                      <>
                        <div className="text-sm">
                          <span className="text-gray-400 mr-1">Avg score:</span>
                          <span className="font-bold text-gray-900">{avgScore?.toFixed(2)}/5</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-green-600 font-semibold">{yesCnt} YES</span>
                          {' · '}
                          <span className="text-amber-600 font-semibold">{maybeCnt} MAYBE</span>
                          {' · '}
                          <span className="text-red-500 font-semibold">{noCnt} NO</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Nog geen reviews ingediend</span>
                    )}

                    {/* Per-reviewer status */}
                    {reviewerStatuses.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap ml-auto">
                        {reviewerStatuses.map(r => (
                          <div key={r.name} className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                r.submitted ? 'bg-green-500' :
                                r.draft     ? 'bg-amber-400' :
                                r.passed    ? 'bg-gray-300' :
                                              'bg-gray-200'
                              }`}
                            />
                            <span className="text-xs text-gray-600">{r.name.split(' ')[0]}</span>
                            {r.score != null && (
                              <span className="text-xs font-semibold text-gray-800">{r.score.toFixed(1)}</span>
                            )}
                            {r.rec && (
                              <RecommendationBadge recommendation={r.rec} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
