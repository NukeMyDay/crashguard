import { db } from "./client.js";
import { indicators } from "./schema/index.js";
import { INDICATORS } from "@marketpulse/shared";

async function seed() {
  console.log("Seeding indicators...");

  for (const ind of INDICATORS) {
    await db.insert(indicators).values({
      slug: ind.slug,
      name: ind.name,
      category: ind.category as any,
      source: ind.source as any,
      frequency: ind.frequency as any,
      weight: String(ind.weight),
      isActive: true,
    }).onConflictDoNothing();
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
