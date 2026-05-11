import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/is-admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      ? `set (starts with: ${process.env.ANTHROPIC_API_KEY.slice(0, 10)}...)`
      : 'NOT SET',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ? 'set' : 'NOT SET',
  })
}
