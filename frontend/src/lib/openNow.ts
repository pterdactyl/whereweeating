/** Used to evaluate "open now" for Toronto-area listings. */
export const RESTAURANT_TIMEZONE = 'America/Toronto';

const WEEKDAY_SHORT_TO_JS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseHm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function getTorontoWeekdayJs(date: Date): number {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: RESTAURANT_TIMEZONE,
    weekday: 'short',
  }).format(date);
  const v = WEEKDAY_SHORT_TO_JS[wd];
  return v ?? 0;
}

function getTorontoMinutesSinceMidnight(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESTAURANT_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  let h = 0;
  let min = 0;
  for (const p of parts) {
    if (p.type === 'hour') h = Number(p.value);
    if (p.type === 'minute') min = Number(p.value);
  }
  return h * 60 + min;
}

function intervalCovers(nowM: number, open: string, close: string): boolean {
  const o = parseHm(open);
  const c = parseHm(close);
  if (o === null || c === null) return false;
  if (c > o) return nowM >= o && nowM < c;
  return nowM >= o || nowM < c;
}

function dayIntervals(raw: unknown): { open: string; close: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { open: string; close: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = (item as { open?: unknown }).open;
    const c = (item as { close?: unknown }).close;
    if (typeof o === 'string' && typeof c === 'string') out.push({ open: o, close: c });
  }
  return out;
}

export function isOpenNowToronto(weeklyHours: unknown, date: Date = new Date()): boolean {
  if (!weeklyHours || typeof weeklyHours !== 'object') return true;

  const dayKey = String(getTorontoWeekdayJs(date));
  const intervals = dayIntervals((weeklyHours as Record<string, unknown>)[dayKey]);
  if (intervals.length === 0) return false;

  const nowM = getTorontoMinutesSinceMidnight(date);
  return intervals.some(iv => intervalCovers(nowM, iv.open, iv.close));
}

export function passesPreferOpenNow(weeklyHours: unknown, date: Date = new Date()): boolean {
  if (weeklyHours == null) return true;
  if (typeof weeklyHours !== 'object') return true;
  if (Object.keys(weeklyHours as object).length === 0) return true;
  return isOpenNowToronto(weeklyHours, date);
}
