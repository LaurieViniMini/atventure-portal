import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// POST — assign a reviewer to a startup
export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { startup_id, ic_member_id } = await request.json()
  if (!startup_id || !ic_member_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('startup_reviewers')
    .insert({ startup_id, ic_member_id })

  if (error && error.code !== '23505') {
    // 23505 = unique violation (already assigned), ignore
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE — remove a reviewer from a startup
export async function DELETE(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { startup_id, ic_member_id } = await request.json()
  if (!startup_id || !ic_member_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('startup_reviewers')
    .delete()
    .eq('startup_id', startup_id)
    .eq('ic_member_id', ic_member_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
