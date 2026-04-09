-- ============================================================
-- V2 SCORING MODEL
-- ============================================================

-- New score columns (Stage 2)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS score_10x       INTEGER CHECK (score_10x       BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS score_must_have INTEGER CHECK (score_must_have BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS score_impact    INTEGER CHECK (score_impact    BETWEEN 0 AND 5);

-- Stage 1 gating columns (per reviewer)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS gate_10x                  INTEGER CHECK (gate_10x                  BETWEEN 0 AND 2),
  ADD COLUMN IF NOT EXISTS gate_problem_significance INTEGER CHECK (gate_problem_significance  BETWEEN 0 AND 2),
  ADD COLUMN IF NOT EXISTS gate_must_have            INTEGER CHECK (gate_must_have             BETWEEN 0 AND 2),
  ADD COLUMN IF NOT EXISTS gate_no_harm              INTEGER CHECK (gate_no_harm               BETWEEN 0 AND 1);

-- Qualitative flags
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS diverse_team TEXT CHECK (diverse_team IN ('Yes', 'Partial', 'No')),
  ADD COLUMN IF NOT EXISTS key_risks    TEXT;

-- Reviewer opt-out
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS passed BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- EXPLICIT REVIEWER ASSIGNMENT PER STARTUP
-- ============================================================
CREATE TABLE IF NOT EXISTS startup_reviewers (
  startup_id    UUID NOT NULL REFERENCES startups(id)    ON DELETE CASCADE,
  ic_member_id  UUID NOT NULL REFERENCES ic_members(id)  ON DELETE CASCADE,
  PRIMARY KEY (startup_id, ic_member_id)
);

ALTER TABLE startup_reviewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "startup_reviewers_select_own"
  ON startup_reviewers FOR SELECT
  TO authenticated
  USING (
    ic_member_id IN (
      SELECT id FROM ic_members WHERE auth_user_id = auth.uid()
    )
  );
