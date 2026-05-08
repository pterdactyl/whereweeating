import type { Restaurant, WeeklyHoursSchedule } from '../types/Restaurant';

/** Row shape returned by Supabase for `restaurants` select. */
export type ApiRestaurantRow = {
  id: string;
  name: string;
  category: string;
  location: string;
  price: string;
  hours_of_operation?: string | null;
  weekly_hours?: WeeklyHoursSchedule | null;
  rating?: number | null;
  review_count?: number | null;
};

/** Normalize `/api/restaurants` rows (Supabase snake_case + optional fields). */
export function mapRestaurantFromApi(r: ApiRestaurantRow): Restaurant {
  const { review_count: reviewCountRaw, rating: ratingRaw, ...base } = r;
  return {
    ...base,
    hours_of_operation: r.hours_of_operation ?? null,
    weekly_hours: r.weekly_hours ?? null,
    rating: typeof ratingRaw === 'number' && !Number.isNaN(ratingRaw) ? ratingRaw : null,
    reviewCount:
      typeof reviewCountRaw === 'number' && !Number.isNaN(reviewCountRaw)
        ? reviewCountRaw
        : null,
  };
}

/** One-line rating for cards; `null` if no rating. */
export function formatRatingLine(r: Pick<Restaurant, 'rating' | 'reviewCount'>): string | null {
  if (typeof r.rating !== 'number' || Number.isNaN(r.rating)) return null;
  const stars = r.rating.toFixed(1);
  if (typeof r.reviewCount === 'number' && r.reviewCount > 0) {
    return `${stars}★ · ${r.reviewCount.toLocaleString()} reviews`;
  }
  return `${stars}★`;
}
