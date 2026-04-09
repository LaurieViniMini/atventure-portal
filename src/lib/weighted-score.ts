export interface ScoreFields {
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
}

// Returns weighted total out of 5 (max = 5.0)
export function calculateWeightedTotal(scores: ScoreFields): number {
  return (
    scores.score_team          * 0.20  +
    scores.score_market        * 0.15  +
    scores.score_10x           * 0.10  +
    scores.score_must_have     * 0.10  +
    scores.score_business_model * 0.10 +
    scores.score_product_ip    * 0.10  +
    scores.score_validation    * 0.075 +
    scores.score_impact        * 0.05  +
    scores.score_competition   * 0.05  +
    scores.score_gtm           * 0.05  +
    scores.score_financials    * 0.025
  )
}

// Returns percentage 0–100
export function weightedTotalToPercent(total: number): number {
  return (total / 5) * 100
}

export const DEFAULT_SCORES: ScoreFields = {
  score_team: 0,
  score_market: 0,
  score_10x: 0,
  score_must_have: 0,
  score_business_model: 0,
  score_product_ip: 0,
  score_validation: 0,
  score_impact: 0,
  score_competition: 0,
  score_gtm: 0,
  score_financials: 0,
}

export const DEFAULT_GATES = {
  gate_10x: null as number | null,
  gate_problem_significance: null as number | null,
  gate_must_have: null as number | null,
  gate_no_harm: null as number | null,
}
