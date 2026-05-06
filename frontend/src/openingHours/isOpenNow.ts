import { DateTime } from 'luxon';
import { WEEKDAYS, emptyWeeklyHours, type Weekday, type WeeklyHoursNamed, type HoursInterval } from './types';
import { isOvernightOpenClose, parseHmMinutes } from './parsing';

const LUXON_TO_DAY: Record<number, Weekday> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

export function weekdayFromLuxon(dt: DateTime): Weekday {
  return LUXON_TO_DAY[dt.weekday];
}

function prevWeekday(d: Weekday): Weekday {
  const idx = WEEKDAYS.indexOf(d);
  return WEEKDAYS[(idx + WEEKDAYS.length - 1) % WEEKDAYS.length];
}

function truncateToMinute(dt: DateTime): DateTime {
  return dt.set({ second: 0, millisecond: 0 });
}

type Match = {
  closesAt: DateTime;
};

function overnightClosesNextMorning(openDayStart: DateTime, closeMinutes: number): DateTime {
  return truncateToMinute(
    openDayStart.plus({ days: 1 }).set({
      hour: Math.floor(closeMinutes / 60),
      minute: closeMinutes % 60,
      second: 0,
      millisecond: 0,
    }),
  );
}

/** Close time on spill morning (today's calendar date). */
function overnightClosesOnSpillDay(spillDayStart: DateTime, closeMinutes: number): DateTime {
  return truncateToMinute(
    spillDayStart.set({
      hour: Math.floor(closeMinutes / 60),
      minute: closeMinutes % 60,
      second: 0,
      millisecond: 0,
    }),
  );
}

function sameDayIntervalCovers(interval: HoursInterval, nowDt: DateTime, nowMinutes: number): Match | null {
  const openM = parseHmMinutes(interval.open);
  const closeM = parseHmMinutes(interval.close);
  if (openM === null || closeM === null || isOvernightOpenClose(openM, closeM)) return null;

  if (nowMinutes < openM || nowMinutes >= closeM) return null;
  const closesAt = truncateToMinute(
    nowDt.set({
      hour: Math.floor(closeM / 60),
      minute: closeM % 60,
      second: 0,
      millisecond: 0,
    }),
  );
  return { closesAt };
}

/** Evening segment of overnight (opening day → before midnight). */
function overnightEveningCovers(interval: HoursInterval, nowDt: DateTime, nowMinutes: number): Match | null {
  const openM = parseHmMinutes(interval.open);
  const closeM = parseHmMinutes(interval.close);
  if (openM === null || closeM === null || !isOvernightOpenClose(openM, closeM)) return null;

  if (nowMinutes < openM) return null;
  const closesAt = overnightClosesNextMorning(nowDt.startOf('day'), closeM);
  return { closesAt };
}

/** After-midnight segment from previous calendar day’s overnight slot. */
function overnightSpillCovers(interval: HoursInterval, spillDayDt: DateTime, nowMinutes: number): Match | null {
  const openM = parseHmMinutes(interval.open);
  const closeM = parseHmMinutes(interval.close);
  if (openM === null || closeM === null || !isOvernightOpenClose(openM, closeM)) return null;

  if (nowMinutes >= closeM) return null;
  const closesAt = overnightClosesOnSpillDay(spillDayDt.startOf('day'), closeM);
  return { closesAt };
}

function findClosingMatch(hours: WeeklyHoursNamed, nowDt: DateTime): Match | null {
  const w = weekdayFromLuxon(nowDt);
  const nowMinutes = Math.floor(nowDt.hour * 60 + nowDt.minute);

  const todayList = hours[w] ?? [];
  for (const interval of todayList) {
    const m = sameDayIntervalCovers(interval, nowDt, nowMinutes);
    if (m) return m;
  }
  for (const interval of todayList) {
    const m = overnightEveningCovers(interval, nowDt, nowMinutes);
    if (m) return m;
  }

  const prevDay = prevWeekday(w);
  const prevList = hours[prevDay] ?? [];
  for (const interval of prevList) {
    const m = overnightSpillCovers(interval, nowDt, nowMinutes);
    if (m) return m;
  }

  return null;
}

function intervalOpensAt(midnightDay: DateTime, interval: HoursInterval): DateTime | null {
  const openM = parseHmMinutes(interval.open);
  const closeM = parseHmMinutes(interval.close);
  if (openM === null || closeM === null || openM === closeM) return null;

  return truncateToMinute(
    midnightDay.set({
      hour: Math.floor(openM / 60),
      minute: openM % 60,
      second: 0,
      millisecond: 0,
    }),
  );
}

/**
 * Next opening instant strictly after `now` when currently closed,
 * examining up to three weeks ahead.
 */
export function findNextOpensAt(hours: WeeklyHoursNamed, now: DateTime): DateTime | null {
  const nowTrunc = truncateToMinute(now);
  const todayStart = nowTrunc.startOf('day');

  let best: DateTime | null = null;

  for (let d = 0; d <= 20; d += 1) {
    const midnight = todayStart.plus({ days: d });
    const w = weekdayFromLuxon(midnight);
    const intervals = hours[w] ?? [];

    for (const interval of intervals) {
      const cand = intervalOpensAt(midnight, interval);
      if (!cand || cand <= nowTrunc) continue;
      if (!best || cand < best) best = cand;
    }
  }

  return best;
}

export type OpenNowResult = {
  isOpen: boolean;
  closesAt: Date | null;
  opensAt: Date | null;
  isClosingSoon: boolean;
};

export type IsOpenNowOptions = {
  timeZone?: string;
  closingSoonMinutes?: number;
};

function normalizeHours(hours: WeeklyHoursNamed | null | undefined): WeeklyHoursNamed | null {
  if (!hours || typeof hours !== 'object') return null;
  const out = emptyWeeklyHours();
  for (const day of WEEKDAYS) {
    const list = (hours as WeeklyHoursNamed)[day];
    out[day] = Array.isArray(list) ? list.map(iv => ({ open: iv.open, close: iv.close })) : [];
  }
  return out;
}

export function isOpenNow(
  hours: WeeklyHoursNamed | null | undefined,
  nowDate: Date = new Date(),
  opts: IsOpenNowOptions = {},
): OpenNowResult {
  const tz = opts.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  const closingSoonMinutes = opts.closingSoonMinutes ?? 30;
  const empty = (): OpenNowResult => ({
    isOpen: false,
    closesAt: null,
    opensAt: null,
    isClosingSoon: false,
  });

  const hoursResolved = normalizeHours(hours);
  if (!hoursResolved) return empty();

  const now = DateTime.fromJSDate(nowDate, { zone: tz });
  const match = findClosingMatch(hoursResolved, now);

  if (match) {
    const closesJs = match.closesAt.toJSDate();
    const diffMs = match.closesAt.diff(now, 'milliseconds').milliseconds;
    const isClosingSoon = diffMs > 0 && diffMs <= closingSoonMinutes * 60 * 1000;
    return {
      isOpen: true,
      closesAt: closesJs,
      opensAt: null,
      isClosingSoon,
    };
  }

  const nextOpens = findNextOpensAt(hoursResolved, now);
  return {
    isOpen: false,
    closesAt: null,
    opensAt: nextOpens ? nextOpens.toJSDate() : null,
    isClosingSoon: false,
  };
}
