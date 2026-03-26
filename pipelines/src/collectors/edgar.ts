/**
 * SEC EDGAR Filing Alerts Collector
 *
 * Fetches latest 8-K and 13-D filings from SEC EDGAR Atom feeds (free, no API key).
 * Filters for S&P 500 major companies and stores as news_items with source "sec-edgar".
 */
import { db } from "@marketpulse/db/client";
import { newsItems } from "@marketpulse/db/schema";

const EDGAR_FEEDS = [
  {
    type: "8-K",
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&dateb=&owner=include&count=10&search_text=&output=atom",
  },
  {
    type: "13-D",
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=13-D&dateb=&owner=include&count=10&search_text=&output=atom",
  },
];

// Allowlist of major S&P 500 company names (partial match) to filter relevant filings
const SP500_ALLOWLIST = new Set([
  "apple", "microsoft", "amazon", "alphabet", "meta", "tesla", "nvidia",
  "berkshire", "jpmorgan", "unitedhealth", "johnson", "visa", "procter",
  "mastercard", "exxon", "chevron", "abbvie", "home depot", "merck",
  "lilly", "pfizer", "broadcom", "costco", "pepsico", "coca-cola",
  "thermo fisher", "mcdonald", "abbott", "wells fargo", "salesforce",
  "disney", "adobe", "netflix", "qualcomm", "intel", "ibm", "caterpillar",
  "honeywell", "union pacific", "united parcel", "lockheed", "boeing",
  "american express", "morgan stanley", "goldman sachs", "citigroup",
  "bank of america", "verizon", "at&t", "t-mobile", "comcast",
]);

function extractAtomEntries(xml: string): { title: string; link: string; updated: string | null; summary: string | null }[] {
  const entries: { title: string; link: string; updated: string | null; summary: string | null }[] = [];
  const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/g) ?? [];

  for (const block of entryBlocks) {
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(block);
    const linkMatch = /<link[^>]*href="([^"]+)"/i.exec(block);
    const updatedMatch = /<updated>([\s\S]*?)<\/updated>/i.exec(block);
    const summaryMatch = /<summary[^>]*>([\s\S]*?)<\/summary>/i.exec(block);

    const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : null;
    const link = linkMatch ? linkMatch[1].trim() : null;

    if (title && link) {
      entries.push({
        title,
        link,
        updated: updatedMatch ? updatedMatch[1].trim() : null,
        summary: summaryMatch ? summaryMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null,
      });
    }
  }

  return entries;
}

function isFromMajorCompany(title: string, summary: string | null): boolean {
  const text = (title + " " + (summary ?? "")).toLowerCase();
  for (const company of SP500_ALLOWLIST) {
    if (text.includes(company)) return true;
  }
  return false;
}

export async function fetchEdgarFilings(): Promise<void> {
  let totalInserted = 0;

  for (const feed of EDGAR_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent": "MarketPulse/1.0 market-intelligence@example.com",
          "Accept": "application/atom+xml",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        console.warn(`[edgar] ${feed.type} feed HTTP ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const entries = extractAtomEntries(xml);

      for (const entry of entries) {
        if (!isFromMajorCompany(entry.title, entry.summary)) continue;

        // Deduplicate by URL
        const existing = await db.query?.newsItems?.findFirst?.({
          where: (t: any, { eq: eqFn }: any) => eqFn(t.url, entry.link),
        }).catch(() => null);

        if (existing) continue;

        const publishedAt = entry.updated ? new Date(entry.updated) : new Date();
        const headline = `[SEC ${feed.type}] ${entry.title}`;
        const summary = entry.summary ? entry.summary.slice(0, 300) : null;

        await db
          .insert(newsItems)
          .values({
            headline,
            url: entry.link,
            source: "sec-edgar",
            summary,
            sentiment: feed.type === "13-D" ? "bullish" : "neutral", // 13-D often activist/buyout
            tickers: [],
            publishedAt,
          })
          .onConflictDoNothing();

        totalInserted++;
      }
    } catch (err) {
      console.warn(`[edgar] ${feed.type} failed:`, (err as Error).message);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[edgar] Inserted ${totalInserted} new filings`);
}
