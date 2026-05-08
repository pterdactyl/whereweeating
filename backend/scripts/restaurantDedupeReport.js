import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { requireEnv } from "../utils/requireEnv.js";

dotenv.config({ override: true });
requireEnv("DATABASE_URL");
const prisma = new PrismaClient();

function normalize(value) {
  return (value || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function buildGroups(rows, keyBuilder) {
  const groups = new Map();

  for (const row of rows) {
    const key = keyBuilder(row);
    if (!key) {
      continue;
    }

    const existing = groups.get(key) || [];
    existing.push(row);
    groups.set(key, existing);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

async function runReport() {
  const restaurants = await prisma.restaurants.findMany({
    select: {
      yelpId: true,
      name: true,
      address: true,
      phone: true,
    },
  });

  const duplicatesByNameAddress = buildGroups(
    restaurants,
    (r) => `${normalize(r.name)}|${normalize(r.address)}`.replace(/^\|$/, ""),
  );

  const duplicatesByNamePhone = buildGroups(restaurants, (r) => {
    const phone = normalize(r.phone);
    if (!phone) {
      return "";
    }
    return `${normalize(r.name)}|${phone}`;
  });

  console.log("Restaurant dedupe report");
  console.log(`Total restaurants: ${restaurants.length}`);
  console.log(
    `Potential duplicates by name+address: ${duplicatesByNameAddress.length} groups`,
  );
  console.log(
    `Potential duplicates by name+phone: ${duplicatesByNamePhone.length} groups`,
  );

  const sampleLimit = 10;
  if (duplicatesByNameAddress.length > 0) {
    console.log("\nSample duplicate groups by name+address:");
    for (const group of duplicatesByNameAddress.slice(0, sampleLimit)) {
      console.log("---");
      for (const item of group) {
        console.log(
          `yelpId=${item.yelpId} | name=${item.name} | address=${item.address} | phone=${item.phone || "n/a"}`,
        );
      }
    }
  }

  if (duplicatesByNamePhone.length > 0) {
    console.log("\nSample duplicate groups by name+phone:");
    for (const group of duplicatesByNamePhone.slice(0, sampleLimit)) {
      console.log("---");
      for (const item of group) {
        console.log(
          `yelpId=${item.yelpId} | name=${item.name} | phone=${item.phone || "n/a"} | address=${item.address || "n/a"}`,
        );
      }
    }
  }
}

runReport()
  .catch((error) => {
    console.error("Failed to generate dedupe report:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
