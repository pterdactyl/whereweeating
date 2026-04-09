BEGIN;

UPDATE public.group_participants
SET ready_at = NULL
WHERE is_ready = false AND ready_at IS NOT NULL;

COMMIT;
