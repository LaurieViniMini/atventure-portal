-- ============================================================
-- New startup statuses + PreScreen IC role
-- ============================================================

-- Drop old status constraint and add new one with all values
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'startups'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE startups DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE startups ADD CONSTRAINT startups_status_check
  CHECK (status IN (
    'pre_screening', 'to_review_sector_ic', 'to_review_general_ic',
    'ok_for_pitching', 'in_dd', 'rejected', 'invested',
    -- legacy values kept for backwards compat
    'pending_review', 'reviewed', 'invited', 'portco'
  ));

-- Drop old ic_type constraint and add PreScreen
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'ic_members'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%ic_type%'
  LOOP
    EXECUTE 'ALTER TABLE ic_members DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE ic_members ADD CONSTRAINT ic_members_ic_type_check
  CHECK (ic_type IN ('General', 'Retail', 'Health', 'Food', 'All', 'PreScreen'));
