import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const VALID_STATUSES = [
  'pre_screening', 'to_review_sector_ic', 'to_review_general_ic',
  'ok_for_pitching', 'in_dd', 'rejected', 'invested',
  'pending_review', 'reviewed', 'invited', 'portco',
]

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== (process.env.ADMIN_EMAIL ?? '').trim()) return null
  return user
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()

  const update: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }

  // All editable fields
  const fields = [
    'name', 'one_liner', 'sector', 'sector_raw', 'pitch_deck_url',
    'website', 'location', 'founding_date',
    'contact_name', 'contact_email', 'contact_phone',
    'business_model_description', 'stage',
    'funding_raised', 'mrr', 'funding_target', 'amount_committed', 'round_type',
    'traction', 'impact', 'how_heard',
  ]
  for (const field of fields) {
    if (body[field] !== undefined) update[field] = body[field] || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Fetch current status before update (to detect rejected transition)
  const { data: before } = await adminClient
    .from('startups')
    .select('status, contact_email, contact_name, name')
    .eq('id', id)
    .single()

  const { data, error } = await adminClient
    .from('startups')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send rejection email if status just changed to 'rejected'
  if (
    update.status === 'rejected' &&
    before?.status !== 'rejected' &&
    before?.contact_email
  ) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@atventure.vc'
      const startupName = before.name ?? data.name ?? 'uw startup'
      const contactName = before.contact_name?.split(' ')[0] || 'there'

      await resend.emails.send({
        from: fromEmail,
        to: before.contact_email,
        subject: `Update on your AtVenture application — ${startupName}`,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="background: #1a1a2e; padding: 24px 32px; border-radius: 8px 8px 0 0;">
    <span style="color: #fff; font-size: 20px; font-weight: bold;">AtVenture</span>
  </div>
  <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Dear ${contactName},</p>
    <p>Thank you for submitting <strong>${startupName}</strong> to AtVenture and for the time you invested in sharing your story with us.</p>
    <p>After careful review by our investment committee, we have decided not to proceed with your application at this time. This decision does not reflect the quality of your work — we receive many strong applications, and our focus areas and investment criteria are specific.</p>
    <p>We genuinely appreciate the innovation and effort you are putting into building your company, and we wish you every success on your journey ahead.</p>
    <p>If your circumstances change significantly or you raise a new round in the future, we would welcome the opportunity to reconnect.</p>
    <p style="margin-top: 32px;">With kind regards,</p>
    <p><strong>The AtVenture Team</strong><br/>
    <a href="https://atventure.vc" style="color: #6366f1;">atventure.vc</a></p>
  </div>
</div>
        `.trim(),
      })
    } catch (emailErr) {
      // Don't fail the request if email fails — log and continue
      console.error('Failed to send rejection email:', emailErr)
    }
  }

  return NextResponse.json({ startup: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('startups').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
