export type Sector = 'General' | 'Retail' | 'Health' | 'Food'
export type IcType = 'General' | 'Retail' | 'Health' | 'Food' | 'All'
export type StartupStatus = 'pending_review' | 'reviewed' | 'invited' | 'rejected' | 'portco'
export type Recommendation = 'YES' | 'MAYBE' | 'NO'

export interface Startup {
  id: string
  name: string
  one_liner: string
  sector: Sector
  pitch_deck_url: string
  status: StartupStatus
  created_at: string
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
  score_market: number
  score_audience: number
  score_competition: number
  score_gtm: number
  score_value_prop: number
  score_financials: number
  score_product_ip: number
  score_business_model: number
  score_team: number
  score_timing: number
  score_validation: number
  score_risks: number
  weighted_total: number
  comments: string
  recommendation: Recommendation | null
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
