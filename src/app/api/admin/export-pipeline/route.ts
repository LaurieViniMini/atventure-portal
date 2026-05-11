import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/is-admin'

const STAGE_LABELS: Record<string, string> = {
  pre_screening:        'Pre-Screen',
  to_review_sector_ic:  'Sector IC',
  to_review_general_ic: 'General IC',
  ok_for_pitching:      'Pitching',
  in_dd:                'Due Diligence',
  pending_review:       'Pending',
  reviewed:             'Reviewed',
  invited:              'Invited',
}

const STAGE_COLORS: Record<string, string> = {
  pre_screening:        '#9B7FA0',
  to_review_sector_ic:  '#7E6381',
  to_review_general_ic: '#6B5270',
  ok_for_pitching:      '#CBB56D',
  in_dd:                '#B09A52',
}

const SECTOR_COLORS: Record<string, string> = {
  Health:  '#10b981',
  Food:    '#f59e0b',
  Retail:  '#3b82f6',
  General: '#8b5cf6',
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const [{ data: startups }, { data: reviews }] = await Promise.all([
    adminClient
      .from('startups')
      .select('id, name, sector, sector_raw, status, one_liner, business_model_description, location, funding_target, round_type')
      .not('status', 'in', '("rejected","invested")')
      .order('sector')
      .order('name'),
    adminClient
      .from('reviews')
      .select('startup_id, weighted_total, recommendation, submitted_at')
      .not('submitted_at', 'is', null),
  ])

  if (!startups?.length) {
    return new NextResponse('Geen startups gevonden.', { status: 200 })
  }

  // Group by sector (use canonical sector, not sector_raw)
  const grouped: Record<string, typeof startups> = {}
  for (const s of startups) {
    if (!grouped[s.sector]) grouped[s.sector] = []
    grouped[s.sector].push(s)
  }

  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const total = startups.length

  const sectorBlocks = Object.keys(grouped).sort().map(sector => {
    const items = grouped[sector]
    const color = SECTOR_COLORS[sector] ?? '#6b7280'

    // Sector-level review stats
    const sectorReviews = (reviews ?? []).filter(r => items.some(s => s.id === r.startup_id))
    const totalReviews = sectorReviews.length
    const sectorAvg = totalReviews > 0
      ? sectorReviews.reduce((sum, r) => sum + (r.weighted_total ?? 0), 0) / totalReviews
      : null
    const sectorYes   = sectorReviews.filter(r => r.recommendation === 'YES').length
    const sectorMaybe = sectorReviews.filter(r => r.recommendation === 'MAYBE').length
    const sectorNo    = sectorReviews.filter(r => r.recommendation === 'NO').length

    const rows = items.map(s => {
      const stageColor = STAGE_COLORS[s.status] ?? '#9ca3af'
      const stageLabel = STAGE_LABELS[s.status] ?? s.status
      const funding = [s.round_type, s.funding_target].filter(Boolean).join(' · ')

      const sr = (reviews ?? []).filter(r => r.startup_id === s.id)
      const rc = sr.length
      const avg = rc > 0 ? sr.reduce((sum, r) => sum + (r.weighted_total ?? 0), 0) / rc : null
      const yc = sr.filter(r => r.recommendation === 'YES').length
      const mc = sr.filter(r => r.recommendation === 'MAYBE').length
      const nc = sr.filter(r => r.recommendation === 'NO').length

      const scoreCell = rc === 0
        ? `<span style="color:#d1d5db; font-size:11px;">—</span>`
        : `<div style="font-weight:700; color:#1f2937; font-size:13px;">${avg!.toFixed(1)}<span style="color:#9ca3af; font-weight:400; font-size:10px;">/5</span></div>
           <div style="font-size:10px; color:#6b7280;">${rc} reviewer${rc !== 1 ? 's' : ''}</div>
           <div style="margin-top:3px; display:flex; gap:2px;">
             <span style="background:#10b98120; color:#10b981; border-radius:3px; padding:0px 4px; font-size:10px; font-weight:700;">${yc}Y</span>
             <span style="background:#f59e0b20; color:#f59e0b; border-radius:3px; padding:0px 4px; font-size:10px; font-weight:700;">${mc}M</span>
             <span style="background:#ef444420; color:#ef4444; border-radius:3px; padding:0px 4px; font-size:10px; font-weight:700;">${nc}N</span>
           </div>`

      const oneLiner = truncate(s.one_liner ?? '', 80)
      const bizModel = truncate(s.business_model_description ?? '', 80)

      return `
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:0; width:4px; background:${color};"></td>
          <td style="padding:9px 12px; vertical-align:middle; overflow:hidden;">
            <div style="font-weight:700; color:#1f2937; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escape(s.name)}</div>
            ${s.location ? `<div style="color:#9ca3af; font-size:10px; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📍 ${escape(s.location)}</div>` : ''}
          </td>
          <td style="padding:9px 12px; vertical-align:middle; overflow:hidden;">
            <span style="font-size:10px; font-weight:600; color:${color}; background:${color}18; border:1px solid ${color}30; border-radius:4px; padding:2px 6px; white-space:nowrap;">${escape(s.sector_raw || s.sector)}</span>
          </td>
          <td style="padding:9px 12px; color:#4b5563; font-size:11px; vertical-align:middle; overflow:hidden;">${escape(oneLiner)}</td>
          <td style="padding:9px 12px; color:#6b7280; font-size:11px; vertical-align:middle; overflow:hidden;">${escape(bizModel)}</td>
          <td style="padding:9px 12px; vertical-align:middle; overflow:hidden;">
            ${funding ? `<div style="color:#1f2937; font-size:11px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escape(funding)}</div>` : '<span style="color:#d1d5db; font-size:11px;">—</span>'}
          </td>
          <td style="padding:9px 12px; vertical-align:middle; white-space:nowrap;">
            <span style="display:inline-block; background:${stageColor}20; color:${stageColor}; border:1px solid ${stageColor}40; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:600;">${stageLabel}</span>
          </td>
          <td style="padding:9px 12px; vertical-align:middle;">${scoreCell}</td>
        </tr>`
    }).join('')

    const reviewSummary = totalReviews === 0
      ? `<span style="color:#9ca3af; font-size:12px;">No reviews yet</span>`
      : `<span style="font-size:13px; font-weight:700; color:#1f2937;">${sectorAvg!.toFixed(1)}<span style="color:#9ca3af; font-weight:400; font-size:11px;">/5</span></span>
         <span style="margin-left:8px; font-size:12px; color:#6b7280;">${totalReviews} review${totalReviews !== 1 ? 's' : ''}</span>
         <span style="margin-left:10px; display:inline-flex; gap:4px; align-items:center;">
           <span style="background:#10b98120; color:#10b981; border-radius:4px; padding:1px 6px; font-size:11px; font-weight:700;">${sectorYes} YES</span>
           <span style="background:#f59e0b20; color:#f59e0b; border-radius:4px; padding:1px 6px; font-size:11px; font-weight:700;">${sectorMaybe} MAYBE</span>
           <span style="background:#ef444420; color:#ef4444; border-radius:4px; padding:1px 6px; font-size:11px; font-weight:700;">${sectorNo} NO</span>
         </span>`

    return `
      <div style="margin-bottom:32px; break-inside:avoid;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:12px; height:12px; border-radius:50%; background:${color}; flex-shrink:0;"></div>
            <h2 style="margin:0; font-size:15px; font-weight:700; color:#1f2937; letter-spacing:0.01em;">${sector}</h2>
            <span style="background:${color}18; color:${color}; border:1px solid ${color}30; border-radius:999px; padding:1px 9px; font-size:12px; font-weight:700;">${items.length} startup${items.length !== 1 ? 's' : ''}</span>
          </div>
          <div style="display:flex; align-items:center;">${reviewSummary}</div>
        </div>
        <table style="width:100%; border-collapse:collapse; table-layout:fixed; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:0; width:4px; background:${color};"></th>
              <th style="padding:8px 12px; text-align:left; font-size:10px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.06em; width:15%;">Company</th>
              <th style="padding:8px 14px; text-align:left; font-size:10px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.06em; width:10%;">Sector</th>
              <th style="padding:8px 14px; text-align:left; font-size:10px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.06em; width:22%;">Description</th>
              <th style="padding:8px 14px; text-align:left; font-size:10px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.06em; width:22%;">Business Model</th>
              <th style="padding:8px 14px; text-align:left; font-size:10px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.06em; width:14%;">Funding Need</th>
              <th style="padding:8px 14px; text-align:left; font-size:10px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.06em; width:12%;">Stage</th>
              <th style="padding:8px 14px; text-align:left; font-size:10px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.06em; width:12%;">Score</th>
            </tr>
          </thead>
          <tbody style="background:white;">
            ${rows}
          </tbody>
        </table>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AtVenture Pipeline — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; color: #111827; }
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm 2cm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <div style="max-width:1000px; margin:0 auto; padding:32px 24px;">

    <!-- Header -->
    <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:32px; padding-bottom:20px; border-bottom:2px solid #3E152A;">
      <div>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <div style="width:32px; height:32px; background:#3E152A; border-radius:8px; display:flex; align-items:center; justify-content:center;">
            <span style="color:#CBB56D; font-weight:800; font-size:16px;">A</span>
          </div>
          <span style="font-size:20px; font-weight:800; color:#3E152A; letter-spacing:-0.02em;">AtVenture</span>
        </div>
        <p style="font-size:22px; font-weight:700; color:#1f2937; margin-top:12px;">Pipeline Overview</p>
        <p style="color:#6b7280; font-size:13px; margin-top:3px;">${date}</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:40px; font-weight:800; color:#3E152A; line-height:1;">${total}</p>
        <p style="font-size:12px; color:#6b7280; font-weight:500; margin-top:2px;">startups in pipeline</p>
      </div>
    </div>

    <!-- Sector blocks -->
    ${sectorBlocks}

    <!-- Footer -->
    <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:11px; color:#9ca3af;">Confidential — for internal use only</span>
      <span style="font-size:11px; color:#9ca3af;">AtVenture &copy; ${new Date().getFullYear()}</span>
    </div>

    <!-- Print button (hidden when printing) -->
    <div class="no-print" style="margin-top:24px; text-align:center;">
      <button onclick="window.print()" style="background:#3E152A; color:white; border:none; padding:10px 24px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; cursor:pointer;">
        Save as PDF (Ctrl+P)
      </button>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escape(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str
}
