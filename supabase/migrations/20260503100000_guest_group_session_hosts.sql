-- Allow anonymous session hosts: nullable host_user_id + one-time host claim secret.

ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS host_claim_secret text;

ALTER TABLE group_sessions
  ALTER COLUMN host_user_id DROP NOT NULL;

ALTER TABLE group_sessions DROP CONSTRAINT IF EXISTS group_sessions_host_identity_check;

ALTER TABLE group_sessions ADD CONSTRAINT group_sessions_host_identity_check CHECK (
  (host_user_id IS NOT NULL)
  OR (
    host_claim_secret IS NOT NULL
    AND length(trim(host_claim_secret)) > 0
  )
);

COMMENT ON COLUMN group_sessions.host_claim_secret IS 'Opaque secret for guest-hosted sessions; proves host capability without login.';
