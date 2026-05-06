-- Hours shown in the app; weekly_hours drives "open now" filtering when users opt in.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS hours_of_operation text;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS weekly_hours jsonb;

COMMENT ON COLUMN public.restaurants.hours_of_operation IS 'Human-readable hours for display.';
COMMENT ON COLUMN public.restaurants.weekly_hours IS 'Optional per-day intervals for open-now checks: { "0": [{"open":"11:00","close":"21:00"}], ... } (0=Sun..6=Sat, America/Toronto).';
