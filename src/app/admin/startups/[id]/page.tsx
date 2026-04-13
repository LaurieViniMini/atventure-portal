import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { SCORE_CRITERIA, GATING_CRITERIA } from '@/lib/criteria'
import RecommendationBadge from '@/components/RecommendationBadge'
import StatusBadge from '@/components/StatusBadge'
import SectorBadge from '@/components/SectorBadge'
import StatusUpdater from './StatusUpdater'
import SectorUpdater from './SectorUpdater'
import SendInvitesButton from './SendInvitesButton'
import ReviewerManager from './ReviewerManager'
import ReviewDetail from './ReviewDetail'
import DeleteButton from './DeleteButton'
import AiAssessButton from './AiAssessButton'
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
  if (user.email !== (process.env.ADMIN_EMAIL ?? '').trim()) redirect('/review')

  const adminClient = createAdminClient()

  const { data: startup } = await adminClient
    .from('startups')
    .select('*')
    .eq('id', id)
    .single<Startup>()

  if (!startup) notFound()

  // Get reviews with member info (submitted only)
  const { data: reviews = [] } = await adminClient
    .from('reviews')
    .select('*, ic_members(*)')
    .eq('startup_id', startup.id)
    .not('submitted_at', 'is', null) as { data: ReviewWithMember[] | null }

  // All IC members for reviewer management
  const { data: allMembers = [] } = await adminClient
    .from('ic_members')
    .select('*')
    .order('name') as { data: IcMember[] | null }

  // Current explicit reviewer assignments
  const { data: assignments = [] } = await adminClient
    .from('startup_reviewers')
    .select('ic_member_id')
    .eq('startup_id', startup.id)

  const assignedIds = (assignments ?? []).map((a) => a.ic_member_id as string)
  const assignedMembers = (allMembers ?? []).filter((m) => assignedIds.includes(m.id))
  const assignedNames = assignedMembers.map((m) => m.name)

  // Compute aggregates
  const submitted = reviews ?? []
  const avgPerCriterion: Record<string, number> = {}
  SCORE_CRITERIA.forEach(({ key }) => {
    avgPerCriterion[key] =
      submitted.length === 0
        ? 0
        : submitted.reduce((sum, r) => sum + (r[key] ?? 0), 0) / submitted.length
  })
  const avgTotal =
    submitted.length > 0
      ? submitted.reduce((sum, r) => sum + (r.weighted_total ?? 0), 0) / submitted.length
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

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-gray-800">{children}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-brand-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="text-white/60 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                <h1 className="text-2xl font-bold text-gray-900">{startup.name}</h1>
                <SectorBadge sector={startup.sector} sectorRaw={startup.sector_raw} />
                <StatusBadge status={startup.status} />
                {overallRec && <RecommendationBadge recommendation={overallRec} />}
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
                assignedCount={assignedIds.length}
                assignedNames={assignedNames}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{submitted.length}</p>
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

        {/* Sector + Status updater */}
        <div className="card space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Sector</h2>
            <SectorUpdater startupId={startup.id} currentSector={startup.sector} currentSectorRaw={startup.sector_raw} />
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Status</h2>
              <DeleteButton startupId={startup.id} />
            </div>
            <StatusUpdater startupId={startup.id} currentStatus={startup.status} />
          </div>
        </div>

        {/* AI pre-screening assessment */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.416a1 1 0 01-.73.321H9.56a1 1 0 01-.73-.321l-.347-.416z" />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900">AI Pre-Screening</h2>
            </div>
            <AiAssessButton startupId={startup.id} />
          </div>

          {startup.ai_gate_scores ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  startup.ai_gate_scores.recommendation === 'proceed' ? 'bg-green-100 text-green-700' :
                  startup.ai_gate_scores.recommendation === 'discuss'  ? 'bg-amber-100 text-amber-700' :
                                                                          'bg-red-100 text-red-600'
                }`}>
                  {startup.ai_gate_scores.recommendation === 'proceed' ? 'Doorgaan' :
                   startup.ai_gate_scores.recommendation === 'discuss'  ? 'Bespreken' : 'Afwijzen'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {([
                  { key: 'ten_x',     label: '10x' },
                  { key: 'eu_based',  label: 'EU' },
                  { key: 'stage',     label: 'Stage' },
                  { key: 'no_harm',   label: 'No Harm' },
                  { key: 'must_have', label: 'Must-Have' },
                ] as const).map(({ key, label }) => {
                  const gate = (startup.ai_gate_scores as NonNullable<typeof startup.ai_gate_scores>)[key]
                  return (
                    <div key={key} className={`rounded-lg p-3 text-center ${
                      gate.score === 1  ? 'bg-green-50 border border-green-100' :
                      gate.score === -1 ? 'bg-red-50 border border-red-100' :
                                          'bg-gray-50 border border-gray-100'
                    }`}>
                      <p className={`text-lg font-bold ${
                        gate.score === 1 ? 'text-green-600' : gate.score === -1 ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {gate.score === 1 ? '✓' : gate.score === -1 ? '✗' : '—'}
                      </p>
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">{label}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-tight">{gate.reason}</p>
                    </div>
                  )
                })}
              </div>
              {startup.ai_gate_scores.summary && (
                <div className="bg-violet-50 rounded-lg p-4">
                  <p className="text-xs text-violet-400 font-medium uppercase tracking-wide mb-1">AI samenvatting</p>
                  <p className="text-sm text-gray-700">{startup.ai_gate_scores.summary}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Nog geen AI-beoordeling. Klik op de knop om er een te genereren.</p>
          )}
        </div>

        {/* Reviewer management */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-1">Reviewer Assignment</h2>
          <ReviewerManager
            startupId={startup.id}
            allMembers={allMembers ?? []}
            assignedIds={assignedIds}
          />
        </div>

        {/* Wix application details */}
        {(startup.contact_name || startup.contact_email || startup.stage || startup.funding_target) && (
          <div className="card space-y-5">
            <h2 className="font-semibold text-gray-900">Application Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {startup.website && (
                <Field label="Website">
                  <a href={startup.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{startup.website}</a>
                </Field>
              )}
              {startup.location && <Field label="Location">{startup.location}</Field>}
              {startup.founding_date && <Field label="Founding date">{startup.founding_date}</Field>}
              {startup.contact_name && <Field label="Contact">{startup.contact_name}</Field>}
              {startup.contact_email && (
                <Field label="Contact email">
                  <a href={`mailto:${startup.contact_email}`} className="text-primary hover:underline">{startup.contact_email}</a>
                </Field>
              )}
              {startup.contact_phone && <Field label="Phone">{startup.contact_phone}</Field>}
              {startup.stage && <Field label="Stage">{startup.stage}</Field>}
              {startup.business_model_description && <Field label="Business model">{startup.business_model_description}</Field>}
              {startup.funding_raised && <Field label="Funding raised">{startup.funding_raised}</Field>}
              {startup.funding_target && <Field label="Round target">{startup.funding_target}</Field>}
              {startup.amount_committed && <Field label="Committed">{startup.amount_committed}</Field>}
              {startup.round_type && <Field label="Round type">{startup.round_type}</Field>}
              {startup.mrr && <Field label="MRR">{startup.mrr}</Field>}
              {startup.how_heard && <Field label="How heard">{startup.how_heard}</Field>}
            </div>

            {startup.traction && (
              <Field label="Traction highlights">
                <p className="whitespace-pre-line text-gray-700 text-sm">{startup.traction}</p>
              </Field>
            )}
            {startup.impact && (
              <Field label="Impact / Sustainability">
                <p className="whitespace-pre-line text-gray-700 text-sm">{startup.impact}</p>
              </Field>
            )}
          </div>
        )}

        {/* Per-reviewer scores */}
        {submitted.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Reviewer Scores</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[130px]">
                      Reviewer
                    </th>
                    {/* Stage 1 gates */}
                    {GATING_CRITERIA.map((c) => (
                      <th
                        key={c.key}
                        className="text-center px-2 py-3 font-medium text-amber-600 whitespace-nowrap bg-amber-50"
                        title={c.question}
                      >
                        G-{c.label.split(' ')[0].slice(0, 3).toUpperCase()}
                      </th>
                    ))}
                    <th className="text-center px-2 py-3 font-medium text-amber-600 whitespace-nowrap bg-amber-50" title="No Harm">
                      G-NH
                    </th>
                    {/* Stage 2 scores */}
                    {SCORE_CRITERIA.map((c) => (
                      <th
                        key={c.key}
                        className="text-center px-2 py-3 font-medium text-gray-600 whitespace-nowrap"
                        title={c.question}
                      >
                        {c.label.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3)}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium text-gray-600 bg-primary/5">
                      Total
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">Rec.</th>
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
                      {GATING_CRITERIA.map((c) => (
                        <td key={c.key} className="px-2 py-3 text-center text-amber-700 bg-amber-50/50">
                          {review[c.key] ?? '—'}
                        </td>
                      ))}
                      <td className="px-2 py-3 text-center text-amber-700 bg-amber-50/50">
                        {review.gate_no_harm ?? '—'}
                      </td>
                      {SCORE_CRITERIA.map((c) => (
                        <td key={c.key} className="px-2 py-3 text-center text-gray-700">
                          {review[c.key] ?? '—'}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-bold text-gray-900 bg-primary/5">
                        {review.weighted_total?.toFixed(2) ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <RecommendationBadge recommendation={review.recommendation} />
                      </td>
                      <td className="px-3 py-3 text-gray-500 max-w-xs">
                        <p className="truncate">{review.comments || '—'}</p>
                      </td>
                    </tr>
                  ))}

                  {/* Aggregate row */}
                  <tr className="bg-primary/5 border-t-2 border-primary/20 font-semibold">
                    <td className="px-4 py-3 text-gray-700 sticky left-0 bg-primary/5">Average</td>
                    {GATING_CRITERIA.map((c) => (
                      <td key={c.key} className="px-2 py-3 text-center text-amber-700">
                        {submitted.length > 0
                          ? (submitted.reduce((s, r) => s + (r[c.key] ?? 0), 0) / submitted.length).toFixed(1)
                          : '—'}
                      </td>
                    ))}
                    <td className="px-2 py-3 text-center text-amber-700">
                      {submitted.length > 0
                        ? (submitted.reduce((s, r) => s + (r.gate_no_harm ?? 0), 0) / submitted.length).toFixed(1)
                        : '—'}
                    </td>
                    {SCORE_CRITERIA.map((c) => (
                      <td key={c.key} className="px-2 py-3 text-center text-gray-700">
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

            {/* Legend */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 font-medium mb-1">Stage 2 Legend:</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {SCORE_CRITERIA.map((c) => (
                  <span key={c.key} className="text-xs text-gray-400">
                    <span className="font-medium text-gray-500">
                      {c.label.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3)}
                    </span>{' '}
                    = {c.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Per-reviewer full detail */}
        <ReviewDetail reviews={submitted} />

        {submitted.length === 0 && (
          <div className="card text-center py-10 text-gray-400">
            No submitted reviews yet. Send invitations to IC members to start collecting scores.
          </div>
        )}
      </div>
    </div>
  )
}
