import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/is-admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  // Optional: only invite reviewers who haven't been invited yet
  const onlyNew = body.onlyNew !== false

  const adminClient = createAdminClient()

  // Find all ic_members who have at least one startup assigned
  const { data: assignments, error: assignErr } = await adminClient
    .from('startup_reviewers')
    .select('ic_member_id, last_invited_at')

  if (assignErr) return NextResponse.json({ error: assignErr.message }, { status: 500 })

  // Get distinct member IDs — optionally filter to those never invited
  const memberIdSet = new Set<string>()
  for (const a of assignments ?? []) {
    if (onlyNew && a.last_invited_at) continue
    memberIdSet.add(a.ic_member_id)
  }

  if (memberIdSet.size === 0) {
    return NextResponse.json({ count: 0, message: 'Geen reviewers om uit te nodigen.' })
  }

  const { data: members, error: memberErr } = await adminClient
    .from('ic_members')
    .select('id, email, name')
    .in('id', [...memberIdSet])

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://atventure-portal.vercel.app'
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const now = new Date().toISOString()

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

      // Mark all their assignments as invited
      await adminClient
        .from('startup_reviewers')
        .update({ last_invited_at: now })
        .eq('ic_member_id', member.id)

      return member.email
    })
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<string>).value)
  const failed = results
    .filter((r) => r.status === 'rejected')
    .map((r) => (r as PromiseRejectedResult).reason?.message)

  return NextResponse.json({ count: succeeded.length, invited: succeeded, failed, total: members?.length ?? 0 })
}
