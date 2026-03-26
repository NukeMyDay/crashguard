/**
 * News/RSS Collector
 *
 * Fetches financial news from free RSS feeds (no API keys required).
 * Extracts ticker mentions and stores items in the news_items table.
 */
import { db } from "@marketpulse/db/client";
import { newsItems } from "@marketpulse/db/schema";

// ─── RSS feed sources ─────────────────────────────────────────────────────────

const RSS_FEEDS: { source: string; url: string }[] = [
  { source: "Reuters", url: "https://feeds.reuters.com/reuters/businessNews" },
  { source: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/marketpulse/" },
  { source: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { source: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
  { source: "Seeking Alpha", url: "https://seekingalpha.com/feed.xml" },
  { source: "Investopedia", url: "https://www.investopedia.com/feedbuilder/feed/getfeed/?feedName=rss_headline" },
];

// ─── Ticker extraction ────────────────────────────────────────────────────────

const TICKER_REGEX = /(?:\$([A-Z]{1,5})|(?:^|[\s(])([A-Z]{2,5})(?=[\s).,]|$))/g;
const KNOWN_NON_TICKERS = new Set([
  "US", "EU", "UK", "THE", "FOR", "AND", "NOT", "BUT", "ARE", "WAS", "HAS",
  "ITS", "THIS", "THAT", "FROM", "WITH", "WILL", "HAVE", "BEEN", "THEY",
  "THEIR", "ALL", "NEW", "MORE", "INTO", "ALSO", "BEEN", "ONLY", "THAN",
  "OVER", "OUT", "UP", "AS", "AT", "BY", "IN", "IS", "IT", "OF", "ON",
  "OR", "SO", "TO", "AN", "BE", "DO", "GO", "IF", "NO", "WE", "AI",
  "GDP", "CPI", "IPO", "CEO", "CFO", "IPO", "ETF", "USD", "EUR", "GBP",
  "FED", "SEC", "FTC", "DOJ", "IMF", "WHO", "CDC", "ESG", "SPAC",
]);

function extractTickers(text: string): string[] {
  const tickers = new Set<string>();
  let match: RegExpExecArray | null;

  TICKER_REGEX.lastIndex = 0;
  while ((match = TICKER_REGEX.exec(text)) !== null) {
    const ticker = (match[1] || match[2] || "").trim();
    if (
      ticker.length >= 2 &&
      ticker.length <= 5 &&
      !KNOWN_NON_TICKERS.has(ticker)
    ) {
      tickers.add(ticker);
    }
  }

  return Array.from(tickers);
}

// ─── Minimal RSS parser ───────────────────────────────────────────────────────

interface RssItem {
  title: string;
  link: string;
  pubDate: string | null;
  description: string | null;
}

function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];

  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") ?? extractTag(block, "guid") ?? "";
    const pubDate = extractTag(block, "pubDate");
    const description = extractTag(block, "description");

    if (title && link) {
      items.push({ title, link, pubDate, description });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const cdataMatch = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const plainMatch = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i").exec(xml);
  if (plainMatch) return plainMatch[1].trim();

  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Main collector ───────────────────────────────────────────────────────────

export async function fetchNewsItems(): Promise<void> {
  let totalInserted = 0;
  const cutoffTime = Date.now() - 2 * 60 * 60 * 1000; // only items from last 2 hours

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "MarketPulse/1.0 RSS Reader" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        console.warn(`[news-collector] ${feed.source}: HTTP ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const items = parseRssXml(xml);

      for (const item of items) {
        const publishedAt = item.pubDate ? new Date(item.pubDate) : null;

        // Skip items older than 2 hours
        if (publishedAt && publishedAt.getTime() < cutoffTime) continue;

        const rawSummary = item.description ? stripHtml(item.description) : null;
        const summary = rawSummary ? rawSummary.slice(0, 300) : null;

        const headline = stripHtml(item.title);
        const tickers = extractTickers(headline + " " + (summary ?? ""));

        // Deduplicate by URL: skip if already exists
        const existing = await db.query?.newsItems?.findFirst?.({
          where: (t: any, { eq: eqFn }: any) => eqFn(t.url, item.link),
        }).catch(() => null);

        if (existing) continue;

        await db
          .insert(newsItems)
          .values({
            headline,
            url: item.link,
            source: feed.source,
            summary,
            tickers,
            publishedAt,
          })
          .onConflictDoNothing();

        totalInserted++;
      }
    } catch (err) {
      console.warn(`[news-collector] ${feed.source} failed:`, (err as Error).message);
    }

    // Rate-limit between feeds
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[news-collector] Inserted ${totalInserted} new items`);
}
