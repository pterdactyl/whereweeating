ALTER TABLE group_participants
  ADD COLUMN IF NOT EXISTS is_ready boolean NOT NULL DEFAULT false;

ALTER TABLE group_participants
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;
