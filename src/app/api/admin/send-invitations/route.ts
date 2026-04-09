import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createBrowserClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== (process.env.ADMIN_EMAIL ?? '').trim()) {
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

  // Check if there are explicit reviewer assignments
  const { data: assignments } = await adminClient
    .from('startup_reviewers')
    .select('ic_member_id')
    .eq('startup_id', startupId)

  let members

  if (assignments && assignments.length > 0) {
    // Send only to explicitly assigned reviewers
    const ids = assignments.map((a) => a.ic_member_id)
    const { data, error } = await adminClient
      .from('ic_members')
      .select('id, email, name')
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    members = data
  } else {
    // Fall back to sector-based
    const { data, error } = await adminClient
      .from('ic_members')
      .select('id, email, name')
      .in('ic_type', [sector, 'All'])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    members = data
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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
