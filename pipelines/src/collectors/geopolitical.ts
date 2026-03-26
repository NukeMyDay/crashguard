/**
 * Geopolitical Risk Collector
 *
 * Fetches headlines from free RSS feeds (Reuters, BBC, NYT World),
 * scores them using keyword matching, computes a composite geopolitical
 * risk score (0–100), and stores it as the `geopolitical-risk` indicator.
 *
 * Runs hourly alongside other fast indicators.
 */
import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq } from "drizzle-orm";

const RSS_FEEDS = [
  "https://feeds.reuters.com/reuters/worldNews",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
];

const HIGH_RISK_KEYWORDS = [
  "war", "missile", "sanction", "invasion", "nuclear", "tariff", "coup",
  "crisis", "attack", "terrorist", "blockade",
];

const MEDIUM_RISK_KEYWORDS = [
  "tension", "protest", "dispute", "threat", "conflict", "election",
  "ban", "embargo",
];

interface HeadlineScore {
  title: string;
  score: number;
}

function scoreHeadline(title: string, desc: string): number {
  const text = (title + " " + desc).toLowerCase();
  const high = HIGH_RISK_KEYWORDS.filter((w) => text.includes(w)).length;
  const med = MEDIUM_RISK_KEYWORDS.filter((w) => text.includes(w)).length;
  return Math.min(100, high * 15 + med * 7);
}

function extractItems(xml: string): Array<{ title: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; description: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    items.push({
      title: titleMatch?.[1]?.trim() ?? "",
      description: descMatch?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "",
      pubDate: pubDateMatch?.[1]?.trim() ?? "",
    });
  }

  return items;
}

async function fetchRSSFeed(url: string): Promise<HeadlineScore[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const now = Date.now();
    const cutoff24h = now - 24 * 60 * 60 * 1000;

    const items = extractItems(xml);
    const scored: HeadlineScore[] = [];

    for (const item of items) {
      // Filter to last 24h if pubDate is parseable
      if (item.pubDate) {
        const pub = new Date(item.pubDate).getTime();
        if (!isNaN(pub) && pub < cutoff24h) continue;
      }

      const score = scoreHeadline(item.title, item.description);
      if (score > 0) {
        scored.push({ title: item.title, score });
      }
    }

    return scored;
  } catch {
    return [];
  }
}

// ─── Ensure geopolitical-risk indicator row exists ────────────────────────────

async function ensureIndicatorExists(): Promise<string> {
  const slug = "geopolitical-risk";
  const existing = await db
    .select({ id: indicators.id })
    .from(indicators)
    .where(eq(indicators.slug, slug))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [row] = await db
    .insert(indicators)
    .values({
      slug,
      name: "Geopolitical Risk Score",
      category: "macro",
      source: "rss",
      frequency: "hourly",
      weight: "0.08",
      warningThreshold: "50",
      criticalThreshold: "70",
      isActive: true,
      description: "Composite geopolitical risk score derived from Reuters, BBC, and NYT World RSS feeds.",
    })
    .returning({ id: indicators.id });

  return row.id;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function collectGeopoliticalRisk(): Promise<void> {
  console.log("[geopolitical] Fetching geopolitical risk from RSS feeds...");

  const allScores: HeadlineScore[] = [];

  for (const feed of RSS_FEEDS) {
    const scores = await fetchRSSFeed(feed);
    allScores.push(...scores);
  }

  if (allScores.length === 0) {
    console.log("[geopolitical] No scored headlines found in last 24h — skipping insert");
    return;
  }

  // Sort by score descending, take top 10
  const top10 = allScores.sort((a, b) => b.score - a.score).slice(0, 10);

  // Composite score = weighted average of top 10 (higher-ranked weighted more heavily)
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < top10.length; i++) {
    const weight = top10.length - i; // 10, 9, 8 … 1
    weightedSum += top10[i].score * weight;
    weightTotal += weight;
  }

  const compositeScore = Math.round(weightedSum / weightTotal);
  const normalizedValue = Math.min(100, compositeScore); // already 0–100

  const indicatorId = await ensureIndicatorExists();

  await db.insert(indicatorValues).values({
    indicatorId,
    value: String(compositeScore),
    normalizedValue: String(normalizedValue),
    recordedAt: new Date(),
  });

  console.log(
    `[geopolitical] Score: ${compositeScore} (from ${allScores.length} scored headlines, top 10 averaged). ` +
    `Top headline: "${top10[0]?.title ?? "N/A"}"`
  );
}
