-- Delete the 2 duplicate reilo. entries, keep the earliest one
DELETE FROM startups
WHERE id IN (
  '648c1cf4-bbb8-4695-b3d6-280209016de1',
  '7f594fa2-62ae-4065-88fd-970a8422703e'
);

-- Add a partial unique index on wix_submission_id to prevent future race conditions.
-- Partial: only enforced when wix_submission_id is not null/empty (some startups are added manually).
CREATE UNIQUE INDEX IF NOT EXISTS startups_wix_submission_id_unique
  ON startups (wix_submission_id)
  WHERE wix_submission_id IS NOT NULL AND wix_submission_id <> '';
