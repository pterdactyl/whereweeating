import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import type { WeeklyHoursNamed } from './types';
import { isOpenNow, type IsOpenNowOptions } from './isOpenNow';
import { formatNextOpensLabel, formatTime12 } from './formatting';

export type OpenStatusProps = {
  hours: WeeklyHoursNamed | null | undefined;
  now?: Date;
} & Omit<IsOpenNowOptions, 'timeZone'> & {
  timeZone?: string;
};

/**
 * Badge-style operating status — 12-hour wording in `timeZone`.
 */
export default function OpenStatus({ hours, now = new Date(), timeZone, closingSoonMinutes }: OpenStatusProps) {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  const soonM = closingSoonMinutes ?? 30;
  const status = isOpenNow(hours, now, { timeZone: tz, closingSoonMinutes: soonM });

  if (status.isOpen && status.closesAt) {
    const closeLabel = formatTime12(status.closesAt, tz);
    const main = [`🟢 Open now · closes at ${closeLabel}`];

    return (
      <Stack component="aside" spacing={0.5} sx={{ typography: 'body2' }}>
        <Typography variant="body2">{main.join('')}</Typography>
        {status.isClosingSoon ? (
          <Typography variant="body2" color="warning.dark" sx={{ fontWeight: 600 }}>
            {`Closing soon (under ${soonM} min)`}
          </Typography>
        ) : null}
      </Stack>
    );
  }

  const secondary =
    status.opensAt != null
      ? formatNextOpensLabel(status.opensAt, tz, now)
      : 'No upcoming opening times are configured for this venue.';

  return (
    <Stack component="aside" spacing={0.35} sx={{ typography: 'body2' }}>
      <Typography variant="body2">🔴 Closed</Typography>
      <Typography variant="body2" color="text.secondary">
        {secondary}
      </Typography>
    </Stack>
  );
}
