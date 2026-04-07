import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReviewForm from '@/components/ReviewForm'
import type { Startup, Review, IcMember } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ startupId: string }>
}

export default async function ReviewPage({ params }: Props) {
  const { startupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const [{ data: startup }, { data: member }] = await Promise.all([
    adminClient
      .from('startups')
      .select('*')
      .eq('id', startupId)
      .single<Startup>(),
    adminClient
      .from('ic_members')
      .select('*')
      .eq('email', user.email!)
      .maybeSingle<IcMember>(),
  ])

  if (!startup) notFound()
  if (!member) redirect('/review')

  // Check sector access
  const hasAccess =
    member.ic_type === 'All' || member.ic_type === startup.sector
  if (!hasAccess) redirect('/review')

  const { data: existingReview } = await adminClient
    .from('reviews')
    .select('*')
    .eq('startup_id', startup.id)
    .eq('ic_member_id', member.id)
    .maybeSingle<Review>()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-brand-dark shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/review"
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
          </div>
          <span className="text-white/40 text-sm hidden sm:block ml-auto">
            {member.name}
          </span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <ReviewForm
          startup={startup}
          existingReview={existingReview}
          icMemberId={member.id}
        />
      </div>
    </div>
  )
}
