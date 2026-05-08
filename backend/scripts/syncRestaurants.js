import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { yelpGet } from "../utils/yelpApi.js";
import { requireEnv } from "../utils/requireEnv.js";

dotenv.config({ override: true });

requireEnv("DATABASE_URL");
requireEnv("YELP_API_KEY");
const prisma = new PrismaClient();

const GTA_CITIES = [
  "Toronto",
  "Markham",
  "Richmond Hill",
  "Vaughan",
  "Mississauga",
  "Scarborough",
];

const PAGE_LIMIT = 50;
/** Yelp Fusion rejects a page when offset + limit > 240 (max ~240 hits per query). */
const YELP_MAX_RESULTS = 240;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatAddress(location) {
  const parts = [
    location?.address1,
    location?.address2,
    location?.address3,
    location?.city,
    location?.state,
    location?.zip_code,
    location?.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

function normalizeRestaurant(business) {
  const categoryNames = Array.isArray(business.categories)
    ? business.categories
        .map((category) => category?.title)
        .filter((categoryName) => Boolean(categoryName))
    : [];
  const formattedAddress = formatAddress(business.location);

  return {
    yelpId: business.id,
    name: business.name,
    category: categoryNames[0] ?? null,
    location: formattedAddress,
    rating: typeof business.rating === "number" ? business.rating : null,
    reviewCount:
      typeof business.review_count === "number" ? business.review_count : null,
    price: business.price ?? null,
    categories: categoryNames,
    imageUrl: business.image_url ?? null,
    address: formattedAddress,
    latitude:
      typeof business.coordinates?.latitude === "number"
        ? business.coordinates.latitude
        : null,
    longitude:
      typeof business.coordinates?.longitude === "number"
        ? business.coordinates.longitude
        : null,
    phone: business.display_phone || business.phone || null,
    mapsUrl: business.url ?? null,
  };
}

function formatTime(hhmm) {
  if (typeof hhmm !== "string" || hhmm.length !== 4) {
    return null;
  }

  return `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;
}

function buildHours(details) {
  const hours = Array.isArray(details?.hours) ? details.hours : [];
  if (hours.length === 0) {
    return { weeklyHours: null, hoursOfOperation: null };
  }

  const regular = hours.find((item) => item?.hours_type === "REGULAR") ?? hours[0];
  const openIntervals = Array.isArray(regular?.open) ? regular.open : [];
  if (openIntervals.length === 0) {
    return { weeklyHours: null, hoursOfOperation: null };
  }

  const byDay = WEEKDAYS.map(() => []);
  for (const interval of openIntervals) {
    if (
      typeof interval?.day !== "number" ||
      interval.day < 0 ||
      interval.day > 6
    ) {
      continue;
    }

    const start = formatTime(interval.start);
    const end = formatTime(interval.end);
    if (!start || !end) {
      continue;
    }

    byDay[interval.day].push({
      start,
      end,
      isOvernight: Boolean(interval.is_overnight),
    });
  }

  const weeklyHours = byDay.map((intervals, dayIndex) => ({
    day: dayIndex,
    dayLabel: WEEKDAYS[dayIndex],
    intervals,
    closed: intervals.length === 0,
  }));

  const hoursOfOperation = weeklyHours
    .map((dayInfo) => {
      if (dayInfo.closed) {
        return `${dayInfo.dayLabel}: Closed`;
      }
      const ranges = dayInfo.intervals
        .map((it) => `${it.start}-${it.end}${it.isOvernight ? " (+1d)" : ""}`)
        .join(", ");
      return `${dayInfo.dayLabel}: ${ranges}`;
    })
    .join(" | ");

  return { weeklyHours, hoursOfOperation };
}

async function getBusinessHours(businessId) {
  try {
    const details = await yelpGet(`/businesses/${businessId}`);
    return buildHours(details);
  } catch (error) {
    console.warn(
      `Could not fetch hours for yelpId=${businessId}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { weeklyHours: null, hoursOfOperation: null };
  }
}

async function upsertRestaurant(restaurant) {
  await prisma.restaurants.upsert({
    where: { yelpId: restaurant.yelpId },
    create: restaurant,
    update: restaurant,
  });
}

async function syncCity(city) {
  let processed = 0;

  for (let offset = 0; offset < YELP_MAX_RESULTS; ) {
    const limit = Math.min(PAGE_LIMIT, YELP_MAX_RESULTS - offset);
    const payload = await yelpGet("/businesses/search", {
      location: `${city}, ON, Canada`,
      categories: "restaurants",
      limit,
      offset,
    });

    const businesses = Array.isArray(payload.businesses) ? payload.businesses : [];
    if (businesses.length === 0) {
      break;
    }

    for (const business of businesses) {
      if (!business?.id || !business?.name) {
        continue;
      }
      const hours = await getBusinessHours(business.id);
      await upsertRestaurant({
        ...normalizeRestaurant(business),
        weekly_hours: hours.weeklyHours,
        hours_of_operation: hours.hoursOfOperation,
      });
      processed += 1;
    }

    offset += limit;
    if (businesses.length < limit) {
      break;
    }
  }

  return processed;
}

async function syncRestaurants() {
  let grandTotal = 0;

  for (const city of GTA_CITIES) {
    try {
      const n = await syncCity(city);
      grandTotal += n;
      console.log(`Synced ${n} restaurants for ${city}.`);
    } catch (error) {
      console.error(`Failed syncing city ${city}:`, error);
    }
  }

  console.log(`Restaurant sync complete. Total upserts attempted: ${grandTotal}.`);
}

syncRestaurants()
  .catch((error) => {
    console.error("Restaurant sync failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
