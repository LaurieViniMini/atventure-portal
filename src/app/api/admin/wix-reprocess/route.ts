import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { Sector } from '@/lib/types'

function mapSector(raw: string): Sector {
  const s = (raw || '').toLowerCase()
  if (s.includes('health') || s.includes('wellbeing') || s.includes('wellness') || s.includes('medical') || s.includes('care')) return 'Health'
  if (s.includes('food') || s.includes('beverage') || s.includes('agri') || s.includes('nutrition') || s.includes('restaurant')) return 'Food'
  if (s.includes('retail') || s.includes('fashion') || s.includes('ecommerce') || s.includes('e-commerce') || s.includes('consumer')) return 'Retail'
  return 'General'
}

function get(fields: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (fields[key]) return String(fields[key]).trim()
  }
  return ''
}

function extractFromPayload(payload: Record<string, unknown>): Record<string, string> {
  const arr = payload.submissions
  if (!Array.isArray(arr)) return {}
  const map: Record<string, string> = {}
  for (const item of arr) {
    const e = item as { label?: string; value?: unknown }
    if (e.label) map[e.label] = String(e.value ?? '')
  }
  return map
}

// POST /api/admin/wix-reprocess
// Re-processes all failed webhook_log entries from the last 48h and inserts missing startups
export async function POST() {
  const adminClient = createAdminClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get all failed/rejected logs from last 7 days
  const { data: logs, error: logsError } = await adminClient
    .from('webhook_logs')
    .select('id, body, received_at')
    .or('result.like.error_%,result.eq.rejected_secret')
    .gte('received_at', since)

  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 })
  if (!logs?.length) return NextResponse.json({ message: 'No failed logs to reprocess', inserted: 0 })

  // Deduplicate by submissionId
  const seen = new Set<string>()
  const results: { submissionId: string; status: string; name?: string }[] = []

  for (const log of logs) {
    const body = log.body as Record<string, unknown>
    const payload = body?._payload as Record<string, unknown> | undefined
    if (!payload) continue

    const submissionId = String(payload.submissionId || '')
    if (!submissionId || seen.has(submissionId)) continue
    seen.add(submissionId)

    const fields = extractFromPayload(payload)
    const name = get(fields, 'Company name')
    if (!name) continue

    // Skip if already in DB
    const { data: existing } = await adminClient
      .from('startups')
      .select('id')
      .eq('wix_submission_id', submissionId)
      .maybeSingle()

    if (existing) {
      results.push({ submissionId, status: 'already_exists', name })
      continue
    }

    const rawSector = get(fields, 'Industry / Sector', 'sector')
    const firstName = get(fields, 'Primary contact first name')
    const lastName = get(fields, 'Primary contact last name')

    const startup = {
      name,
      sector_raw: rawSector || null,
      one_liner: get(fields, 'Brief company description (max 300 characters)', 'Brief company description').slice(0, 500),
      sector: mapSector(rawSector),
      pitch_deck_url: get(fields, 'Or share a link to your pitchdeck', 'Pitch deck', 'Please share your pitchdeck'),
      status: 'pending_review' as const,
      website: get(fields, 'Company website'),
      location: get(fields, 'Company primary location'),
      founding_date: get(fields, 'Founding Date', 'Founding date'),
      contact_name: [firstName, lastName].filter(Boolean).join(' '),
      contact_email: get(fields, 'Primary contact email address'),
      contact_phone: get(fields, 'Primary contact phone number'),
      business_model_description: get(fields, 'Business Model', 'Business model'),
      stage: get(fields, 'Stage'),
      funding_raised: get(fields, 'Total funding raised to date (EUR)'),
      traction: get(fields, 'Key traction highlights (revenue, customers, users, etc.)', 'Key traction highlights'),
      mrr: get(fields, 'Monthly recurring revenue (EUR, if applicable)', 'Monthly recurring revenue (if applicable)'),
      funding_target: get(fields, 'Current funding round target (EUR)'),
      amount_committed: get(fields, 'Amount already committed (EUR)'),
      round_type: get(fields, 'Type of round (equity, convertible, SAFE, other)', 'Type of round'),
      impact: get(fields, 'How is your company contributing to a more inclusive, diverse, or sustainable world?'),
      how_heard: get(fields, 'How did you hear about AtVenture?'),
      wix_submission_id: submissionId,
    }

    const { error: insertError } = await adminClient.from('startups').insert(startup)
    results.push({ submissionId, status: insertError ? 'error: ' + insertError.message : 'inserted', name })
  }

  const inserted = results.filter(r => r.status === 'inserted').length
  return NextResponse.json({ inserted, results })
}
