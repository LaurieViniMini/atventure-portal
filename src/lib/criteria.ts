// ============================================================
// STAGE 1 — GATING (scores 0–2, except no_harm 0–1)
// ============================================================
export const GATING_CRITERIA = [
  {
    key: 'gate_10x' as const,
    label: '10x Potential',
    question: 'Does the solution offer a step-change improvement: better, faster, cheaper, or more impactful than what exists?',
    options: [
      { value: 0, label: 'No clear advantage over status quo' },
      { value: 1, label: 'Meaningful improvement, but not transformational' },
      { value: 2, label: 'Clear 10x leap in one or more dimensions' },
    ],
  },
  {
    key: 'gate_problem_significance' as const,
    label: 'Problem Significance',
    question: 'How big, urgent and widespread is the problem?',
    options: [
      { value: 0, label: 'Small, niche or low-urgency problem' },
      { value: 1, label: 'Real problem, but limited in scale or urgency' },
      { value: 2, label: 'Large, widespread and urgent problem' },
    ],
  },
  {
    key: 'gate_must_have' as const,
    label: 'Must-have / Urgency',
    question: 'Is this solving a real, pressing pain? Would the target user actively seek this out?',
    options: [
      { value: 0, label: 'Nice-to-have, low urgency' },
      { value: 1, label: 'Real problem, but adoption likely slow' },
      { value: 2, label: 'Clear painkiller, users need this now' },
    ],
  },
] as const

export const NO_HARM_CRITERION = {
  key: 'gate_no_harm' as const,
  label: 'No Harm to People or Planet',
  question: 'Does the business model, product, or supply chain avoid causing harm to users, communities, or the environment?',
  options: [
    { value: 0, label: '⛔ Red flags present — hard stop, regardless of total score' },
    { value: 1, label: 'No red flags, pass to scoring' },
  ],
} as const

// ============================================================
// STAGE 2 — SCORING (scores 0–5)
// ============================================================
export const SCORE_CRITERIA = [
  {
    key: 'score_team' as const,
    label: 'Team / Founder',
    question: 'Are the founders strong, experienced and is the right team in place?',
    scale: '0 = young/inexperienced · 3 = some experience, team partially in place · 5 = skilled, experienced, strong execution',
    weight: 0.20,
  },
  {
    key: 'score_market' as const,
    label: 'Market / Scalability',
    question: 'How broad is the market and is the opportunity big enough for VC-scale returns?',
    scale: '0 = small or niche market · 3 = mid-size market with some growth · 5 = large, growing, addressable market',
    weight: 0.15,
  },
  {
    key: 'score_10x' as const,
    label: '10x Potential',
    question: 'Does the solution offer a 10x improvement: better, faster, cheaper, or more impactful than alternatives?',
    scale: '0 = incremental improvement only · 3 = meaningful but not transformational · 5 = clear 10x leap',
    weight: 0.10,
  },
  {
    key: 'score_must_have' as const,
    label: 'Must-have',
    question: 'Is this a must-have at the customer level? Would users pay for or actively seek out this solution?',
    scale: '0 = nice-to-have, low switching motivation · 3 = useful but not critical · 5 = clear painkiller, high willingness to pay',
    weight: 0.10,
  },
  {
    key: 'score_business_model' as const,
    label: 'Business Model',
    question: 'Is there a clear and realistic revenue generation model?',
    scale: '0 = no model defined · 3 = model present but untested · 5 = clear, logical and validated model',
    weight: 0.10,
  },
  {
    key: 'score_product_ip' as const,
    label: 'Product / IP',
    question: 'Is there a distinctive proposition, solid IP, or defensible product that is hard to copy?',
    scale: '0 = no IP or distinction · 3 = some differentiation, limited protection · 5 = strong IP or clear defensibility',
    weight: 0.10,
  },
  {
    key: 'score_validation' as const,
    label: 'Validation & Momentum',
    question: 'Is there market validation and is the company moving? Revenue, pilots, LOIs, waitlists, milestones.',
    scale: '0 = no validation, no movement · 3 = early signals, some traction · 5 = significant validation, strong momentum',
    weight: 0.075,
  },
  {
    key: 'score_impact' as const,
    label: 'Impact',
    question: 'Does this company create meaningful positive impact for people or planet?',
    scale: '0 = no clear impact · 3 = some positive impact, not central · 5 = impact is core, measurable and scalable',
    weight: 0.05,
  },
  {
    key: 'score_competition' as const,
    label: 'Competition',
    question: 'How does the competitive landscape look? Is there a first-mover advantage or clear differentiation?',
    scale: '0 = crowded market, no clear edge · 3 = some competition, differentiation present · 5 = first mover or strong advantage',
    weight: 0.05,
  },
  {
    key: 'score_gtm' as const,
    label: 'Go-to-Market',
    question: 'Is there a solid GTM plan? Does the team know how to acquire and scale customers?',
    scale: '0 = no GTM thinking · 3 = basic plan, not fully developed · 5 = clear, realistic and executable GTM strategy',
    weight: 0.05,
  },
  {
    key: 'score_financials' as const,
    label: 'Financials',
    question: 'Are the financials detailed, healthy and realistic? Do the assumptions hold up to scrutiny?',
    scale: '0 = unreliable or missing · 3 = present but weak assumptions · 5 = credible, detailed and well-reasoned',
    weight: 0.025,
  },
] as const

export type GateKey = (typeof GATING_CRITERIA)[number]['key'] | typeof NO_HARM_CRITERION.key
export type ScoreKey = (typeof SCORE_CRITERIA)[number]['key']

// Recommendation thresholds (percentage of max score)
export const THRESHOLDS = {
  YES: 75,   // >= 75% → Yes
  MAYBE: 50, // >= 50% → Maybe / discuss
  // < 50% → Pass
}
