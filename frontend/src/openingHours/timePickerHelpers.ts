import { DateTime } from 'luxon';

/** Stable calendar date for clock-only editing (reduces DST edge cases). */
export const CLOCK_ANCHOR = Object.freeze({ year: 2006, month: 7, day: 1 }); // midsummer UTC-adjacent

/** Build a zoned clock value from HH:mm strings for pickers. */
export function hmToLuxonClock(hm: string, timeZone: string): DateTime | null {
  const parts = /^(\d{1,2}):(\d{2})$/.exec(String(hm).trim());
  if (!parts) return null;
  const hour = Number(parts[1]);
  const minute = Number(parts[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || Number.isNaN(hour) || Number.isNaN(minute)) return null;

  return DateTime.fromObject(
    { ...CLOCK_ANCHOR, hour, minute, second: 0, millisecond: 0 },
    { zone: timeZone },
  );
}

/** Read HH:mm (24h) back from picker value. */
export function luxonClockToHm(dt: DateTime | null): string {
  if (!dt || !dt.isValid) return '00:00';
  const z = dt;
  return `${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`;
}
