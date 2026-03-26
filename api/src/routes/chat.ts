/**
 * AI Chat Assistant — POST /v1/chat
 *
 * Accepts a user message with optional conversation context, builds
 * a real-time market data prompt, calls Claude Haiku, and returns a
 * structured response with sources and suggested follow-ups.
 */
import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@marketpulse/db/client";
import {
  marketScores,
  alerts,
  indicators,
  indicatorValues,
} from "@marketpulse/db/schema";
import {
  signals,
  dailyBriefings,
  scannerResults,
  portfolios,
  trades,
  chatMessages,
  appSettings,
} from "@marketpulse/db/schema";
import { desc, eq, and, isNull } from "drizzle-orm";
import { decryptSetting } from "./settings.js";

export const chatRouter = new Hono();

// ─── Rate limiting (in-memory, resets daily) ─────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 86400000 });
    return true;
  }
  if (entry.count >= 50) return false;
  entry.count++;
  return true;
}

// ─── Context builder ──────────────────────────────────────────────────────────

async function buildMarketContext(pageContext?: string): Promise<string> {
  const [scores, recentAlerts, activeIndicators, todayBriefings] =
    await Promise.all([
      db
        .select()
        .from(marketScores)
        .orderBy(desc(marketScores.calculatedAt))
        .limit(8),
      db
        .select()
        .from(alerts)
        .where(isNull(alerts.acknowledgedAt))
        .orderBy(desc(alerts.triggeredAt))
        .limit(5),
      db
        .select()
        .from(indicatorValues)
        .innerJoin(indicators, eq(indicatorValues.indicatorId, indicators.id))
        .where(eq(indicators.isActive, true))
        .orderBy(desc(indicatorValues.recordedAt))
        .limit(30),
      db
        .select()
        .from(dailyBriefings)
        .where(eq(dailyBriefings.date, new Date().toISOString().split("T")[0]))
        .orderBy(desc(dailyBriefings.generatedAt))
        .limit(4),
    ]);

  // Latest score per market
  const latestScores = new Map<string, (typeof scores)[number]>();
  for (const s of scores) {
    if (!latestScores.has(s.market)) latestScores.set(s.market, s);
  }

  const crashScoresText = [...latestScores.values()]
    .map(
      (s) =>
        `  ${s.market.toUpperCase()}: ${s.crashScore} (as of ${new Date(s.calculatedAt).toISOString()})`
    )
    .join("\n") || "  No scores available";

  // Latest value per indicator
  const latestIndicators = new Map<
    string,
    { slug: string; name: string; value: string; normalizedValue: string }
  >();
  for (const row of activeIndicators) {
    const slug = row.indicators.slug;
    if (!latestIndicators.has(slug)) {
      latestIndicators.set(slug, {
        slug,
        name: row.indicators.name,
        value: row.indicator_values.value,
        normalizedValue: row.indicator_values.normalizedValue,
      });
    }
  }
  const indicatorsText = [...latestIndicators.values()]
    .map(
      (i) =>
        `  ${i.name} (${i.slug}): value=${i.value}, risk=${i.normalizedValue}/100`
    )
    .join("\n") || "  No indicator data available";

  const alertsText =
    recentAlerts.length > 0
      ? recentAlerts
          .map(
            (a) =>
              `  [${a.severity.toUpperCase()}] ${a.market}: ${a.message} (score: ${a.crashScore})`
          )
          .join("\n")
      : "  No active alerts";

  const briefingText =
    todayBriefings.length > 0
      ? todayBriefings
          .map((b) => `  ${b.market}: ${b.headline}\n  ${b.summary}`)
          .join("\n\n")
      : "  No briefing available for today";

  // Optional: scanner results when on scanner page
  let scannerText = "";
  if (pageContext === "scanner") {
    const scanResults = await db
      .select()
      .from(scannerResults)
      .orderBy(desc(scannerResults.scannedAt))
      .limit(10);
    if (scanResults.length > 0) {
      scannerText =
        "\n\nSCANNER RESULTS:\n" +
        scanResults
          .map(
            (r) =>
              `  ${r.symbol} (${r.scannerType}): price=${r.price}, change=${r.changePercent}%`
          )
          .join("\n");
    }
  }

  // Optional: portfolio summary
  let portfolioText = "";
  try {
    const portfolio = await db
      .select()
      .from(portfolios)
      .where(and(eq(portfolios.isActive, true), eq(portfolios.type, "paper")))
      .orderBy(portfolios.createdAt)
      .limit(1);
    if (portfolio[0]) {
      const openTrades = await db
        .select()
        .from(trades)
        .where(
          and(
            eq(trades.portfolioId, portfolio[0].id),
            eq(trades.status, "open")
          )
        )
        .limit(10);
      portfolioText = `\n\nPORTFOLIO SUMMARY:\n  Value: $${portfolio[0].currentValue ?? portfolio[0].initialCapital}\n  Open positions: ${openTrades.length}`;
    }
  } catch {
    // Portfolio data is optional
  }

  return (
    `CURRENT MARKET DATA:\n${crashScoresText}\n\n` +
    `KEY INDICATORS:\n${indicatorsText}\n\n` +
    `RECENT ALERTS:\n${alertsText}\n\n` +
    `DAILY BRIEFING:\n${briefingText}` +
    scannerText +
    portfolioText
  );
}

// ─── Fetch active signals ─────────────────────────────────────────────────────

async function getActiveSignals(): Promise<string> {
  try {
    const activeSignals = await db
      .select()
      .from(signals)
      .where(eq(signals.status, "active"))
      .orderBy(desc(signals.generatedAt))
      .limit(10);
    if (activeSignals.length === 0) return "  No active signals";
    return activeSignals
      .map(
        (s) =>
          `  ${s.symbol} ${s.direction.toUpperCase()}: strength=${s.strength}, confidence=${s.confidenceScore ?? "N/A"}`
      )
      .join("\n");
  } catch {
    return "  Signal data unavailable";
  }
}

// ─── POST /v1/chat ────────────────────────────────────────────────────────────

chatRouter.post("/", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return c.json(
      { error: "Rate limit exceeded. Maximum 50 messages per day." },
      429
    );
  }

  const body = await c.req.json<{
    message: string;
    conversationId?: string;
    pageContext?: string;
  }>();

  if (!body.message?.trim()) {
    return c.json({ error: "message is required" }, 400);
  }

  // Resolve API key: DB setting takes priority over env var
  let apiKey: string | undefined;
  try {
    const settingRow = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "anthropic_api_key"))
      .limit(1);
    if (settingRow[0]) {
      apiKey = decryptSetting(settingRow[0].encryptedValue);
    }
  } catch {
    // DB lookup failed — fall through to env var
  }
  if (!apiKey) {
    apiKey = process.env.ANTHROPIC_API_KEY;
  }

  if (!apiKey) {
    return c.json({
      error: "Please configure your Anthropic API key in Settings",
    }, 503);
  }

  const conversationId =
    body.conversationId ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const [marketContext, activeSignalsText] = await Promise.all([
    buildMarketContext(body.pageContext),
    getActiveSignals(),
  ]);

  const systemPrompt = `You are MarketPulse AI, a professional market analyst assistant. You have access to real-time market data shown below. Always base your answers on this data. Be specific with numbers and dates. When recommending actions, always include risk warnings. Explain complex concepts simply when asked. Never make guarantees about market performance.

${marketContext}

ACTIVE SIGNALS:
${activeSignalsText}

After your main response, append a JSON block with exactly 3 suggested follow-up questions in this format:
<followups>
["Question 1?", "Question 2?", "Question 3?"]
</followups>`;

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: body.message }],
  });

  const rawReply =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract follow-ups from <followups> block
  const followupsMatch = rawReply.match(/<followups>([\s\S]*?)<\/followups>/);
  let suggestedFollowups: string[] = [];
  let reply = rawReply;

  if (followupsMatch) {
    try {
      suggestedFollowups = JSON.parse(followupsMatch[1].trim());
    } catch {
      suggestedFollowups = [];
    }
    reply = rawReply.replace(/<followups>[\s\S]*?<\/followups>/, "").trim();
  }

  // Extract indicator slugs mentioned in the reply
  const knownSlugs = [
    "vix",
    "yield-curve-2y10y",
    "credit-spreads-hy",
    "put-call-ratio",
    "spx-breadth-200ma",
    "dxy",
    "pmi-manufacturing",
    "consumer-confidence",
    "m2-money-supply",
    "fear-greed-index",
  ];
  const sources = knownSlugs.filter((slug) =>
    reply.toLowerCase().includes(slug.replace(/-/g, " ")) ||
    reply.toLowerCase().includes(slug)
  );

  // Persist to chat_messages (fire-and-forget, non-blocking)
  const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens;
  db.insert(chatMessages)
    .values([
      {
        conversationId,
        role: "user",
        content: body.message,
        model: "claude-haiku-4-5-20251001",
      },
      {
        conversationId,
        role: "assistant",
        content: reply,
        tokensUsed,
        model: "claude-haiku-4-5-20251001",
      },
    ])
    .catch(() => {
      // Non-critical — chat works even if logging fails
    });

  return c.json({ reply, sources, suggestedFollowups, conversationId });
});
