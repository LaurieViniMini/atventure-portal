import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateWeightedTotal } from '@/lib/weighted-score'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    startup_id,
    ic_member_id,
    score_market,
    score_audience,
    score_competition,
    score_gtm,
    score_value_prop,
    score_financials,
    score_product_ip,
    score_business_model,
    score_team,
    score_timing,
    score_validation,
    score_risks,
    comments,
    recommendation,
    submit,
    existing_review_id,
  } = body

  const adminClient = createAdminClient()

  // Verify this ic_member belongs to the authenticated user
  const { data: member } = await adminClient
    .from('ic_members')
    .select('id')
    .eq('id', ic_member_id)
    .eq('auth_user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const scores = {
    score_market,
    score_audience,
    score_competition,
    score_gtm,
    score_value_prop,
    score_financials,
    score_product_ip,
    score_business_model,
    score_team,
    score_timing,
    score_validation,
    score_risks,
  }

  const weighted_total = calculateWeightedTotal(scores)

  const payload = {
    ...scores,
    weighted_total,
    comments: comments ?? '',
    recommendation: recommendation ?? null,
    ...(submit ? { submitted_at: new Date().toISOString() } : {}),
  }

  let result

  if (existing_review_id) {
    // Check it's not already submitted
    const { data: existing } = await adminClient
      .from('reviews')
      .select('submitted_at')
      .eq('id', existing_review_id)
      .single()

    if (existing?.submitted_at) {
      return NextResponse.json(
        { error: 'Review already submitted and locked' },
        { status: 400 }
      )
    }

    result = await adminClient
      .from('reviews')
      .update(payload)
      .eq('id', existing_review_id)
      .select()
      .single()
  } else {
    result = await adminClient
      .from('reviews')
      .insert({ startup_id, ic_member_id, ...payload })
      .select()
      .single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ review: result.data })
}
