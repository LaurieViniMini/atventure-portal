import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SectorBadge from '@/components/SectorBadge'
import type { Startup, Review, IcMember } from '@/lib/types'

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
    startups = data ?? []
  } else {
    // Fall back to sector-based assignment (excluding rejected)
    let query = adminClient
      .from('startups')
      .select('*')
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })

    if (member.ic_type !== 'All') {
      query = query.eq('sector', member.ic_type)
    }

    const { data } = await query
    startups = (data as Startup[]) ?? []
  }

  // Get all reviews by this member
  const { data: reviews = [] } = await adminClient
    .from('reviews')
    .select('*')
    .eq('ic_member_id', member.id) as { data: Review[] | null }

  const reviewMap = new Map(reviews?.map((r) => [r.startup_id, r]))

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
            {user.email === process.env.ADMIN_EMAIL && (
              <Link href="/admin" className="text-white/60 hover:text-white text-sm transition-colors">
                Admin
              </Link>
            )}
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

        {startups.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            No startups assigned yet. Check back soon.
          </div>
        ) : (
          <div className="space-y-4">
            {startups.map((startup) => {
              const review = reviewMap.get(startup.id)
              const isPassed = review?.passed
              const statusLabel = isPassed
                ? 'Passed'
                : review?.submitted_at
                ? 'Submitted'
                : review
                ? 'Draft'
                : 'Not started'
              const statusClass = isPassed
                ? 'bg-gray-100 text-gray-400'
                : review?.submitted_at
                ? 'bg-green-100 text-green-700'
                : review
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'

              return (
                <Link
                  key={startup.id}
                  href={`/review/${startup.id}`}
                  className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-md hover:border-primary/20 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {startup.name}
                      </h3>
                      <SectorBadge sector={startup.sector} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {startup.one_liner}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                    {review?.submitted_at && !isPassed && review.weighted_total != null && (
                      <span className="text-sm font-bold text-gray-700">
                        {review.weighted_total.toFixed(2)}
                        <span className="text-gray-400 font-normal">/5</span>
                      </span>
                    )}
                    <svg
                      className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
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
