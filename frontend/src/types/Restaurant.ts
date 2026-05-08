/** Keyed by JS weekday `"0"`–`"6"` with `{ open, close }` intervals (editor + open-now). */
export type WeeklyHoursKeyed = Record<string, { open: string; close: string }[]>;

/** Yelp sync: one object per weekday with `start`/`end` intervals. */
export type WeeklyHoursYelpDayRow = {
  day: number;
  dayLabel?: string;
  closed?: boolean;
  intervals?: Array<
    | { start: string; end: string; isOvernight?: boolean }
    | { open: string; close: string }
  >;
};

export type WeeklyHoursSchedule = WeeklyHoursKeyed | WeeklyHoursYelpDayRow[] | null;

export type Restaurant = {
  id: string;
  name: string;
  category: string;
  location: string;
  price: string;
  hours_of_operation: string | null;
  weekly_hours: WeeklyHoursSchedule;
  /** Yelp-style 0–5; null if unknown. */
  rating?: number | null;
  reviewCount?: number | null;
};