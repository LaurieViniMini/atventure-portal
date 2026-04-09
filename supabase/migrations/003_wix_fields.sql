-- Add Wix form fields to startups table
ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS website          TEXT,
  ADD COLUMN IF NOT EXISTS location         TEXT,
  ADD COLUMN IF NOT EXISTS founding_date    TEXT,
  ADD COLUMN IF NOT EXISTS contact_name     TEXT,
  ADD COLUMN IF NOT EXISTS contact_email    TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone    TEXT,
  ADD COLUMN IF NOT EXISTS business_model_description TEXT,
  ADD COLUMN IF NOT EXISTS stage            TEXT,
  ADD COLUMN IF NOT EXISTS funding_raised   TEXT,
  ADD COLUMN IF NOT EXISTS traction         TEXT,
  ADD COLUMN IF NOT EXISTS mrr              TEXT,
  ADD COLUMN IF NOT EXISTS funding_target   TEXT,
  ADD COLUMN IF NOT EXISTS amount_committed TEXT,
  ADD COLUMN IF NOT EXISTS round_type       TEXT,
  ADD COLUMN IF NOT EXISTS impact           TEXT,
  ADD COLUMN IF NOT EXISTS how_heard        TEXT,
  ADD COLUMN IF NOT EXISTS wix_submission_id TEXT;
