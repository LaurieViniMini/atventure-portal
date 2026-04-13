import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { Sector } from '@/lib/types'

const VALID_SECTORS: Sector[] = ['General', 'Retail', 'Health', 'Food']

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
  const {
    name, one_liner, sector, sector_raw, pitch_deck_url,
    website, location, founding_date,
    contact_name, contact_email, contact_phone,
    business_model_description, stage,
    funding_raised, mrr, funding_target, amount_committed, round_type,
    traction, impact, how_heard,
  } = body

  if (!name) {
    return NextResponse.json({ error: 'Bedrijfsnaam is verplicht' }, { status: 400 })
  }

  const resolvedSector: Sector = VALID_SECTORS.includes(sector) ? sector : 'General'

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('startups')
    .insert({
      name,
      one_liner: one_liner || null,
      sector: resolvedSector,
      sector_raw: sector_raw || null,
      pitch_deck_url: pitch_deck_url || null,
      status: 'pending_review',
      website: website || null,
      location: location || null,
      founding_date: founding_date || null,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      business_model_description: business_model_description || null,
      stage: stage || null,
      funding_raised: funding_raised || null,
      mrr: mrr || null,
      funding_target: funding_target || null,
      amount_committed: amount_committed || null,
      round_type: round_type || null,
      traction: traction || null,
      impact: impact || null,
      how_heard: how_heard || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ startup: data }, { status: 201 })
}
