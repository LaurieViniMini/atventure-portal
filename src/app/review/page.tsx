import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SectorBadge from '@/components/SectorBadge'
import { isAdmin } from '@/lib/is-admin'
import type { Startup, Review, IcMember } from '@/lib/types'

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function flagPriority(s: Startup): number {
  if (s.is_urgent)            return 1
  if (s.is_angel_accelerator) return 2
  if (s.is_already_in_dd)     return 5
  if (s.is_not_urgent)        return 4
  return 3 // neutraal
}

function sortStartups(list: Startup[]): Startup[] {
  return [...list].sort((a, b) => {
    const diff = flagPriority(a) - flagPriority(b)
    if (diff !== 0) return diff
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export const dynamic = 'force-dynamic'

export default async function ReviewDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  // Get the IC member record
  const { data: member } = await adminClient
    .from('ic_members')
    .select('*')
    .eq('email', user.email!)
    .maybeSingle<IcMember>()

  if (!member) {
    if (isAdmin(user.email)) redirect('/admin')
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-sm text-center">
          <p className="text-gray-700 font-medium">Not authorised</p>
          <p className="text-sm text-gray-500 mt-1">
            Your email address is not registered as an IC member. Please contact
            Laurie.
          </p>
        </div>
      </div>
    )
  }

  const isPreScreen = member.ic_type === 'PreScreen'

  // Check if there are any explicit reviewer assignments for this member
  const { data: assignments } = await adminClient
    .from('startup_reviewers')
    .select('startup_id')
    .eq('ic_member_id', member.id)

  let startups: Startup[] = []

  if (assignments && assignments.length > 0) {
    // If explicitly assigned to specific startups, show only those
    const assignedIds = assignments.map((a) => a.startup_id)
    const { data } = await adminClient
      .from('startups')
      .select('*')
      .in('id', assignedIds)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
    startups = sortStartups(data ?? [])
  } else if (isPreScreen) {
    // PreScreen members see all startups (they pre-screen everything)
    const { data } = await adminClient
      .from('startups')
      .select('*')
      .neq('status', 'rejected')
      .neq('status', 'invested')
      .order('created_at', { ascending: false })
    startups = sortStartups((data as Startup[]) ?? [])
  } else {
    // Regular IC: sector-based, exclude pre_screening and rejected
    let query = adminClient
      .from('startups')
      .select('*')
      .neq('status', 'rejected')
      .neq('status', 'pre_screening')
      .neq('status', 'pending_review')
      .order('created_at', { ascending: false })

    if (member.ic_type !== 'All') {
      query = query.eq('sector', member.ic_type)
    }

    const { data } = await query
    startups = sortStartups((data as Startup[]) ?? [])
  }

  // Get all reviews by this member
  const { data: reviews = [] } = await adminClient
    .from('reviews')
    .select('*')
    .eq('ic_member_id', member.id) as { data: Review[] | null }

  const reviewMap = new Map(reviews?.map((r) => [r.startup_id, r]))

  const submittedCount = startups.filter((s) => reviewMap.get(s.id)?.submitted_at).length
  const draftCount = startups.filter((s) => {
    const r = reviewMap.get(s.id)
    return r && !r.submitted_at && !r.passed
  }).length
  const notStartedCount = startups.filter((s) => !reviewMap.get(s.id)).length

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-brand-dark shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <span className="text-accent font-bold text-sm">A</span>
            </div>
            <span className="text-white font-semibold">AtVenture</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/70 text-sm hidden sm:block">
              {member.name}
            </span>
            <Link href="/admin" className="text-white/60 hover:text-white text-sm transition-colors">
              Admin
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Hi {member.name}
          </h1>
          <p className="text-gray-500 mt-1">
            Your assigned startups for review — {member.ic_type} sector
            {member.ic_type === 'All' ? 's' : ''}
          </p>
        </div>

        {startups.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card py-3 px-4 text-center">
              <p className="text-2xl font-bold text-green-600">{submittedCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">Submitted</p>
            </div>
            <div className="card py-3 px-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{draftCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">Draft</p>
            </div>
            <div className="card py-3 px-4 text-center">
              <p className="text-2xl font-bold text-gray-400">{notStartedCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">Not started</p>
            </div>
          </div>
        )}

        {startups.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            No startups assigned yet. Check back soon.
          </div>
        ) : (
          <div className="space-y-3">
            {startups.map((startup) => {
              const review = reviewMap.get(startup.id)
              const isPassed = review?.passed
              const isSubmitted = !!review?.submitted_at && !isPassed
              const isDraft = !!review && !review.submitted_at && !isPassed

              // Left border colour based on flag
              const borderColor = startup.is_urgent
                ? 'border-l-red-500'
                : startup.is_angel_accelerator
                ? 'border-l-amber-400'
                : startup.is_not_urgent
                ? 'border-l-green-400'
                : startup.is_already_in_dd
                ? 'border-l-blue-400'
                : 'border-l-gray-200'

              // Submitted cards look clearly "done"
              const cardBg = isPassed
                ? 'bg-gray-50 opacity-60'
                : isSubmitted
                ? 'bg-green-50/40'
                : 'bg-white'

              return (
                <Link
                  key={startup.id}
                  href={`/review/${startup.id}`}
                  className={`block rounded-xl border border-gray-200 border-l-4 ${borderColor} ${cardBg} px-5 py-4 shadow-sm hover:shadow-md transition-all group`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">

                    {/* Left: name + meta */}
                    <div className="flex-1 min-w-0">

                      {/* Flag badges — solid, square-ish, icon-led */}
                      {(startup.is_urgent || startup.is_angel_accelerator || startup.is_not_urgent || startup.is_already_in_dd) && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {startup.is_urgent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-500 text-white">
                              ⚡ Urgent
                            </span>
                          )}
                          {startup.is_angel_accelerator && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-400 text-white">
                              ✦ Angel Accelerator
                            </span>
                          )}
                          {startup.is_not_urgent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-gray-300 text-gray-500 bg-white">
                              Niet urgent
                            </span>
                          )}
                          {startup.is_already_in_dd && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-500 text-white">
                              Already in DD
                            </span>
                          )}
                        </div>
                      )}

                      {/* Name + sector */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold text-base group-hover:text-primary transition-colors ${isPassed ? 'text-gray-400' : 'text-gray-900'}`}>
                          {startup.name}
                        </h3>
                        {/* Sector: subtle, outline style to differ from flag badges */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal border border-gray-200 text-gray-500 bg-white">
                          {startup.sector_raw || startup.sector}
                        </span>
                      </div>

                      <p className={`text-sm mt-0.5 truncate ${isPassed ? 'text-gray-400' : 'text-gray-500'}`}>
                        {startup.one_liner}
                      </p>

                      {startup.admin_notes && (
                        <div className="flex items-start gap-1.5 mt-2 bg-violet-50 border border-violet-100 rounded px-2.5 py-1.5 text-xs text-violet-700">
                          <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {startup.admin_notes}
                        </div>
                      )}
                    </div>

                    {/* Right: review status — prominent */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0">
                      {isPassed ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-400">
                          Overgeslagen
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-green-100 text-green-700 border border-green-200">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Ingediend
                        </span>
                      ) : isDraft ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.83a4 4 0 01-1.897 1.06l-2.685.671.671-2.685a4 4 0 011.06-1.897z" />
                          </svg>
                          Concept
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-primary text-white group-hover:bg-primary/90 transition-colors">
                          Beoordelen
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      )}

                      {isSubmitted && review.weighted_total != null && (
                        <span className="text-lg font-extrabold text-green-700">
                          {review.weighted_total.toFixed(2)}
                          <span className="text-sm font-normal text-gray-400">/5</span>
                        </span>
                      )}

                      {(() => {
                        const d = daysSince(startup.created_at)
                        return (
                          <span className={`text-xs ${d > 30 ? 'text-red-400' : d > 14 ? 'text-amber-500' : 'text-gray-300'}`}>
                            {d}d
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
