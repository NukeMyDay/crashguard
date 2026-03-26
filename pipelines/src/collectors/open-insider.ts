import { db } from "@marketpulse/db/client";
import { scannerResults } from "@marketpulse/db/schema";

const OPENINSIDER_URL =
  "https://openinsider.com/screener?s=&o=&pl=&ph=&ll=&lh=&fd=7&fdr=&td=0&tdr=&fdlyl=&fdlyh=&daysago=7&xp=1&vl=100&vh=&ocl=&och=&sic1=-1&sicl=100&sich=9999&grp=0&nfl=&nfh=&nil=&nih=&nol=&noh=&v2l=&v2h=&oel=&oeh=&rel=&reh=&offl=&offh=&discl=&disch=&ip=&isofficer=1&iscob=1&isceo=1&ispres=1&iscoo=1&iscfo=1&isgc=1&isvp=1&is10b5=1&isother=1&tmim=2&mimh=&ipobeforedate=&ipoflag=0&tsql=&mylist=0&cnt=20&action=search";

interface InsiderTrade {
  filingDate: string;
  tradeDate: string;
  ticker: string;
  companyName: string;
  insiderName: string;
  title: string;
  tradeType: string;
  price: number | null;
  qty: number | null;
  value: number | null;
}

/**
 * Extract text from an HTML element by stripping all tags.
 */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Parse numeric value from OpenInsider formatted strings like "$1,234,567" or "12,345".
 */
function parseNumber(str: string): number | null {
  const cleaned = str.replace(/[$,+\s]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

/**
 * Parse the OpenInsider HTML table and extract insider trades.
 * The table has columns: Filing Date, Trade Date, Ticker, Company Name,
 * Insider Name, Title, Trade Type, Price, Qty, Owned, ΔOwn, Value, 1d, 1w, 1m, 6m
 */
function parseInsiderTrades(html: string): InsiderTrade[] {
  const trades: InsiderTrade[] = [];

  // Find the main results table (class="tinytable")
  const tableMatch = html.match(/<table[^>]+class="[^"]*tinytable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return trades;

  const tableContent = tableMatch[1];

  // Extract all table rows (skip the header row)
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  let rowIndex = 0;

  while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
    rowIndex++;
    if (rowIndex <= 1) continue; // skip header row

    const rowHtml = rowMatch[1];

    // Extract all td cells
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(stripTags(cellMatch[1]));
    }

    // OpenInsider columns: 0=X, 1=Filing Date, 2=Trade Date, 3=Ticker, 4=Company,
    //                       5=Insider Name, 6=Title, 7=Trade Type, 8=Price, 9=Qty,
    //                       10=Owned, 11=ΔOwn, 12=Value, ...
    if (cells.length < 13) continue;

    const tradeType = cells[7] ?? "";
    // Only include purchases (P - Purchase), skip sales
    if (!tradeType.includes("P -")) continue;

    const ticker = cells[3]?.replace(/\s/g, "") ?? "";
    if (!ticker || ticker.length > 10) continue;

    trades.push({
      filingDate: cells[1] ?? "",
      tradeDate: cells[2] ?? "",
      ticker,
      companyName: cells[4] ?? "",
      insiderName: cells[5] ?? "",
      title: cells[6] ?? "",
      tradeType,
      price: parseNumber(cells[8] ?? ""),
      qty: parseNumber(cells[9] ?? ""),
      value: parseNumber(cells[12] ?? ""),
    });
  }

  return trades;
}

export async function scrapeOpenInsider(): Promise<void> {
  let html: string;
  try {
    const res = await fetch(OPENINSIDER_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MarketPulse/1.0; +https://github.com/marketpulse)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      console.warn(`[open-insider] HTTP ${res.status} fetching screener`);
      return;
    }

    html = await res.text();
  } catch (err) {
    console.warn(`[open-insider] Fetch failed: ${err}`);
    return;
  }

  const trades = parseInsiderTrades(html);

  if (trades.length === 0) {
    console.warn("[open-insider] No trades parsed — HTML format may have changed");
    return;
  }

  const now = new Date();
  let inserted = 0;

  for (const trade of trades) {
    // Calculate a simple score based on trade value
    // Higher value purchases = more significant signal (capped at 100)
    const valueScore =
      trade.value !== null ? Math.min(100, Math.round((trade.value / 500_000) * 50)) : 50;

    await db.insert(scannerResults).values({
      scannerType: "insider_buy",
      symbol: trade.ticker,
      name: trade.companyName,
      price: trade.price !== null ? String(trade.price) : null,
      volume: trade.qty !== null ? String(trade.qty) : null,
      score: String(valueScore),
      flags: {
        insiderName: trade.insiderName,
        insiderTitle: trade.title,
        tradeType: trade.tradeType,
        tradeDate: trade.tradeDate,
        filingDate: trade.filingDate,
        tradeValue: trade.value,
      },
      scannedAt: now,
    });

    inserted++;
    console.log(
      `[open-insider] ${trade.ticker} — ${trade.insiderName} (${trade.title}): ${trade.tradeType}, value: ${trade.value !== null ? "$" + trade.value.toLocaleString() : "N/A"}`
    );
  }

  console.log(`[open-insider] Inserted ${inserted} insider buy records`);
}
