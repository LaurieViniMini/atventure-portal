import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const adminClient = createAdminClient()

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: logs, error: logsError }, { data: startups, error: startupsError }] =
    await Promise.all([
      adminClient
        .from('webhook_logs')
        .select('id, received_at, result, error, body')
        .gte('received_at', since)
        .order('received_at', { ascending: false })
        .limit(20),
      adminClient
        .from('startups')
        .select('id, name, sector, status, wix_submission_id, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
    ])

  return NextResponse.json({
    webhook_logs: logsError ? { error: logsError.message } : logs,
    recent_startups: startupsError ? { error: startupsError.message } : startups,
  })
}
