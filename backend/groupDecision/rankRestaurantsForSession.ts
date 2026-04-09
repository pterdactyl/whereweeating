import db from '../db/index.js';
import type { SessionFilters } from '../db/groupSessions.js';

export type Restaurant = {
  id: string;
  name: string;
  category: string;
  location: string;
  price: string;
};

export type RestaurantRecommendation = {
  restaurantId: string;
  name: string;
  score: number;
  matchedUsers: number;
  reasons: string[];
};

type RankOptions = {
  excludeIds?: Set<string>;
  includeLikeBonus?: boolean;
  likeBonus?: number;
  participantIds?: string[];
};

type RankedResult = {
  sessionId: string;
  participantCount: number;
  poolSize: number;
  recommendations: RestaurantRecommendation[];
};

function norm(s: string): string {
  return (s ?? '').trim().toLowerCase();
}

function getRestaurantCategories(categoryStr: string): string[] {
  return (categoryStr || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function getCityFromLocation(loc: string): string {
  if (!loc) return '';
  const parts = loc.split(',');
  return parts[parts.length - 1].trim();
}

export function filterPool(restaurants: Restaurant[], hostFilters: SessionFilters | null): Restaurant[] {
  const f = hostFilters || { categories: [], price: null, locations: [] };
  let out = [...restaurants];

  if (f.categories?.length) {
    const allowed = new Set(f.categories.map(norm));
    out = out.filter(r => {
      const restCats = getRestaurantCategories(r.category || '');
      return restCats.some(rc => allowed.has(norm(rc)));
    });
  }

  if (f.price) out = out.filter(r => r.price === f.price);

  if (f.locations?.length) {
    const allowed = new Set(f.locations.map(norm));
    out = out.filter(r => allowed.has(norm(getCityFromLocation(r.location || ''))));
  }

  return out;
}

type SingleParticipantMatch = {
  matchedAny: boolean;
  categoryMatches: string[];
  priceMatched: boolean;
  cityMatched: boolean;
  points: number;
};

function scoreOneParticipant(restaurant: Restaurant, prefs: SessionFilters): SingleParticipantMatch {
  const restCats = getRestaurantCategories(restaurant.category || '');
  const prefCats = (prefs.categories ?? []).map(norm);

  const categoryMatches = restCats.filter(rc => prefCats.includes(norm(rc)));
  const priceMatched = Boolean(prefs.price && restaurant.price === prefs.price);

  const city = norm(getCityFromLocation(restaurant.location || ''));
  const prefCities = (prefs.locations ?? []).map(norm);
  const cityMatched = Boolean(city && prefCities.includes(city));

  const points = categoryMatches.length + (priceMatched ? 1 : 0) + (cityMatched ? 1 : 0);
  return {
    matchedAny: points > 0,
    categoryMatches,
    priceMatched,
    cityMatched,
    points,
  };
}

export function pickOneFromTopWeighted(
  ranked: RestaurantRecommendation[],
  excludeIds: Set<string>,
  topK: number,
): RestaurantRecommendation | null {
  const available = ranked.filter(r => !excludeIds.has(r.restaurantId));
  if (!available.length) return null;

  const slice = available.slice(0, Math.max(1, topK));
  const weights = slice.map(r => Math.max(0.0001, r.score));
  const total = weights.reduce((a, b) => a + b, 0);

  let x = Math.random() * total;
  for (let i = 0; i < slice.length; i++) {
    x -= weights[i];
    if (x <= 0) return slice[i];
  }
  return slice[slice.length - 1] ?? null;
}

export async function rankRestaurantsForSession(
  sessionId: string,
  options: RankOptions = {},
): Promise<RankedResult> {
  const session = await db.groupSessions.getSessionById(sessionId);
  if (!session) throw new Error('Session not found');

  const pool = (await db.restaurants.getRestaurants()) as Restaurant[];

  const allPrefs = Array.isArray(options.participantIds) && options.participantIds.length > 0
    ? await db.groupSessions.listParticipantFiltersForParticipants(sessionId, options.participantIds)
    : await db.groupSessions.listParticipantFilters(sessionId);
  const participantPrefs: SessionFilters[] = allPrefs.map(pf => ({
    categories: Array.isArray(pf.filters.categories) ? pf.filters.categories : [],
    price: pf.filters.price ?? null,
    locations: Array.isArray(pf.filters.locations) ? pf.filters.locations : [],
  }));

  const participantCount = participantPrefs.length;
  const excludeIds = options.excludeIds ?? new Set<string>();

  const includeLikeBonus = options.includeLikeBonus ?? true;
  const likeBonus = typeof options.likeBonus === 'number' ? options.likeBonus : 0.5;
  const likedSet = new Set(session.liked_restaurant_ids ?? []);

  const recommendations: RestaurantRecommendation[] = [];

  for (const r of pool) {
    if (excludeIds.has(r.id)) continue;

    let score = 1; // baseline
    let matchedUsers = 0;

    const categoryCounts = new Map<string, number>();
    let priceMatchCount = 0;
    let cityMatchCount = 0;

    for (const prefs of participantPrefs) {
      const m = scoreOneParticipant(r, prefs);
      if (m.matchedAny) matchedUsers += 1;
      score += m.points;

      for (const c of m.categoryMatches) categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
      if (m.priceMatched) priceMatchCount += 1;
      if (m.cityMatched) cityMatchCount += 1;
    }

    const reasons: string[] = [];

    if (participantCount > 0) {
      reasons.push(`Matched ${matchedUsers}/${participantCount} participants`);
    }

    if (categoryCounts.size > 0) {
      const topCats = [...categoryCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([cat, count]) => `${cat} (${count})`);
      reasons.push(`Category matches: ${topCats.join(', ')}`);
    }

    if (priceMatchCount > 0) reasons.push(`Price matched for ${priceMatchCount} participant(s)`);
    if (cityMatchCount > 0) reasons.push(`City matched for ${cityMatchCount} participant(s)`);

    if (includeLikeBonus && likedSet.has(r.id)) {
      score += likeBonus;
      reasons.push(`In-session likes bonus (+${likeBonus})`);
    }

    recommendations.push({
      restaurantId: r.id,
      name: r.name,
      score: Number(score.toFixed(3)),
      matchedUsers,
      reasons,
    });
  }

  recommendations.sort((a, b) => b.score - a.score || b.matchedUsers - a.matchedUsers || a.name.localeCompare(b.name));

  return {
    sessionId,
    participantCount,
    poolSize: pool.length,
    recommendations,
  };
}

