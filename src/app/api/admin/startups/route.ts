import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function verifyAdmin(user: { email?: string } | null) {
  return user?.email === process.env.ADMIN_EMAIL
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !(await verifyAdmin(user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, one_liner, sector, pitch_deck_url } = body

  if (!name || !sector) {
    return NextResponse.json(
      { error: 'Name and sector are required' },
      { status: 400 }
    )
  }

  if (!['General', 'Retail', 'Health', 'Food'].includes(sector)) {
    return NextResponse.json({ error: 'Invalid sector' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('startups')
    .insert({ name, one_liner, sector, pitch_deck_url, status: 'pending_review' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ startup: data }, { status: 201 })
}
