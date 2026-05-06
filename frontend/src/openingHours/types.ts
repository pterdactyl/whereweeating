/**
 * Named weekdays, Monday–Sunday. Empty array means closed that day.
 * Times are 24h "HH:mm" (leading zero optional on hour in storage; normalized on save).
 */
export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type HoursInterval = {
  open: string;
  close: string;
};

/** Full-week schedule keyed by weekday (lowercase). */
export type WeeklyHoursNamed = Record<Weekday, HoursInterval[]>;

export function emptyWeeklyHours(): WeeklyHoursNamed {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
}
