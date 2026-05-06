import type { WeeklyHoursSchedule } from '../types/Restaurant';
import { WEEKDAYS, emptyWeeklyHours, type Weekday, type WeeklyHoursNamed } from './types';

/** JS `getDay`-style index as stored in the API (America/Toronto open-now logic). */
const WEEKDAY_TO_JS: Record<Weekday, string> = {
  monday: '1',
  tuesday: '2',
  wednesday: '3',
  thursday: '4',
  friday: '5',
  saturday: '6',
  sunday: '0',
};

const JS_TO_WEEKDAY: Record<string, Weekday> = {
  '0': 'sunday',
  '1': 'monday',
  '2': 'tuesday',
  '3': 'wednesday',
  '4': 'thursday',
  '5': 'friday',
  '6': 'saturday',
};

function normalizeIntervalList(raw: unknown): { open: string; close: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { open: string; close: string }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = (row as { open?: unknown }).open;
    const c = (row as { close?: unknown }).close;
    if (typeof o === 'string' && typeof c === 'string') {
      out.push({ open: o.trim(), close: c.trim() });
    }
  }
  return out;
}

/** Convert API `weekly_hours` (0–6 keys and/or named keys) → editor model. */
export function dbWeeklyHoursToNamed(wh: WeeklyHoursSchedule | null | undefined): WeeklyHoursNamed {
  const base = emptyWeeklyHours();
  if (!wh || typeof wh !== 'object') return base;

  const keys = Object.keys(wh);
  const usesNames = keys.some(k => (WEEKDAYS as readonly string[]).includes(k));

  if (usesNames) {
    for (const d of WEEKDAYS) {
      base[d] = normalizeIntervalList((wh as Record<string, unknown>)[d]);
    }
    return base;
  }

  for (const js of Object.keys(JS_TO_WEEKDAY)) {
    const day = JS_TO_WEEKDAY[js];
    base[day] = normalizeIntervalList((wh as Record<string, unknown>)[js]);
  }
  return base;
}

/** Convert editor model → API shape (numeric 0–6 string keys) for backend open-now. */
export function namedToDbWeeklyHours(named: WeeklyHoursNamed): WeeklyHoursSchedule {
  const out: NonNullable<WeeklyHoursSchedule> = {};
  let any = false;

  for (const d of WEEKDAYS) {
    const list = named[d] ?? [];
    if (!list.length) continue;
    any = true;
    const key = WEEKDAY_TO_JS[d];
    out[key] = list.map(iv => ({
      open: iv.open.trim(),
      close: iv.close.trim(),
    }));
  }

  return any ? out : null;
}

/** Friendly multi-line text for the customer-facing hours field. */
export function weeklyNamedToDisplayLines(named: WeeklyHoursNamed): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return WEEKDAYS.map(day => {
    const ranges = named[day] ?? [];
    if (!ranges.length) return `${cap(day)}: Closed`;
    const parts = ranges.map(r => `${r.open}–${r.close}`).join(', ');
    return `${cap(day)}: ${parts}`;
  }).join('\n');
}
