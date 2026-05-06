import type { WeeklyHoursNamed, HoursInterval } from './types';

const HM = /^(\d{1,2}):(\d{2})$/;

/** Parse HH:mm → minutes since local midnight [0, 1439]. */
export function parseHmMinutes(hm: string): number | null {
  const m = HM.exec(String(hm).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** True when interval spans past midnight into the next calendar day (e.g. 18:00 → 02:00). */
export function isOvernightOpenClose(openMinutes: number, closeMinutes: number): boolean {
  if (openMinutes === closeMinutes) return false;
  return closeMinutes < openMinutes;
}

/** Normalize to HH:mm 24h. */
export function formatHm(openMinutes: number): string {
  const h = Math.floor(openMinutes / 60);
  const m = openMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Validate one interval — returns issue message or null. */
export function validateInterval(interval: HoursInterval): string | null {
  const o = parseHmMinutes(interval.open);
  const c = parseHmMinutes(interval.close);
  if (o === null || c === null) return 'Use 24-hour times like 09:00 or 22:30.';
  if (o === c) return 'Open and close cannot be identical.';
  if (!isOvernightOpenClose(o, c) && c < o) return 'Closing time must be after opening time (same calendar day).';
  return null;
}

export function validateWeeklyHours(hours: WeeklyHoursNamed): string | null {
  for (const day of Object.keys(hours)) {
    const list = hours[day as keyof WeeklyHoursNamed];
    if (!Array.isArray(list)) return 'Invalid schedule shape.';
    for (const iv of list) {
      const msg = validateInterval(iv);
      if (msg) return msg;
    }
  }
  return null;
}
