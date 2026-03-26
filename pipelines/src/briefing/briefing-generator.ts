/**
 * Daily Briefing Generator — Module 5
 *
 * Runs daily at 7:00am UTC after all data collection and signal generation.
 * Generates a structured market briefing stored in daily_briefings table.
 */
import { db } from "@marketpulse/db/client";
import {
  dailyBriefings,
  indicators,
  indicatorValues,
  marketScores,
  marketRegimes,
  signals,
  strategies,
  scannerResults,
} from "@marketpulse/db/schema";
import { eq, and, desc, gte, isNull } from "drizzle-orm";

const MARKETS = ["global", "us", "eu", "asia"] as const;
type Market = (typeof MARKETS)[number];

// ─── Position sizing based on VIX ────────────────────────────────────────────

function getPositionSizing(vix: number): { recommendation: string; cashBuffer: string } {
  if (vix < 15) return { recommendation: "Full equity exposure (100%)", cashBuffer: "0%" };
  if (vix < 25) return { recommendation: "Reduce equity exposure to 80%", cashBuffer: "20%" };
  if (vix < 35) return { recommendation: "Reduce equity exposure to 50%", cashBuffer: "50%" };
  return { recommendation: "Crash mode — reduce equity exposure to 30%", cashBuffer: "70%" };
}

// ─── Score level label ────────────────────────────────────────────────────────

function scoreLevelLabel(score: number): string {
  if (score < 25) return "Low";
  if (score < 50) return "Moderate";
  if (score < 60) return "High";
  if (score < 75) return "Warning";
  if (score < 90) return "Critical";
  return "Extreme";
}

// ─── Headline generator ───────────────────────────────────────────────────────

function buildHeadline(market: Market, crashScore: number, regime: string): string {
  const level = scoreLevelLabel(crashScore);
  const regimeCapitalized = regime.charAt(0).toUpperCase() + regime.slice(1);
  return `${regimeCapitalized} regime | ${market.toUpperCase()} crash risk: ${level} (${Math.round(crashScore)}/100)`;
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(
  market: Market,
  crashScore: number,
  regime: string,
  vix: number | null,
  yieldCurve: number | null,
  creditSpreads: number | null,
  activeSignalCount: number,
  topOpportunities: Array<{ instrument: string; action: string; reason: string; confidence: number }>,
  topRisks: string[],
  positionSizing: { recommendation: string; cashBuffer: string }
): string {
  const lines: string[] = [];

  lines.push(`Market: ${market.toUpperCase()} | Regime: ${regime} | Crash Score: ${Math.round(crashScore)}/100 (${scoreLevelLabel(crashScore)})`);

  if (vix !== null) {
    lines.push(`VIX at ${vix.toFixed(1)} — ${vix < 15 ? "low volatility, risk-on" : vix < 25 ? "moderate volatility" : vix < 35 ? "elevated stress" : "extreme fear"}.`);
  }
  if (yieldCurve !== null) {
    lines.push(`Yield curve (2Y–10Y) spread: ${yieldCurve > 0 ? "+" : ""}${yieldCurve.toFixed(2)}% — ${yieldCurve < 0 ? "inverted (recession signal)" : "positive (normal)"}.`);
  }
  if (creditSpreads !== null) {
    lines.push(`HY credit spreads: ${creditSpreads.toFixed(0)}bps — ${creditSpreads > 500 ? "extreme stress" : creditSpreads > 300 ? "elevated" : "contained"}.`);
  }

  if (topRisks.length > 0) {
    lines.push(`Key risks: ${topRisks.slice(0, 3).join("; ")}.`);
  }

  if (topOpportunities.length > 0) {
    const top = topOpportunities[0];
    lines.push(`Top opportunity: ${top.action} ${top.instrument} — ${top.reason} (confidence: ${top.confidence}%).`);
  }

  lines.push(`Position sizing: ${positionSizing.recommendation}. Active signals: ${activeSignalCount}.`);

  return lines.join(" ");
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateDailyBriefings(): Promise<void> {
  console.log("[briefing-generator] Generating daily briefings...");

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const windowAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);

  // Load latest indicator values
  const indicatorRows = await db
    .select({
      slug: indicators.slug,
      normalizedValue: indicatorValues.normalizedValue,
      value: indicatorValues.value,
    })
    .from(indicatorValues)
    .innerJoin(indicators, eq(indicatorValues.indicatorId, indicators.id))
    .where(and(eq(indicators.isActive, true), gte(indicatorValues.recordedAt, windowAgo)))
    .orderBy(desc(indicatorValues.recordedAt));

  const indicatorMap = new Map<string, { normalized: number; raw: number }>();
  for (const row of indicatorRows) {
    if (!indicatorMap.has(row.slug)) {
      indicatorMap.set(row.slug, {
        normalized: Number(row.normalizedValue),
        raw: Number(row.value),
      });
    }
  }

  const vix = indicatorMap.get("vix")?.raw ?? null;
  const yieldCurve = indicatorMap.get("yield-curve-2y10y")?.raw ?? null;
  const creditSpreads = indicatorMap.get("credit-spreads-hy")?.raw ?? null;
  const fearGreed = indicatorMap.get("fear-greed-index")?.raw ?? null;
  const consumerConf = indicatorMap.get("consumer-confidence")?.raw ?? null;
  const pmi = indicatorMap.get("pmi-manufacturing")?.raw ?? null;

  // Load active signals (top 5 by strength)
  const activeSignalRows = await db
    .select({
      signal: signals,
      strategy: { name: strategies.name, type: strategies.type },
    })
    .from(signals)
    .innerJoin(strategies, eq(signals.strategyId, strategies.id))
    .where(eq(signals.status, "active"))
    .orderBy(desc(signals.strength))
    .limit(10);

  const activeSignalCount = activeSignalRows.length;

  // Top opportunities from signals
  const topOpportunities = activeSignalRows.slice(0, 3).map((row) => ({
    instrument: row.signal.symbol,
    action: (row.signal.direction === "long" ? "BUY" : "SHORT"),
    reason: row.signal.rationale ?? `${row.strategy.name} signal`,
    confidence: Math.round(Number(row.signal.strength)),
  }));

  // Top risks from indicator normalized values
  const topRisks: string[] = [];
  if (vix !== null && vix > 25) topRisks.push(`VIX elevated at ${vix.toFixed(1)}`);
  if (yieldCurve !== null && yieldCurve < 0) topRisks.push(`Yield curve inverted at ${yieldCurve.toFixed(2)}%`);
  if (creditSpreads !== null && creditSpreads > 400) topRisks.push(`HY credit spreads at ${creditSpreads.toFixed(0)}bps`);
  if (fearGreed !== null && fearGreed < 25) topRisks.push(`Fear & Greed Index at ${fearGreed.toFixed(0)} (extreme fear)`);
  if (consumerConf !== null && consumerConf < 60) topRisks.push(`Consumer confidence at ${consumerConf.toFixed(1)}`);
  if (pmi !== null && pmi < 48) topRisks.push(`PMI manufacturing contractionary at ${pmi.toFixed(1)}`);

  // Load today's scanner results for portfolio heatmap proxy
  const scannerRows = await db
    .select()
    .from(scannerResults)
    .where(gte(scannerResults.scannedAt, windowAgo))
    .orderBy(desc(scannerResults.scannedAt))
    .limit(50);

  // Build a simple sector heatmap from scanner results (change % by scanner type)
  const portfolioHeatmap: Record<string, number> = {};
  const sectorAgg: Record<string, { sum: number; count: number }> = {};
  for (const row of scannerRows) {
    const sector = row.scannerType;
    const change = Number(row.changePercent ?? 0);
    if (!sectorAgg[sector]) sectorAgg[sector] = { sum: 0, count: 0 };
    sectorAgg[sector].sum += change;
    sectorAgg[sector].count++;
  }
  for (const [sector, agg] of Object.entries(sectorAgg)) {
    portfolioHeatmap[sector] = Math.round((agg.sum / agg.count) * 100) / 100;
  }

  const positionSizing = getPositionSizing(vix ?? 20);

  // Key indicators for storage
  const keyIndicators = [
    vix !== null ? { slug: "vix", label: "VIX", value: vix.toFixed(1), normalized: indicatorMap.get("vix")?.normalized } : null,
    yieldCurve !== null ? { slug: "yield-curve-2y10y", label: "Yield Curve 2Y-10Y", value: `${yieldCurve.toFixed(2)}%`, normalized: indicatorMap.get("yield-curve-2y10y")?.normalized } : null,
    creditSpreads !== null ? { slug: "credit-spreads-hy", label: "HY Credit Spreads", value: `${creditSpreads.toFixed(0)}bps`, normalized: indicatorMap.get("credit-spreads-hy")?.normalized } : null,
    fearGreed !== null ? { slug: "fear-greed-index", label: "Fear & Greed", value: String(Math.round(fearGreed)), normalized: indicatorMap.get("fear-greed-index")?.normalized } : null,
    consumerConf !== null ? { slug: "consumer-confidence", label: "Consumer Confidence", value: consumerConf.toFixed(1), normalized: indicatorMap.get("consumer-confidence")?.normalized } : null,
  ].filter(Boolean);

  // Generate briefing per market
  for (const market of MARKETS) {
    // Load latest crash score for this market
    const scoreRows = await db
      .select()
      .from(marketScores)
      .where(eq(marketScores.market, market))
      .orderBy(desc(marketScores.calculatedAt))
      .limit(1);

    const crashScore = scoreRows[0] ? Number(scoreRows[0].crashScore) : 50;

    // Load current regime
    const regimeRows = await db
      .select()
      .from(marketRegimes)
      .where(and(eq(marketRegimes.market, market), isNull(marketRegimes.expiredAt)))
      .orderBy(desc(marketRegimes.detectedAt))
      .limit(1);

    const regime = regimeRows[0]?.regime ?? "sideways";

    const headline = buildHeadline(market, crashScore, regime);
    const summary = buildSummary(
      market, crashScore, regime, vix, yieldCurve, creditSpreads,
      activeSignalCount, topOpportunities, topRisks, positionSizing
    );

    const content = {
      date: today,
      overnightSummary: `Global indicators show ${regime} conditions. Crash probability at ${Math.round(crashScore)}/100 (${scoreLevelLabel(crashScore)}).`,
      keyEvents: topRisks.slice(0, 3),
      topOpportunities,
      topRisks,
      activeSignals: activeSignalCount,
      crashScore,
      currentRegime: regime,
      portfolioHeatmap,
      positionSizing,
    };

    // Upsert: delete existing for today + market, then insert fresh
    await db
      .delete(dailyBriefings)
      .where(and(eq(dailyBriefings.market, market), eq(dailyBriefings.date, today)));

    await db.insert(dailyBriefings).values({
      market,
      date: today,
      headline,
      summary,
      regimeLabel: regime,
      crashScore: String(Math.round(crashScore * 100) / 100),
      keyIndicators: keyIndicators,
      signals: activeSignalRows.slice(0, 5).map((r) => ({
        symbol: r.signal.symbol,
        direction: r.signal.direction,
        strength: Number(r.signal.strength),
        rationale: r.signal.rationale,
        strategy: r.strategy.name,
      })),
      generatedAt: new Date(),
    });

    console.log(`[briefing-generator] ${market}: ${headline}`);
  }

  console.log("[briefing-generator] All briefings generated");
}
