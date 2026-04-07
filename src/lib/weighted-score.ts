export interface ScoreFields {
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
}

export function calculateWeightedTotal(scores: ScoreFields): number {
  return (
    scores.score_market * 0.15 +
    scores.score_audience * 0.075 +
    scores.score_competition * 0.075 +
    scores.score_gtm * 0.075 +
    scores.score_value_prop * 0.075 +
    scores.score_financials * 0.075 +
    scores.score_product_ip * 0.075 +
    scores.score_business_model * 0.05 +
    scores.score_team * 0.20 +
    scores.score_timing * 0.05 +
    scores.score_validation * 0.05 +
    scores.score_risks * 0.05
  )
}

export const DEFAULT_SCORES: ScoreFields = {
  score_market: 0,
  score_audience: 0,
  score_competition: 0,
  score_gtm: 0,
  score_value_prop: 0,
  score_financials: 0,
  score_product_ip: 0,
  score_business_model: 0,
  score_team: 0,
  score_timing: 0,
  score_validation: 0,
  score_risks: 0,
}
