/**
 * Dark Pool Collector — FINRA Short Sale Volume
 *
 * Fetches FINRA ATS short sale volume from daily files:
 * https://regsho.finra.org/CNMSshvol{YYYYMMDD}.txt
 *
 * Format: Symbol | Date | ShortVolume | ShortExemptVolume | TotalVolume | Market
 * Flags tickers where shortRatio > 0.60 as "heavy shorting" (bearish signal).
 * Stores top 20 most-shorted tickers in dark_pool_prints table.
 */

import { db } from "@marketpulse/db/client";
import { darkPoolPrints } from "@marketpulse/db/schema";
import { eq } from "drizzle-orm";

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatDateHyphen(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface ShortVolumeRow {
  symbol: string;
  shortVolume: number;
  totalVolume: number;
  shortRatio: number;
}

async function fetchFINRAShortVolume(dateStr: string): Promise<ShortVolumeRow[]> {
  const url = `https://regsho.finra.org/CNMSshvol${dateStr}.txt`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
    });
    if (!res.ok) {
      console.warn(`[dark-pool] FINRA file not available for ${dateStr}: HTTP ${res.status}`);
      return [];
    }

    const text = await res.text();
    const lines = text.split("\n").slice(1); // skip header line

    const rows: ShortVolumeRow[] = [];
    for (const line of lines) {
      const parts = line.trim().split("|");
      if (parts.length < 5) continue;

      const symbol = parts[0].trim();
      const shortVolume = parseInt(parts[2], 10);
      const totalVolume = parseInt(parts[4], 10);

      // Skip invalid or very low-volume entries
      if (!symbol || isNaN(shortVolume) || isNaN(totalVolume) || totalVolume < 10000) continue;
      // Skip multi-char suffixes that are not standard tickers
      if (symbol.length > 6) continue;

      const shortRatio = totalVolume > 0 ? shortVolume / totalVolume : 0;
      rows.push({ symbol, shortVolume, totalVolume, shortRatio });
    }

    return rows;
  } catch (err) {
    console.warn(`[dark-pool] Failed to fetch FINRA data for ${dateStr}:`, err);
    return [];
  }
}

export async function fetchDarkPoolPrints(): Promise<void> {
  // Use previous trading day (yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  // If yesterday is Saturday (6) use Friday; if Sunday (0) use Friday
  if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2);

  const dateStr = formatDate(yesterday);
  const tradeDateStr = formatDateHyphen(yesterday);

  console.log(`[dark-pool] Fetching FINRA short volume for ${tradeDateStr}`);

  // Check if we already have data for this date
  const existing = await db
    .select({ id: darkPoolPrints.id })
    .from(darkPoolPrints)
    .where(eq(darkPoolPrints.tradeDate, tradeDateStr))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[dark-pool] Already have data for ${tradeDateStr}, skipping`);
    return;
  }

  const rows = await fetchFINRAShortVolume(dateStr);
  if (rows.length === 0) {
    console.warn(`[dark-pool] No data returned for ${tradeDateStr}`);
    return;
  }

  // Sort by short ratio descending, take top 20 with heavy shorting
  const heavyShorters = rows
    .filter((r) => r.shortRatio > 0.5) // include borderline + heavy
    .sort((a, b) => b.shortRatio - a.shortRatio)
    .slice(0, 20);

  if (heavyShorters.length === 0) {
    console.log(`[dark-pool] No heavily shorted tickers found for ${tradeDateStr}`);
    return;
  }

  // Batch insert
  await db.insert(darkPoolPrints).values(
    heavyShorters.map((r) => ({
      ticker: r.symbol,
      tradeDate: tradeDateStr,
      shortVolume: r.shortVolume,
      totalVolume: r.totalVolume,
      shortRatio: String(Math.round(r.shortRatio * 10000) / 10000),
      isHeavyShort: r.shortRatio > 0.60,
    }))
  );

  const heavyCount = heavyShorters.filter((r) => r.shortRatio > 0.60).length;
  console.log(
    `[dark-pool] Stored ${heavyShorters.length} tickers for ${tradeDateStr} (${heavyCount} heavy shorters >60%)`
  );
}
