import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { SCORE_CRITERIA } from '@/lib/criteria'
import RecommendationBadge from '@/components/RecommendationBadge'
import StatusBadge from '@/components/StatusBadge'
import SectorBadge from '@/components/SectorBadge'
import StatusUpdater from './StatusUpdater'
import SendInvitesButton from './SendInvitesButton'
import type { Startup, IcMember, ReviewWithMember, Recommendation } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function StartupDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.email !== process.env.ADMIN_EMAIL) redirect('/review')

  const adminClient = createAdminClient()

  const { data: startup } = await adminClient
    .from('startups')
    .select('*')
    .eq('id', id)
    .single<Startup>()

  if (!startup) notFound()

  // Get reviews with member info
  const { data: reviews = [] } = await adminClient
    .from('reviews')
    .select('*, ic_members(*)')
    .eq('startup_id', startup.id)
    .not('submitted_at', 'is', null) as { data: ReviewWithMember[] | null }

  // Compute aggregates
  const submitted = reviews ?? []
  const avgPerCriterion: Record<string, number> = {}
  SCORE_CRITERIA.forEach(({ key }) => {
    if (submitted.length === 0) {
      avgPerCriterion[key] = 0
    } else {
      avgPerCriterion[key] =
        submitted.reduce((sum, r) => sum + (r[key] ?? 0), 0) / submitted.length
    }
  })
  const avgTotal =
    submitted.length > 0
      ? submitted.reduce((sum, r) => sum + (r.weighted_total ?? 0), 0) /
        submitted.length
      : null

  const yesCnt = submitted.filter((r) => r.recommendation === 'YES').length
  const maybeCnt = submitted.filter((r) => r.recommendation === 'MAYBE').length
  const noCnt = submitted.filter((r) => r.recommendation === 'NO').length

  let overallRec: Recommendation | null = null
  if (submitted.length > 0) {
    if (yesCnt >= maybeCnt && yesCnt >= noCnt) overallRec = 'YES'
    else if (maybeCnt >= noCnt) overallRec = 'MAYBE'
    else overallRec = 'NO'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-brand-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/admin"
            className="text-white/60 hover:text-white transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div className="w-px h-5 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <span className="text-accent font-bold text-xs">A</span>
            </div>
            <span className="text-white font-semibold text-sm">AtVenture</span>
            <span className="text-white/40 text-xs ml-1">Admin</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Startup header */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {startup.name}
                </h1>
                <SectorBadge sector={startup.sector} />
                <StatusBadge status={startup.status} />
                {overallRec && (
                  <RecommendationBadge recommendation={overallRec} />
                )}
              </div>
              <p className="text-gray-500 mt-2">{startup.one_liner}</p>
            </div>
            <div className="flex gap-3 shrink-0 flex-wrap">
              {startup.pitch_deck_url && (
                <a
                  href={startup.pitch_deck_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-accent text-sm"
                >
                  Pitch Deck
                </a>
              )}
              <SendInvitesButton
                startupId={startup.id}
                sector={startup.sector}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {submitted.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Reviews submitted</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {avgTotal != null ? avgTotal.toFixed(2) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Avg score /5</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">
                <span className="text-green-600">{yesCnt}</span>
                <span className="text-gray-300 text-lg"> / </span>
                <span className="text-amber-600">{maybeCnt}</span>
                <span className="text-gray-300 text-lg"> / </span>
                <span className="text-red-500">{noCnt}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">YES / MAYBE / NO</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="flex justify-center">
                <RecommendationBadge recommendation={overallRec} />
              </div>
              <p className="text-xs text-gray-500 mt-2">Overall rec.</p>
            </div>
          </div>
        </div>

        {/* Status updater */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Update Status</h2>
          <StatusUpdater startupId={startup.id} currentStatus={startup.status} />
        </div>

        {/* Per-reviewer scores */}
        {submitted.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                Reviewer Scores
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[130px]">
                      Reviewer
                    </th>
                    {SCORE_CRITERIA.map((c) => (
                      <th
                        key={c.key}
                        className="text-center px-2 py-3 font-medium text-gray-600 whitespace-nowrap"
                        title={c.question}
                      >
                        {c.label
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 3)}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium text-gray-600 bg-primary/5">
                      Total
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">
                      Rec.
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 min-w-[200px]">
                      Comments
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submitted.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 sticky left-0 bg-white">
                        {review.ic_members?.name ?? '—'}
                      </td>
                      {SCORE_CRITERIA.map((c) => (
                        <td
                          key={c.key}
                          className="px-2 py-3 text-center text-gray-700"
                        >
                          {review[c.key] ?? '—'}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-bold text-gray-900 bg-primary/5">
                        {review.weighted_total?.toFixed(2) ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <RecommendationBadge
                          recommendation={review.recommendation}
                        />
                      </td>
                      <td className="px-3 py-3 text-gray-500 max-w-xs">
                        <p className="truncate">{review.comments || '—'}</p>
                      </td>
                    </tr>
                  ))}

                  {/* Aggregate row */}
                  <tr className="bg-primary/5 border-t-2 border-primary/20 font-semibold">
                    <td className="px-4 py-3 text-gray-700 sticky left-0 bg-primary/5">
                      Average
                    </td>
                    {SCORE_CRITERIA.map((c) => (
                      <td
                        key={c.key}
                        className="px-2 py-3 text-center text-gray-700"
                      >
                        {avgPerCriterion[c.key].toFixed(1)}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center font-bold text-primary">
                      {avgTotal?.toFixed(2) ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <RecommendationBadge recommendation={overallRec} />
                    </td>
                    <td className="px-3 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Column legend */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 font-medium mb-1">Legend:</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {SCORE_CRITERIA.map((c) => (
                  <span key={c.key} className="text-xs text-gray-400">
                    <span className="font-medium text-gray-500">
                      {c.label
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 3)}
                    </span>{' '}
                    = {c.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {submitted.length === 0 && (
          <div className="card text-center py-10 text-gray-400">
            No submitted reviews yet. Send invitations to IC members to start
            collecting scores.
          </div>
        )}
      </div>
    </div>
  )
}
