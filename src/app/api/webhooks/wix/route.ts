import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Sector } from '@/lib/types'

// Map Wix sector values to our sectors
function mapSector(raw: string): Sector {
  const s = (raw || '').toLowerCase()
  if (s.includes('health') || s.includes('wellbeing') || s.includes('wellness') || s.includes('medical') || s.includes('care')) return 'Health'
  if (s.includes('food') || s.includes('beverage') || s.includes('agri') || s.includes('nutrition') || s.includes('restaurant')) return 'Food'
  if (s.includes('retail') || s.includes('fashion') || s.includes('ecommerce') || s.includes('e-commerce') || s.includes('consumer')) return 'Retail'
  return 'General'
  // Note: sectors like Fintech, SaaS, etc. fall under General — sector_raw preserves the original value
}

// Extract fields from various Wix webhook payload formats
function extractFields(body: Record<string, unknown>): Record<string, string> {
  // Helper: convert submissions array [{label, value}] to {label: value}
  function submissionsArrayToMap(arr: unknown[]): Record<string, string> {
    const map: Record<string, string> = {}
    for (const item of arr) {
      const entry = item as { label?: string; value?: unknown }
      if (entry.label) map[entry.label] = String(entry.value ?? '')
    }
    return map
  }

  // Format 1: Wix Velo — { _payload: { submissions: [{label, value}] } }
  if (body._payload && typeof body._payload === 'object') {
    const p = body._payload as Record<string, unknown>
    if (Array.isArray(p.submissions)) {
      return submissionsArrayToMap(p.submissions)
    }
  }

  // Format 2: { submissions: [{label, value}] } (array)
  if (Array.isArray(body.submissions)) {
    return submissionsArrayToMap(body.submissions)
  }

  // Format 3: { submissions: { "Field label": "value" } } (object)
  if (body.submissions && typeof body.submissions === 'object') {
    return body.submissions as Record<string, string>
  }

  // Format 4: { data: { submissions: { ... } } }
  if (body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>
    if (Array.isArray(data.submissions)) return submissionsArrayToMap(data.submissions)
    if (data.submissions && typeof data.submissions === 'object') return data.submissions as Record<string, string>
    if (data.fields && typeof data.fields === 'object') return data.fields as Record<string, string>
  }

  // Format 5: { fields: { ... } }
  if (body.fields && typeof body.fields === 'object') {
    return body.fields as Record<string, string>
  }

  // Format 6: flat body
  return body as Record<string, string>
}

function get(fields: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (fields[key]) return String(fields[key]).trim()
  }
  return ''
}

async function logWebhook(body: unknown, result: string, error?: string) {
  try {
    const adminClient = createAdminClient()
    await adminClient.from('webhook_logs').insert({ body, result, error: error ?? null })
  } catch {
    // ignore log failures
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  let rawText = ''
  try {
    rawText = await request.text()
    body = JSON.parse(rawText)
  } catch {
    await logWebhook({ rawText }, 'invalid_json')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  await logWebhook(body, 'received')

  // Verify webhook secret
  const secret = process.env.WEBHOOK_SECRET
  if (secret) {
    const headerSecret = request.headers.get('x-webhook-secret')
    const bodySecret = String(body.secret || body.webhook_secret || '')
    if (headerSecret !== secret && bodySecret !== secret) {
      await logWebhook(body, 'rejected_secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const fields = extractFields(body)

  // Map Wix field labels to our database fields
  const name = get(fields, 'Company name', 'company_name', 'name', 'Name')
  if (!name) {
    await logWebhook(body, 'error_no_name', `fields keys: ${Object.keys(fields).join(', ')}`)
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  const rawSector = get(fields, 'Industry / Sector', 'Industry/Sector', 'sector', 'industry')
  const sector = mapSector(rawSector)

  const firstName = get(fields, 'Primary contact first name', 'contact_first_name', 'first_name')
  const lastName  = get(fields, 'Primary contact last name',  'contact_last_name',  'last_name')
  const contactName = [firstName, lastName].filter(Boolean).join(' ')

  // Pitch deck: prefer direct URL link, fall back to Wix file upload URL
  const pitchDeckUrl =
    get(fields, 'Or share a link to your pitchdeck') ||
    get(fields, 'Pitch deck') ||
    get(fields, 'Please share your pitchdeck') ||
    get(fields, 'pitch_deck_url')

  const startup = {
    name,
    sector_raw: rawSector || null,
    one_liner: get(
      fields,
      'Brief company description (max 300 characters)',
      'Brief company description',
      'description',
      'one_liner'
    ),
    sector,
    pitch_deck_url: pitchDeckUrl,
    status: 'pending_review' as const,
    // Extra Wix fields — exact label names from the form
    website:       get(fields, 'Company website', 'website'),
    location:      get(fields, 'Company primary location', 'location'),
    founding_date: get(fields, 'Founding Date', 'Founding date', 'founding_date'),
    contact_name:  contactName,
    contact_email: get(fields, 'Primary contact email address', 'contact_email', 'email'),
    contact_phone: get(fields, 'Primary contact phone number', 'contact_phone', 'phone'),
    business_model_description: get(fields, 'Business Model', 'Business model', 'business_model'),
    stage:            get(fields, 'Stage', 'stage'),
    funding_raised:   get(fields, 'Total funding raised to date (EUR)', 'funding_raised'),
    traction:         get(fields, 'Key traction highlights (revenue, customers, users, etc.)', 'Key traction highlights', 'traction'),
    mrr:              get(fields, 'Monthly recurring revenue (if applicable)', 'Monthly recurring revenue (EUR, if applicable)', 'Monthly recurring revenue', 'mrr'),
    funding_target:   get(fields, 'Current funding round target (EUR)', 'funding_target'),
    amount_committed: get(fields, 'Amount already committed (EUR)', 'amount_committed'),
    round_type:       get(fields, 'Type of round (equity, convertible, SAFE, other)', 'Type of round', 'round_type'),
    impact:           get(fields, 'How is your company contributing to a more inclusive, diverse, or sustainable world?', 'impact'),
    how_heard:        get(fields, 'How did you hear about AtVenture?', 'how_heard'),
    wix_submission_id: String(
      body.submissionId || body.id ||
      (body._payload && typeof body._payload === 'object' ? (body._payload as Record<string, unknown>).submissionId : '') || ''
    ),
  }

  const adminClient = createAdminClient()

  // Prevent duplicates: check by wix_submission_id (preferred) or by name (fallback for retries without ID)
  if (startup.wix_submission_id) {
    const { data: existing } = await adminClient
      .from('startups')
      .select('id')
      .eq('wix_submission_id', startup.wix_submission_id)
      .maybeSingle()
    if (existing) {
      await logWebhook(body, 'skipped_duplicate:' + existing.id)
      return NextResponse.json({ success: true, startup_id: existing.id, duplicate: true }, { status: 200 })
    }
  } else {
    // No submission ID — deduplicate by name (case-insensitive) within the last 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await adminClient
      .from('startups')
      .select('id')
      .ilike('name', startup.name)
      .gte('created_at', since24h)
      .maybeSingle()
    if (existing) {
      await logWebhook(body, 'skipped_duplicate_by_name:' + existing.id)
      return NextResponse.json({ success: true, startup_id: existing.id, duplicate: true }, { status: 200 })
    }
  }

  const { data, error } = await adminClient
    .from('startups')
    .insert(startup)
    .select()
    .single()

  if (error) {
    // Unique constraint violation = duplicate submission that slipped through the race window
    if (error.code === '23505') {
      const { data: existing } = await adminClient
        .from('startups')
        .select('id')
        .eq('wix_submission_id', startup.wix_submission_id)
        .maybeSingle()
      await logWebhook(body, 'skipped_duplicate_constraint:' + (existing?.id ?? 'unknown'))
      return NextResponse.json({ success: true, startup_id: existing?.id, duplicate: true }, { status: 200 })
    }
    await logWebhook(body, 'db_error', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logWebhook(body, 'inserted:' + data.id)

  // ── AI pre-screening ──────────────────────────────────────────────
  // Run async after insert: AI gating assessment + set to pre_screening + invite pre-screeners
  try {
    const aiResult = await runAiPreScreen(data)
    await adminClient.from('startups').update({
      status: 'pre_screening',
      ai_summary: aiResult.summary,
      ai_gate_scores: aiResult,
    }).eq('id', data.id)
  } catch (aiErr) {
    console.error('AI pre-screen failed:', aiErr)
    // Still push to pre_screening even if AI fails
    await adminClient.from('startups').update({ status: 'pre_screening' }).eq('id', data.id)
  }

  // Invite all PreScreen ic_members (e.g. Anica) and assign them as reviewers
  try {
    const { data: preScreeners } = await adminClient
      .from('ic_members')
      .select('id, email')
      .eq('ic_type', 'PreScreen')

    if (preScreeners?.length) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://atventure-portal.vercel.app'
      const anonClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
      )

      await Promise.all(preScreeners.map(async (m) => {
        // Assign as reviewer
        await adminClient.from('startup_reviewers').upsert(
          { startup_id: data.id, ic_member_id: m.id },
          { onConflict: 'startup_id,ic_member_id', ignoreDuplicates: true }
        )
        // Send magic link
        await anonClient.auth.signInWithOtp({
          email: m.email,
          options: { emailRedirectTo: `${siteUrl}/auth/callback`, shouldCreateUser: true },
        })
      }))
    }
  } catch (inviteErr) {
    console.error('Pre-screener invite failed:', inviteErr)
  }

  return NextResponse.json({ success: true, startup_id: data.id }, { status: 201 })
}

// ── AI gating evaluation ─────────────────────────────────────────────
async function runAiPreScreen(startup: {
  name: string
  one_liner: string
  sector: string
  sector_raw?: string | null
  location?: string | null
  stage?: string | null
  traction?: string | null
  business_model_description?: string | null
  impact?: string | null
  round_type?: string | null
  funding_target?: string | null
}) {
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

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  let text = (message.content[0] as { type: string; text: string }).text.trim()
  // Strip markdown code fences if present (e.g. ```json ... ```)
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(text)
}
