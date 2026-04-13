import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import AdminActions from './AdminActions'
import AdminTable from './AdminTable'
import type { Startup, Review, Recommendation } from '@/lib/types'

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

const PIPELINE_STAGES = [
  { status: 'pre_screening',        label: 'Pre-Screen' },
  { status: 'to_review_sector_ic',  label: 'Sector IC' },
  { status: 'to_review_general_ic', label: 'General IC' },
  { status: 'ok_for_pitching',      label: 'Pitching' },
  { status: 'in_dd',                label: 'Due Diligence' },
] as const

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const [
    { data: startups = [] },
    { data: reviews = [] },
    { data: assignments = [] },
  ] = await Promise.all([
    adminClient.from('startups').select('*').order('created_at', { ascending: false }) as unknown as Promise<{ data: Startup[] | null }>,
    adminClient.from('reviews').select('*') as unknown as Promise<{ data: Review[] | null }>,
    adminClient.from('startup_reviewers').select('startup_id, ic_member_id, ic_members(id, name)') as unknown as Promise<{ data: { startup_id: string; ic_member_id: string; ic_members: { id: string; name: string } }[] | null }>,
  ])

  // Aggregate stats per startup
  type ReviewerStatus = { name: string; submitted: boolean; draft: boolean; passed: boolean }
  type StartupStats = {
    startup: Startup
    reviewCount: number
    avgScore: number | null
    yesCnt: number
    maybeCnt: number
    noCnt: number
    overallRec: Recommendation | null
    reviewers: ReviewerStatus[]
  }

  const stats: StartupStats[] = (startups ?? []).map((startup) => {
    const sr = (reviews ?? []).filter(
      (r) => r.startup_id === startup.id && r.submitted_at
    )
    const reviewCount = sr.length
    const avgScore =
      reviewCount > 0
        ? sr.reduce((sum, r) => sum + (r.weighted_total ?? 0), 0) / reviewCount
        : null
    const yesCnt = sr.filter((r) => r.recommendation === 'YES').length
    const maybeCnt = sr.filter((r) => r.recommendation === 'MAYBE').length
    const noCnt = sr.filter((r) => r.recommendation === 'NO').length

    let overallRec: Recommendation | null = null
    if (reviewCount > 0) {
      if (yesCnt >= maybeCnt && yesCnt >= noCnt) overallRec = 'YES'
      else if (maybeCnt >= noCnt) overallRec = 'MAYBE'
      else overallRec = 'NO'
    }

    const assigned = (assignments ?? []).filter(a => a.startup_id === startup.id)
    const reviewers: ReviewerStatus[] = assigned.map(a => {
      const r = (reviews ?? []).find(r => r.startup_id === startup.id && r.ic_member_id === a.ic_member_id)
      return {
        name: a.ic_members?.name ?? '?',
        submitted: Boolean(r?.submitted_at),
        draft: Boolean(r && !r.submitted_at && !r.passed),
        passed: Boolean(r?.passed),
      }
    })

    return { startup, reviewCount, avgScore, yesCnt, maybeCnt, noCnt, overallRec, reviewers }
  })

  const pipeline = PIPELINE_STAGES.map(({ status, label }) => {
    const group = (startups ?? []).filter((s) => s.status === status)
    const avgDays = group.length > 0
      ? Math.round(group.reduce((sum, s) => sum + daysSince(s.created_at), 0) / group.length)
      : null
    return { status, label, count: group.length, avgDays }
  })

  const completedReviews = (reviews ?? []).filter((r) => r.submitted_at)
  const avgReviewDays = completedReviews.length > 0
    ? Math.round(
        completedReviews.reduce((sum, r) => {
          const d = Math.floor((new Date(r.submitted_at!).getTime() - new Date(r.created_at).getTime()) / 86_400_000)
          return sum + Math.max(0, d)
        }, 0) / completedReviews.length
      )
    : null

  const investedCount = (startups ?? []).filter((s) => s.status === 'invested').length
  const rejectedCount = (startups ?? []).filter((s) => s.status === 'rejected').length

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-brand-dark shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <span className="text-accent font-bold text-sm">A</span>
            </div>
            <span className="text-white font-semibold">AtVenture</span>
            <span className="hidden sm:block text-white/40 text-xs ml-1">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/health-ic" className="text-white/60 hover:text-white text-sm transition-colors">
              Health IC
            </Link>
            <Link href="/admin/ic-members" className="text-white/60 hover:text-white text-sm transition-colors">
              IC Members
            </Link>
            <Link href="/review" className="text-white/60 hover:text-white text-sm transition-colors">
              My Reviews
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-white/60 hover:text-white text-sm transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deal Flow</h1>
            <p className="text-gray-500 mt-0.5">
              {startups?.length ?? 0} startups in pipeline
            </p>
          </div>
          <AdminActions />
        </div>

        {/* Pipeline overview */}
        <div className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
            {pipeline.map(({ status, label, count, avgDays }, i) => (
              <div key={status} className="card py-3 px-4 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 font-medium">{i + 1}.</span>
                  <span className="text-xs text-gray-500 font-medium truncate">{label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                {avgDays !== null ? (
                  <p className={`text-xs font-medium ${avgDays > 30 ? 'text-red-500' : avgDays > 14 ? 'text-amber-500' : 'text-gray-400'}`}>
                    gem. {avgDays}d in systeem
                  </p>
                ) : (
                  <p className="text-xs text-gray-300">—</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>
              <span className="font-semibold text-green-700">{investedCount}</span> geïnvesteerd
            </span>
            <span>
              <span className="font-semibold text-red-500">{rejectedCount}</span> afgewezen
            </span>
            {avgReviewDays !== null && (
              <span>
                gem. <span className="font-semibold text-gray-700">{avgReviewDays}d</span> per review
              </span>
            )}
          </div>
        </div>

        <AdminTable rows={stats} />
      </div>
    </div>
  )
}
