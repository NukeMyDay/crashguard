/**
 * Macro Event Calendar — collects FOMC meeting dates + FRED economic release dates
 * (CPI, GDP, Jobs) and stores them in macro_events table.
 */
import { db } from "@marketpulse/db/client";
import { macroEvents } from "@marketpulse/db/schema";
import { gte, eq, and } from "drizzle-orm";

const FRED_API_KEY = process.env.FRED_API_KEY;

// ─── Hardcoded FOMC 2026 schedule ─────────────────────────────────────────────

const FOMC_2026 = [
  "2026-01-28", "2026-03-18", "2026-05-06", "2026-06-17",
  "2026-07-29", "2026-09-16", "2026-11-04", "2026-12-16",
];

// FRED release IDs: 10=CPI, 50=GDP, 468=Jobs (BLS Employment Situation)
const FRED_RELEASES: Array<{ id: number; type: "cpi" | "gdp" | "jobs"; title: string }> = [
  { id: 10,  type: "cpi",  title: "CPI Release" },
  { id: 50,  type: "gdp",  title: "GDP Release" },
  { id: 468, type: "jobs", title: "Jobs Report (BLS)" },
];

async function fetchFredReleaseDates(releaseId: number, fromDate: string): Promise<string[]> {
  if (!FRED_API_KEY) return [];
  try {
    const url = `https://api.stlouisfed.org/fred/release/dates?release_id=${releaseId}&api_key=${FRED_API_KEY}&realtime_start=${fromDate}&file_type=json`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[macro-events] FRED release ${releaseId} fetch failed: ${res.status}`);
      return [];
    }
    const data = await res.json() as any;
    return (data?.release_dates ?? []).map((r: any) => r.date as string);
  } catch (e: any) {
    console.warn(`[macro-events] FRED release ${releaseId} error: ${e.message}`);
    return [];
  }
}

export async function collectMacroEvents(): Promise<void> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Upsert FOMC dates (future ones only)
  const fomcUpcoming = FOMC_2026.filter((d) => d >= todayStr);
  for (const dateStr of fomcUpcoming) {
    const existing = await db
      .select({ id: macroEvents.id })
      .from(macroEvents)
      .where(
        and(
          eq(macroEvents.eventType, "fomc"),
          eq(macroEvents.eventDate, new Date(dateStr + "T00:00:00Z"))
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(macroEvents).values({
        eventType: "fomc",
        eventDate: new Date(dateStr + "T14:00:00Z"), // FOMC typically 2pm ET
        title: `FOMC Meeting — ${dateStr}`,
        impact: "high",
      });
      console.log(`[macro-events] inserted FOMC: ${dateStr}`);
    }
  }

  // Fetch FRED economic release dates
  for (const release of FRED_RELEASES) {
    const dates = await fetchFredReleaseDates(release.id, todayStr);
    for (const dateStr of dates) {
      if (dateStr < todayStr) continue;

      const existing = await db
        .select({ id: macroEvents.id })
        .from(macroEvents)
        .where(
          and(
            eq(macroEvents.eventType, release.type),
            eq(macroEvents.eventDate, new Date(dateStr + "T00:00:00Z"))
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(macroEvents).values({
          eventType: release.type,
          eventDate: new Date(dateStr + "T08:30:00Z"), // Economic releases typically 8:30am ET
          title: `${release.title} — ${dateStr}`,
          impact: "high",
        });
        console.log(`[macro-events] inserted ${release.type}: ${dateStr}`);
      }
    }
  }

  console.log("[macro-events] collection complete");
}
