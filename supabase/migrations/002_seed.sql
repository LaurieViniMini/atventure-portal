-- ============================================================
-- IC MEMBERS SEED
-- Update emails to match your team's actual email addresses.
-- ============================================================
INSERT INTO ic_members (name, email, ic_type) VALUES
  ('Mara',       'mara@atventure.vc',       'Health'),
  ('Warnyta',    'warnyta@atventure.vc',    'Health'),
  ('Tessa',      'tessa@atventure.vc',      'Both'),
  ('Laurie',     'laurie@atventure.vc',     'Both'),
  ('Danielle',   'danielle@atventure.vc',   'Retail'),
  ('Femke',      'femke@atventure.vc',      'Retail'),
  ('Jelena',     'jelena@atventure.vc',     'Health'),
  ('Marsha',     'marsha@atventure.vc',     'Health'),
  ('Maud',       'maud@atventure.vc',       'Retail'),
  ('Annemieke',  'annemieke@atventure.vc',  'Both');

-- ============================================================
-- EXAMPLE STARTUP
-- ============================================================
INSERT INTO startups (name, one_liner, sector, pitch_deck_url, status) VALUES
  (
    'TestStartup',
    'Example startup for testing the review portal',
    'Health',
    'https://example.com/deck.pdf',
    'pending_review'
  );
