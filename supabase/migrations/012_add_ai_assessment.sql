-- Add AI pre-screening assessment columns to startups
ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS ai_summary    text,
  ADD COLUMN IF NOT EXISTS ai_gate_scores jsonb;
