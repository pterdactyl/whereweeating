import { DateTime } from 'luxon';

/** 12-hour wall time label in zone (e.g. "9:05 PM"). */
export function formatTime12(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(date);
}

/** User-facing phrase for next opening instant. */
export function formatNextOpensLabel(opensAt: Date, timeZone: string, reference: Date = new Date()): string {
  const o = DateTime.fromJSDate(opensAt, { zone: timeZone }).startOf('day');
  const r = DateTime.fromJSDate(reference, { zone: timeZone }).startOf('day');
  const diff = Math.round(o.diff(r, 'days').days);

  const t = formatTime12(opensAt, timeZone);

  if (diff <= 0) return `Opens today at ${t}`;
  if (diff === 1) return `Opens tomorrow at ${t}`;
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(opensAt);
  return `Opens ${weekday} at ${t}`;
}
