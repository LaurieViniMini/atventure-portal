import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Simple debug endpoint — shows recent webhook activity
// Visit: /api/admin/wix-debug
export async function GET() {
  const adminClient = createAdminClient()

  // Check recent startups inserted in the last 48 hours
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: recent, error } = await adminClient
    .from('startups')
    .select('id, name, sector, status, wix_submission_id, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    info: 'Startups inserted in the last 48h via webhook',
    count: recent?.length ?? 0,
    startups: recent,
  })
}
