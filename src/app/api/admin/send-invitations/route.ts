import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createBrowserClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { startupId, sector } = body

  if (!startupId || !sector) {
    return NextResponse.json(
      { error: 'startupId and sector are required' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  // Get IC members for this sector (including 'All' catch-all)
  const { data: members, error: membersError } = await adminClient
    .from('ic_members')
    .select('id, email, name')
    .in('ic_type', [sector, 'All'])

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Use a stateless anon client (no session cookies) so OTPs are sent
  // independently of the currently logged-in admin session
  const anonClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const results = await Promise.allSettled(
    (members ?? []).map(async (member) => {
      const { error } = await anonClient.auth.signInWithOtp({
        email: member.email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          shouldCreateUser: true,
        },
      })
      if (error) throw new Error(`${member.email}: ${error.message}`)
      return member.email
    })
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results
    .filter((r) => r.status === 'rejected')
    .map((r) => (r as PromiseRejectedResult).reason?.message)

  return NextResponse.json({ count: succeeded, failed, total: members?.length ?? 0 })
}
