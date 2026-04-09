BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS group_participants_session_name_uq
  ON public.group_participants (session_id, name);

COMMIT;
