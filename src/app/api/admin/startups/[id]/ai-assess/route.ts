import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== (process.env.ADMIN_EMAIL ?? '').trim()) return null
  return user
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()
  const { data: startup } = await adminClient
    .from('startups')
    .select('*')
    .eq('id', id)
    .single()

  if (!startup) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are evaluating a startup application for AtVenture, an impact-focused early-stage venture capital fund in Europe.

Evaluate this startup against our 5 gating criteria and provide a brief assessment for our pre-screeners.

**Startup:**
- Name: ${startup.name}
- Description: ${startup.one_liner || '(not provided)'}
- Sector: ${startup.sector_raw || startup.sector}
- Location: ${startup.location || '(not provided)'}
- Stage: ${startup.stage || '(not provided)'}
- Round type: ${startup.round_type || '(not provided)'}
- Funding target: ${startup.funding_target || '(not provided)'}
- Traction: ${startup.traction || '(not provided)'}
- Business model: ${startup.business_model_description || '(not provided)'}
- Impact: ${startup.impact || '(not provided)'}

**Gating Criteria — score each as 1 (clearly passes), 0 (unclear/neutral), or -1 (concern or fail):**
1. **10x** — Is this solution at least 10x better, faster, cheaper, or higher impact than the current alternative? Look for a step-change improvement, not an incremental one.
2. **EU-based** — Is the company headquartered in the EU or EEA? Score 1 if yes, -1 if clearly outside, 0 if unclear.
3. **Pre-seed / Seed stage** — Is the round pre-seed or seed? Score 1 if yes, -1 if Series A or later, 0 if unclear.
4. **No harm to people & planet** — Is the business model free from harm? Red flags: weapons, gambling, tobacco, fossil fuels, privacy exploitation, predatory practices. Score 1 if clearly no harm, -1 if concern, 0 if neutral.
5. **Must-have** — Does the startup solve a real, urgent problem (not just a nice-to-have)? Score 1 if clearly must-have, 0 if borderline, -1 if nice-to-have only.
6. **Scalability** — Can the business model scale beyond the initial market without proportional cost increases? Consider: digital leverage, platform effects, international expansion potential. Score 1 if clearly scalable, 0 if uncertain, -1 if structurally hard to scale.

Respond ONLY with valid JSON — no markdown, no explanation outside the JSON:
{
  "ten_x":       { "score": <-1|0|1>, "reason": "<1 sentence>" },
  "eu_based":    { "score": <-1|0|1>, "reason": "<1 sentence>" },
  "stage":       { "score": <-1|0|1>, "reason": "<1 sentence>" },
  "no_harm":     { "score": <-1|0|1>, "reason": "<1 sentence>" },
  "must_have":   { "score": <-1|0|1>, "reason": "<1 sentence>" },
  "scalability": { "score": <-1|0|1>, "reason": "<1 sentence>" },
  "summary": "<2-3 sentences for pre-screeners: what this company does, key strengths and concerns, overall impression>",
  "recommendation": "<proceed|discuss|pass>"
}`

  let result
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })
    let text = (message.content[0] as { type: string; text: string }).text.trim()
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    result = JSON.parse(text)
  } catch (err) {
    return NextResponse.json({ error: 'AI assessment failed: ' + String(err) }, { status: 500 })
  }

  await adminClient.from('startups').update({
    ai_summary: result.summary,
    ai_gate_scores: result,
  }).eq('id', id)

  return NextResponse.json({ ok: true, ai_gate_scores: result })
}
