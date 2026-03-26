/**
 * Reddit WallStreetBets Sentiment Collector
 *
 * Fetches top posts from r/wallstreetbets via the old Reddit JSON API (no API key needed).
 * Extracts tickers and scores sentiment, storing results in reddit_mentions.
 */
import { db } from "@marketpulse/db/client";
import { redditMentions } from "@marketpulse/db/schema";
import { scoreSentiment } from "./news.js";

const WSB_URL = "https://www.reddit.com/r/wallstreetbets/top.json?t=day&limit=25";

// Regex to extract tickers: $AAPL, (TSLA), or standalone GME
const TICKER_REGEX = /(?:\$([A-Z]{1,5})|(?:^|[\s(])([A-Z]{2,5})(?=[\s).,]|$))/g;

const KNOWN_NON_TICKERS = new Set([
  "WSB", "DD", "YOLO", "THE", "FOR", "AND", "NOT", "BUT", "ARE", "WAS",
  "HAS", "ITS", "THIS", "THAT", "FROM", "WITH", "WILL", "HAVE", "BEEN",
  "THEY", "ALL", "NEW", "MORE", "INTO", "ALSO", "ONLY", "THAN", "OVER",
  "OUT", "UP", "AS", "AT", "BY", "IN", "IS", "IT", "OF", "ON", "OR",
  "SO", "TO", "AN", "BE", "DO", "GO", "IF", "NO", "WE", "AI", "SEC",
  "US", "EU", "UK", "CEO", "CFO", "IPO", "ETF", "USD", "FED", "LOL",
  "RH", "IV", "PE", "EPS", "ATH", "ATL", "BTFD", "FOMO", "OTM", "ITM",
]);

function extractTickers(text: string): string[] {
  const tickers = new Set<string>();
  let match: RegExpExecArray | null;
  TICKER_REGEX.lastIndex = 0;
  while ((match = TICKER_REGEX.exec(text)) !== null) {
    const ticker = (match[1] || match[2] || "").trim();
    if (ticker.length >= 2 && ticker.length <= 5 && !KNOWN_NON_TICKERS.has(ticker)) {
      tickers.add(ticker);
    }
  }
  return Array.from(tickers);
}

interface RedditPost {
  title: string;
  ups: number;
  upvote_ratio: number;
}

export async function fetchRedditWSB(): Promise<void> {
  let totalInserted = 0;

  try {
    const res = await fetch(WSB_URL, {
      headers: {
        "User-Agent": "MarketPulse/1.0 (market intelligence; no spam)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`[reddit-wsb] HTTP ${res.status}`);
      return;
    }

    const data = await res.json() as { data?: { children?: { data: RedditPost }[] } };
    const posts = data?.data?.children ?? [];

    for (const child of posts) {
      const post = child.data;
      const tickers = extractTickers(post.title);

      if (tickers.length === 0) continue;

      const sentiment = scoreSentiment(post.title, "");

      for (const ticker of tickers) {
        await db.insert(redditMentions).values({
          ticker,
          postTitle: post.title.slice(0, 500),
          upvotes: post.ups,
          upvoteRatio: String(post.upvote_ratio),
          sentiment,
          fetchedAt: new Date(),
        });
        totalInserted++;
      }
    }
  } catch (err) {
    console.warn("[reddit-wsb] Failed:", (err as Error).message);
  }

  console.log(`[reddit-wsb] Inserted ${totalInserted} ticker mentions`);
}
