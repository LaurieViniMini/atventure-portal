-- Add sector_raw column to store the original Wix sector value before mapping
ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS sector_raw TEXT;
