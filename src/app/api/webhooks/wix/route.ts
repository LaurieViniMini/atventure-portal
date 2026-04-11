import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { Sector } from '@/lib/types'

// Map Wix sector values to our sectors
function mapSector(raw: string): Sector {
  const s = (raw || '').toLowerCase()
  if (s.includes('health') || s.includes('wellbeing') || s.includes('wellness') || s.includes('medical') || s.includes('care')) return 'Health'
  if (s.includes('food') || s.includes('beverage') || s.includes('agri') || s.includes('nutrition') || s.includes('restaurant')) return 'Food'
  if (s.includes('retail') || s.includes('fashion') || s.includes('ecommerce') || s.includes('e-commerce') || s.includes('consumer')) return 'Retail'
  return 'General'
}

// Extract fields from various Wix webhook payload formats
function extractFields(body: Record<string, unknown>): Record<string, string> {
  // Format 1: { submissions: { "Field label": "value" } }
  if (body.submissions && typeof body.submissions === 'object') {
    return body.submissions as Record<string, string>
  }
  // Format 2: { data: { submissions: { ... } } }
  if (body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>
    if (data.submissions && typeof data.submissions === 'object') {
      return data.submissions as Record<string, string>
    }
    if (data.fields && typeof data.fields === 'object') {
      return data.fields as Record<string, string>
    }
  }
  // Format 3: { fields: { ... } }
  if (body.fields && typeof body.fields === 'object') {
    return body.fields as Record<string, string>
  }
  // Format 4: flat body — treat entire body as fields
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

  // Secret check temporarily disabled for debugging
  // TODO: re-enable once field mapping is confirmed working

  const fields = extractFields(body)

  // Map Wix field labels to our database fields
  const name = get(fields, 'Company name', 'company_name', 'name')
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
    ).slice(0, 500),
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
    wix_submission_id: String(body.submissionId || body.id || ''),
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('startups')
    .insert(startup)
    .select()
    .single()

  if (error) {
    await logWebhook(body, 'db_error', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logWebhook(body, 'inserted:' + data.id)
  return NextResponse.json({ success: true, startup_id: data.id }, { status: 201 })
}
