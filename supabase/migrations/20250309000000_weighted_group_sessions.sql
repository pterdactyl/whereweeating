-- Weighted group sessions: host base filters (pool), shortlist, veto/refill, finalize.
-- Run this in Supabase SQL editor or via supabase db push if you use Supabase CLI.

-- Add new columns to group_sessions (idempotent)
ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS host_filters jsonb DEFAULT '{"categories":[],"price":null,"locations":[]}'::jsonb;

ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS shortlist_restaurant_ids text[] DEFAULT '{}';

ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS shown_restaurant_ids text[] DEFAULT '{}';

ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS liked_restaurant_ids text[] DEFAULT '{}';

-- Allow state 'shortlist' (between lobby and result)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'group_sessions' AND column_name = 'state'
  ) THEN
    ALTER TABLE group_sessions DROP CONSTRAINT IF EXISTS group_sessions_state_check;
    ALTER TABLE group_sessions ADD CONSTRAINT group_sessions_state_check
      CHECK (state IN ('lobby', 'shortlist', 'result'));
  END IF;
END $$;

-- Backfill host_filters for existing rows (optional)
UPDATE group_sessions
SET host_filters = '{"categories":[],"price":null,"locations":[]}'::jsonb
WHERE host_filters IS NULL;

COMMENT ON COLUMN group_sessions.host_filters IS 'Host base filters: hard-filter the restaurant pool.';
COMMENT ON COLUMN group_sessions.shortlist_restaurant_ids IS 'Current visible shortlist of restaurant ids.';
COMMENT ON COLUMN group_sessions.shown_restaurant_ids IS 'All restaurant ids ever shown this session (no duplicate).';
COMMENT ON COLUMN group_sessions.liked_restaurant_ids IS 'Restaurant ids that users liked.';
