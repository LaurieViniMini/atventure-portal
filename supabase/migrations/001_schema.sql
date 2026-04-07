-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STARTUPS
-- ============================================================
CREATE TABLE startups (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  one_liner   TEXT,
  sector      TEXT        NOT NULL CHECK (sector IN ('Health', 'Retail')),
  pitch_deck_url TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending_review'
                          CHECK (status IN ('pending_review', 'reviewed', 'invited', 'rejected', 'portco')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- IC MEMBERS
-- ============================================================
CREATE TABLE ic_members (
  id           UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT  NOT NULL,
  email        TEXT  NOT NULL UNIQUE,
  ic_type      TEXT  NOT NULL CHECK (ic_type IN ('Health', 'Retail', 'Both')),
  auth_user_id UUID  REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id         UUID    NOT NULL REFERENCES startups(id)   ON DELETE CASCADE,
  ic_member_id       UUID    NOT NULL REFERENCES ic_members(id) ON DELETE CASCADE,
  score_market       INTEGER CHECK (score_market       BETWEEN 0 AND 5),
  score_audience     INTEGER CHECK (score_audience     BETWEEN 0 AND 5),
  score_competition  INTEGER CHECK (score_competition  BETWEEN 0 AND 5),
  score_gtm          INTEGER CHECK (score_gtm          BETWEEN 0 AND 5),
  score_value_prop   INTEGER CHECK (score_value_prop   BETWEEN 0 AND 5),
  score_financials   INTEGER CHECK (score_financials   BETWEEN 0 AND 5),
  score_product_ip   INTEGER CHECK (score_product_ip   BETWEEN 0 AND 5),
  score_business_model INTEGER CHECK (score_business_model BETWEEN 0 AND 5),
  score_team         INTEGER CHECK (score_team         BETWEEN 0 AND 5),
  score_timing       INTEGER CHECK (score_timing       BETWEEN 0 AND 5),
  score_validation   INTEGER CHECK (score_validation   BETWEEN 0 AND 5),
  score_risks        INTEGER CHECK (score_risks        BETWEEN 0 AND 5),
  weighted_total     FLOAT,
  comments           TEXT,
  recommendation     TEXT    CHECK (recommendation IN ('YES', 'MAYBE', 'NO')),
  submitted_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (startup_id, ic_member_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE startups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews    ENABLE ROW LEVEL SECURITY;

-- STARTUPS: all authenticated users can read
CREATE POLICY "startups_select_authenticated"
  ON startups FOR SELECT
  TO authenticated
  USING (true);

-- IC_MEMBERS: users can read their own record (matched by auth_user_id)
CREATE POLICY "ic_members_select_own"
  ON ic_members FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- IC_MEMBERS: allow linking auth_user_id on first login
-- (done via service role in auth callback — service role bypasses RLS)

-- REVIEWS: IC members can insert their own reviews
CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    ic_member_id IN (
      SELECT id FROM ic_members WHERE auth_user_id = auth.uid()
    )
  );

-- REVIEWS: IC members can update own reviews that haven't been submitted
CREATE POLICY "reviews_update_own_draft"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    ic_member_id IN (
      SELECT id FROM ic_members WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    ic_member_id IN (
      SELECT id FROM ic_members WHERE auth_user_id = auth.uid()
    )
  );

-- REVIEWS: IC members can read their own reviews
CREATE POLICY "reviews_select_own"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    ic_member_id IN (
      SELECT id FROM ic_members WHERE auth_user_id = auth.uid()
    )
  );
