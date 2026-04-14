export type Sector = 'General' | 'Retail' | 'Health' | 'Food'
export type IcType = 'General' | 'Retail' | 'Health' | 'Food' | 'All' | 'PreScreen'
export type StartupStatus =
  // Current statuses
  | 'pre_screening'
  | 'to_review_sector_ic'
  | 'to_review_general_ic'
  | 'ok_for_pitching'
  | 'in_dd'
  | 'rejected'
  | 'invested'
  // Legacy (backwards compat)
  | 'pending_review'
  | 'reviewed'
  | 'invited'
  | 'portco'
export type Recommendation = 'YES' | 'MAYBE' | 'NO'
export type DiverseTeam = 'Yes' | 'Partial' | 'No'

export interface Startup {
  id: string
  name: string
  one_liner: string
  sector: Sector
  pitch_deck_url: string
  status: StartupStatus
  created_at: string
  sector_raw?: string | null
  // Wix form fields
  website?: string | null
  location?: string | null
  founding_date?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  business_model_description?: string | null
  stage?: string | null
  funding_raised?: string | null
  traction?: string | null
  mrr?: string | null
  funding_target?: string | null
  amount_committed?: string | null
  round_type?: string | null
  impact?: string | null
  how_heard?: string | null
  wix_submission_id?: string | null
  // AI pre-screening assessment
  ai_summary?: string | null
  ai_gate_scores?: {
    ten_x:       { score: number; reason: string }
    eu_based:    { score: number; reason: string }
    stage:       { score: number; reason: string }
    no_harm:     { score: number; reason: string }
    must_have:   { score: number; reason: string }
    scalability: { score: number; reason: string }
    summary: string
    recommendation: 'proceed' | 'discuss' | 'pass'
  } | null
}

export interface IcMember {
  id: string
  name: string
  email: string
  ic_type: IcType
  auth_user_id: string | null
}

export interface Review {
  id: string
  startup_id: string
  ic_member_id: string
  // Stage 2 scores
  score_team: number
  score_market: number
  score_10x: number
  score_must_have: number
  score_business_model: number
  score_product_ip: number
  score_validation: number
  score_impact: number
  score_competition: number
  score_gtm: number
  score_financials: number
  // Legacy (kept for backwards compat, not used in v2 formula)
  score_audience?: number | null
  score_value_prop?: number | null
  score_timing?: number | null
  score_risks?: number | null
  // Stage 1 gating (PreScreen only)
  gate_10x: number | null
  gate_problem_significance: number | null
  gate_must_have: number | null
  gate_no_harm: number | null
  // Qualitative
  diverse_team: DiverseTeam | null
  key_risks: string | null
  // Result
  weighted_total: number
  comments: string
  recommendation: Recommendation | null
  passed: boolean
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface ReviewWithMember extends Review {
  ic_members: IcMember
}

export interface StartupWithStats extends Startup {
  review_count: number
  avg_score: number | null
  yes_count: number
  maybe_count: number
  no_count: number
}

export interface StartupReviewer {
  startup_id: string
  ic_member_id: string
}
