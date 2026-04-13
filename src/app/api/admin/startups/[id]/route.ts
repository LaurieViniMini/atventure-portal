import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const VALID_STATUSES = [
  'pre_screening', 'to_review_sector_ic', 'to_review_general_ic',
  'ok_for_pitching', 'in_dd', 'rejected', 'invested',
  'pending_review', 'reviewed', 'invited', 'portco',
]

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== (process.env.ADMIN_EMAIL ?? '').trim()) return null
  return user
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()

  const update: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }

  // All editable fields
  const fields = [
    'name', 'one_liner', 'sector', 'sector_raw', 'pitch_deck_url',
    'website', 'location', 'founding_date',
    'contact_name', 'contact_email', 'contact_phone',
    'business_model_description', 'stage',
    'funding_raised', 'mrr', 'funding_target', 'amount_committed', 'round_type',
    'traction', 'impact', 'how_heard',
  ]
  for (const field of fields) {
    if (body[field] !== undefined) update[field] = body[field] || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('startups')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ startup: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('startups').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
