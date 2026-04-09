-- Add expires_at column
ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Set default for new rows: now() + 1 hour
ALTER TABLE group_sessions
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 hour');

-- Backfill existing rows: expires_at = created_at + 1 hour
UPDATE group_sessions
SET expires_at = COALESCE(expires_at, created_at + interval '1 hour')
WHERE expires_at IS NULL;

-- Ensure expires_at is never null for future inserts
ALTER TABLE group_sessions
  ALTER COLUMN expires_at SET NOT NULL;

-- Function to delete expired sessions (and their participants/filters via CASCADE if configured)
-- If no CASCADE, we delete in order: participant_filters -> participants -> sessions
CREATE OR REPLACE FUNCTION delete_expired_group_sessions()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete participant filters for expired sessions
  DELETE FROM group_participant_filters
  WHERE session_id IN (SELECT id FROM group_sessions WHERE expires_at < now());

  -- Delete participants for expired sessions
  DELETE FROM group_participants
  WHERE session_id IN (SELECT id FROM group_sessions WHERE expires_at < now());

  -- Delete expired sessions
  WITH deleted AS (
    DELETE FROM group_sessions WHERE expires_at < now() RETURNING id
  )
  SELECT count(*)::integer INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

COMMENT ON COLUMN group_sessions.expires_at IS 'Session expires 1 hour after creation; expired sessions are cleaned up periodically.';
