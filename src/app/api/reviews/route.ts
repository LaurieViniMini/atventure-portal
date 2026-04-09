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
    // Stage 2 scores
    score_team,
    score_market,
    score_10x,
    score_must_have,
    score_business_model,
    score_product_ip,
    score_validation,
    score_impact,
    score_competition,
    score_gtm,
    score_financials,
    // Stage 1 gating
    gate_10x,
    gate_problem_significance,
    gate_must_have,
    gate_no_harm,
    // Qualitative
    diverse_team,
    key_risks,
    // Flags
    pass,
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
    score_team: score_team ?? 0,
    score_market: score_market ?? 0,
    score_10x: score_10x ?? 0,
    score_must_have: score_must_have ?? 0,
    score_business_model: score_business_model ?? 0,
    score_product_ip: score_product_ip ?? 0,
    score_validation: score_validation ?? 0,
    score_impact: score_impact ?? 0,
    score_competition: score_competition ?? 0,
    score_gtm: score_gtm ?? 0,
    score_financials: score_financials ?? 0,
  }

  const weighted_total = calculateWeightedTotal(scores)

  const payload = {
    ...scores,
    // Stage 1 gating
    gate_10x: gate_10x ?? null,
    gate_problem_significance: gate_problem_significance ?? null,
    gate_must_have: gate_must_have ?? null,
    gate_no_harm: gate_no_harm ?? null,
    // Qualitative
    diverse_team: diverse_team ?? null,
    key_risks: key_risks ?? null,
    // Pass flag
    passed: pass ?? false,
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
