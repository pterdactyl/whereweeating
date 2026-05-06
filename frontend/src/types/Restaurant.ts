export type WeeklyHoursSchedule = Record<string, { open: string; close: string }[]> | null;

export type Restaurant = {
  id: string;
  name: string;
  category: string;
  location: string;
  price: string;
  hours_of_operation: string | null;
  weekly_hours: WeeklyHoursSchedule;
};