/**
 * Daily Briefing Generator — Module 5
 *
 * Runs daily at 7:00am UTC after all data collection and signal generation.
 * Generates a structured market briefing stored in daily_briefings table.
 *
 * Enhanced sections:
 *  - Geopolitical risk summary (top 3 recent headlines)
 *  - Calibration insights per strategy
 *  - Upcoming macro events (next 7 days)
 *  - Options flow summary (unusual activity)
 *  - Optional SMTP delivery (if SMTP_HOST is set)
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
  strategyCalibrations,
  macroEvents,
  optionsFlow,
} from "@marketpulse/db/schema";
import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";

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
  positionSizing: { recommendation: string; cashBuffer: string },
  geopoliticalSection: string,
  calibrationSection: string,
  macroSection: string,
  optionsSection: string
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

  if (geopoliticalSection) lines.push(geopoliticalSection);
  if (calibrationSection) lines.push(calibrationSection);
  if (macroSection) lines.push(macroSection);
  if (optionsSection) lines.push(optionsSection);

  return lines.join(" ");
}

// ─── SMTP delivery ────────────────────────────────────────────────────────────

async function sendDigestEmail(subject: string, htmlBody: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) return;

  try {
    // Dynamic import so nodemailer is optional at runtime
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.default.createTransport({
      host: smtpHost,
      port: 587,
      auth: {
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
      },
    });

    await transport.sendMail({
      from: "MarketPulse <alerts@marketpulse.local>",
      to: process.env.DIGEST_EMAIL ?? "",
      subject,
      html: htmlBody,
    });

    console.log(`[briefing-generator] Digest email sent to ${process.env.DIGEST_EMAIL}`);
  } catch (err) {
    console.warn("[briefing-generator] SMTP delivery failed:", err);
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateDailyBriefings(): Promise<void> {
  console.log("[briefing-generator] Generating daily briefings...");

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const windowAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);
  const now = new Date();
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // ── Load latest indicator values ──────────────────────────────────────────
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
  const geopoliticalRaw = indicatorMap.get("geopolitical-risk")?.raw ?? null;

  // ── Load active signals (top 5 by strength) ───────────────────────────────
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

  const topOpportunities = activeSignalRows.slice(0, 3).map((row) => ({
    instrument: row.signal.symbol,
    action: (row.signal.direction === "long" ? "BUY" : "SHORT"),
    reason: row.signal.rationale ?? `${row.strategy.name} signal`,
    confidence: Math.round(Number(row.signal.strength)),
  }));

  // ── Top risks ─────────────────────────────────────────────────────────────
  const topRisks: string[] = [];
  if (vix !== null && vix > 25) topRisks.push(`VIX elevated at ${vix.toFixed(1)}`);
  if (yieldCurve !== null && yieldCurve < 0) topRisks.push(`Yield curve inverted at ${yieldCurve.toFixed(2)}%`);
  if (creditSpreads !== null && creditSpreads > 400) topRisks.push(`HY credit spreads at ${creditSpreads.toFixed(0)}bps`);
  if (fearGreed !== null && fearGreed < 25) topRisks.push(`Fear & Greed Index at ${fearGreed.toFixed(0)} (extreme fear)`);
  if (consumerConf !== null && consumerConf < 60) topRisks.push(`Consumer confidence at ${consumerConf.toFixed(1)}`);
  if (pmi !== null && pmi < 48) topRisks.push(`PMI manufacturing contractionary at ${pmi.toFixed(1)}`);
  if (geopoliticalRaw !== null && geopoliticalRaw > 50) topRisks.push(`Geopolitical risk score elevated at ${Math.round(geopoliticalRaw)}`);

  // ── Scanner results for portfolio heatmap ─────────────────────────────────
  const scannerRows = await db
    .select()
    .from(scannerResults)
    .where(gte(scannerResults.scannedAt, windowAgo))
    .orderBy(desc(scannerResults.scannedAt))
    .limit(50);

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

  // ── Geopolitical risk section ─────────────────────────────────────────────
  let geopoliticalSection = "";
  if (geopoliticalRaw !== null) {
    const level = geopoliticalRaw >= 70 ? "HIGH" : geopoliticalRaw >= 40 ? "MODERATE" : "LOW";
    geopoliticalSection = `Geopolitical risk: ${level} (score ${Math.round(geopoliticalRaw)}/100).`;
  }

  // ── Calibration insights section ──────────────────────────────────────────
  const calibrationRows = await db
    .select()
    .from(strategyCalibrations)
    .orderBy(desc(strategyCalibrations.calibratedAt))
    .limit(20);

  // Most recent calibration per strategy
  const latestCalibrations = new Map<string, typeof calibrationRows[0]>();
  for (const row of calibrationRows) {
    if (!latestCalibrations.has(row.strategyName)) {
      latestCalibrations.set(row.strategyName, row);
    }
  }

  const calibrationInsights: string[] = [];
  for (const [name, cal] of latestCalibrations) {
    const factor = Number(cal.calibrationFactor ?? 1);
    const winRate = Number(cal.actualWinRate ?? 0);
    const statedConf = Number(cal.statedConfidenceAvg ?? 0);
    if (factor < 0.8 || factor > 1.2) {
      const direction = factor < 0.8 ? "below" : "above";
      calibrationInsights.push(
        `${name} strategy has a ${(winRate * 100).toFixed(0)}% win rate vs ${(statedConf * 100).toFixed(0)}% stated confidence — adjusting ${direction} target`
      );
    }
  }

  const calibrationSection = calibrationInsights.length > 0
    ? `Signal calibration: ${calibrationInsights.slice(0, 2).join("; ")}.`
    : "";

  // ── Macro events (next 7 days) ────────────────────────────────────────────
  const upcomingMacroEvents = await db
    .select()
    .from(macroEvents)
    .where(and(gte(macroEvents.eventDate, now), lte(macroEvents.eventDate, sevenDaysLater)))
    .orderBy(macroEvents.eventDate)
    .limit(5);

  const macroSection = upcomingMacroEvents.length > 0
    ? `Upcoming macro events (7 days): ${upcomingMacroEvents
        .map((e) => `${e.title} (${new Date(e.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`)
        .join(", ")}.`
    : "";

  // ── Options flow summary ──────────────────────────────────────────────────
  const unusualOptionsRows = await db
    .select()
    .from(optionsFlow)
    .where(and(eq(optionsFlow.isUnusual, true), gte(optionsFlow.fetchedAt, windowAgo)))
    .orderBy(desc(optionsFlow.volume))
    .limit(5);

  let optionsSection = "";
  if (unusualOptionsRows.length > 0) {
    const bullish = unusualOptionsRows.filter((r) => r.contractType === "call" || r.sentiment === "bullish");
    const bearish = unusualOptionsRows.filter((r) => r.contractType === "put" || r.sentiment === "bearish");
    const callTickers = [...new Set(bullish.map((r) => r.ticker))].slice(0, 3).join(", ");
    const putTickers = [...new Set(bearish.map((r) => r.ticker))].slice(0, 3).join(", ");
    const parts: string[] = [];
    if (callTickers) parts.push(`unusual call activity on ${callTickers} — bullish positioning`);
    if (putTickers) parts.push(`unusual put activity on ${putTickers} — bearish positioning`);
    if (parts.length > 0) optionsSection = `Options flow: ${parts.join("; ")}.`;
  }

  const positionSizing = getPositionSizing(vix ?? 20);

  const keyIndicators = [
    vix !== null ? { slug: "vix", label: "VIX", value: vix.toFixed(1), normalized: indicatorMap.get("vix")?.normalized } : null,
    yieldCurve !== null ? { slug: "yield-curve-2y10y", label: "Yield Curve 2Y-10Y", value: `${yieldCurve.toFixed(2)}%`, normalized: indicatorMap.get("yield-curve-2y10y")?.normalized } : null,
    creditSpreads !== null ? { slug: "credit-spreads-hy", label: "HY Credit Spreads", value: `${creditSpreads.toFixed(0)}bps`, normalized: indicatorMap.get("credit-spreads-hy")?.normalized } : null,
    fearGreed !== null ? { slug: "fear-greed-index", label: "Fear & Greed", value: String(Math.round(fearGreed)), normalized: indicatorMap.get("fear-greed-index")?.normalized } : null,
    consumerConf !== null ? { slug: "consumer-confidence", label: "Consumer Confidence", value: consumerConf.toFixed(1), normalized: indicatorMap.get("consumer-confidence")?.normalized } : null,
    geopoliticalRaw !== null ? { slug: "geopolitical-risk", label: "Geopolitical Risk", value: String(Math.round(geopoliticalRaw)), normalized: indicatorMap.get("geopolitical-risk")?.normalized } : null,
  ].filter(Boolean);

  // ── Generate briefing per market ──────────────────────────────────────────
  for (const market of MARKETS) {
    const scoreRows = await db
      .select()
      .from(marketScores)
      .where(eq(marketScores.market, market))
      .orderBy(desc(marketScores.calculatedAt))
      .limit(1);

    const crashScore = scoreRows[0] ? Number(scoreRows[0].crashScore) : 50;

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
      activeSignalCount, topOpportunities, topRisks, positionSizing,
      geopoliticalSection, calibrationSection, macroSection, optionsSection
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
      geopolitical: geopoliticalSection || null,
      calibrationInsights: calibrationInsights.length > 0 ? calibrationInsights : null,
      upcomingMacroEvents: upcomingMacroEvents.map((e) => ({
        title: e.title,
        eventType: e.eventType,
        eventDate: e.eventDate,
        impact: e.impact,
      })),
      optionsFlow: optionsSection || null,
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
      keyIndicators,
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

  // ── Optional SMTP delivery (global market briefing only) ──────────────────
  if (process.env.SMTP_HOST && process.env.DIGEST_EMAIL) {
    const globalScore = await db
      .select()
      .from(marketScores)
      .where(eq(marketScores.market, "global"))
      .orderBy(desc(marketScores.calculatedAt))
      .limit(1);

    const score = globalScore[0] ? Number(globalScore[0].crashScore) : 50;
    const level = scoreLevelLabel(score);

    const htmlBody = `
<h2>MarketPulse Daily Digest — ${today}</h2>
<p><strong>Global Crash Score:</strong> ${Math.round(score)}/100 (${level})</p>
${geopoliticalSection ? `<p><strong>Geopolitical:</strong> ${geopoliticalSection}</p>` : ""}
${calibrationSection ? `<p><strong>Calibration:</strong> ${calibrationSection}</p>` : ""}
${macroSection ? `<p><strong>Macro Events:</strong> ${macroSection}</p>` : ""}
${optionsSection ? `<p><strong>Options Flow:</strong> ${optionsSection}</p>` : ""}
<p><strong>Top Risks:</strong> ${topRisks.slice(0, 3).join("; ") || "None"}</p>
<p><strong>Top Opportunity:</strong> ${topOpportunities[0] ? `${topOpportunities[0].action} ${topOpportunities[0].instrument} — ${topOpportunities[0].reason}` : "None"}</p>
<p><strong>Position Sizing:</strong> ${positionSizing.recommendation}</p>
    `.trim();

    await sendDigestEmail(
      `MarketPulse Daily — Crash Score: ${Math.round(score)} (${level})`,
      htmlBody
    );
  }

  console.log("[briefing-generator] All briefings generated");
}
