import { useEffect, useState, useCallback } from "react";
import { getDashboard, getRegime, getBriefingToday, getScoreHistory, getSignals, getNews, getStrategyPerformance, fetchJSON } from "../api.js";
import { CrashScoreGauge } from "../components/CrashScoreGauge.js";
import { MarketGrid } from "../components/MarketGrid.js";
import { AlertsList } from "../components/AlertsList.js";
import { ScoreHistoryChart } from "../components/ScoreHistoryChart.js";
import { IndicatorTable } from "../components/IndicatorTable.js";
import { AttributionPanel } from "../components/AttributionPanel.js";
import { CorrelationHeatmap } from "../components/CorrelationHeatmap.js";
import { ReportExport } from "../components/ReportExport.js";
import {
  C,
  Card,
  SectionTitle,
  InfoIcon,
  ErrorBanner,
  SkeletonBlock,
  SkeletonLine,
  Badge,
  REGIME_COLORS,
  useExpertise,
  getScoreColor,
  getScoreLabel,
} from "../context.js";

// ---------------------------------------------------------------------------
// Social Sentiment Widget (WSB)
// ---------------------------------------------------------------------------

interface WsbTicker {
  ticker: string;
  mentions: number;
  sentiment: "bullish" | "bearish" | "neutral";
  score?: number;
}

function SocialSentimentWidget() {
  const [tickers, setTickers] = useState<WsbTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchJSON<any>("/social/wsb");
        if (!cancelled) {
          const items: WsbTicker[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.tickers)
            ? data.tickers
            : [];
          setTickers(items.slice(0, 5));
          setUnavailable(items.length === 0);
        }
      } catch {
        if (!cancelled) setUnavailable(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30 * 60_000); // refresh every 30 min
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const sentimentColor = (s: string) =>
    s === "bullish" ? C.green : s === "bearish" ? C.red : C.amber;

  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          🐸 Retail Sentiment (r/WallStreetBets)
        </span>
        <span style={{ color: C.textMuted, fontSize: 10 }}>30m refresh</span>
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 28, background: "#1e293b", borderRadius: 6, opacity: 0.5 }} />
          ))}
        </div>
      )}

      {!loading && unavailable && (
        <div style={{ color: C.textMuted, fontSize: 12, padding: "8px 0" }}>
          WSB sentiment feed unavailable
        </div>
      )}

      {!loading && !unavailable && tickers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tickers.map((t, i) => {
            const sColor = sentimentColor(t.sentiment);
            return (
              <div
                key={t.ticker}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: i < tickers.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ color: C.textMuted, fontSize: 11, width: 16, textAlign: "right", flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ color: C.textPrimary, fontWeight: 700, fontFamily: "monospace", fontSize: 13, flex: 1 }}>
                  {t.ticker}
                </span>
                {t.mentions != null && (
                  <span style={{ color: C.textMuted, fontSize: 11 }}>{t.mentions} mentions</span>
                )}
                <span
                  style={{
                    color: sColor,
                    background: `${sColor}18`,
                    border: `1px solid ${sColor}44`,
                    padding: "1px 8px",
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "capitalize",
                    flexShrink: 0,
                  }}
                >
                  {t.sentiment}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function BriefingSection({ briefing }: { briefing: any }) {
  const { isBeginner, isProfessional } = useExpertise();
  const opportunities = briefing?.opportunities ?? briefing?.topOpportunities ?? [];
  const risks = briefing?.risks ?? briefing?.topRisks ?? [];

  return (
    <Card>
      {briefing.headline && (
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: C.textPrimary,
            marginBottom: 12,
            lineHeight: 1.4,
          }}
        >
          {briefing.headline}
        </div>
      )}
      {briefing.summary && (
        <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
          {briefing.summary}
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Opportunities */}
        <div>
          <div
            style={{
              color: C.green,
              fontWeight: 600,
              fontSize: 11,
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Top Opportunities
          </div>
          {opportunities.slice(0, 3).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {opportunities.slice(0, 3).map((item: any, i: number) => {
                const text = typeof item === "string" ? item : item.text ?? item.description ?? item.instrument ?? JSON.stringify(item);
                const reason = typeof item === "object" ? item.reason ?? item.rationale : null;
                return (
                  <div
                    key={i}
                    style={{
                      background: `${C.green}11`,
                      border: `1px solid ${C.green}33`,
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ color: C.textPrimary, fontSize: 13, fontWeight: 500 }}>{text}</div>
                    {reason && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>{reason}</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: C.textMuted, fontSize: 13 }}>No opportunities identified today</p>
          )}
        </div>

        {/* Risks */}
        <div>
          <div
            style={{
              color: C.red,
              fontWeight: 600,
              fontSize: 11,
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Top Risks
          </div>
          {risks.slice(0, 3).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {risks.slice(0, 3).map((item: any, i: number) => {
                const text = typeof item === "string" ? item : item.text ?? item.description ?? JSON.stringify(item);
                return (
                  <div
                    key={i}
                    style={{
                      background: `${C.red}0d`,
                      border: `1px solid ${C.red}33`,
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ color: C.textSecondary, fontSize: 13 }}>{text}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: C.textMuted, fontSize: 13 }}>No major risks flagged today</p>
          )}
        </div>
      </div>

      {isBeginner && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: `${C.blue}11`,
            border: `1px solid ${C.blue}33`,
            borderRadius: 8,
            fontSize: 12,
            color: C.textSecondary,
          }}
        >
          📚 <strong>Beginner tip:</strong> The daily briefing summarizes the most important market signals.
          Opportunities are potential trades to consider; risks are conditions that could cause losses.
        </div>
      )}
    </Card>
  );
}

function HistoricalAnalogSection({ analog }: { analog: any }) {
  const { isBeginner, isProfessional } = useExpertise();
  if (!analog) return null;

  const label =
    typeof analog === "string"
      ? analog
      : analog.label ?? analog.period ?? analog.name ?? JSON.stringify(analog);
  const similarity = analog?.similarity ?? analog?.similarityScore;
  const description = analog?.description ?? analog?.context;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ fontSize: 28 }}>🔭</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            Similar to: {label}
          </div>
          {similarity != null && (
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>
              {(Number(similarity) > 1 ? Number(similarity) : Number(similarity) * 100).toFixed(0)}% similarity
            </div>
          )}
          {description && (
            <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }}>{description}</div>
          )}
          {!description && (
            <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
              Current indicator patterns closely resemble this historical period.
            </div>
          )}
        </div>
      </div>
      {isBeginner && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: `${C.blue}11`,
            border: `1px solid ${C.blue}33`,
            borderRadius: 8,
            fontSize: 12,
            color: C.textSecondary,
          }}
        >
          📚 <strong>Beginner tip:</strong> Historical analogs compare current indicator patterns to past
          market phases using cosine similarity across 12 dimensions. This helps predict what may happen next.
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Beginner: Plain-English Market Summary card
// ---------------------------------------------------------------------------
function BeginnerSummaryCard({ score }: { score: number }) {
  let headline: string;
  let detail: string;
  let tone: "positive" | "neutral" | "negative";

  if (score < 25) {
    headline = "Markets are calm";
    detail = `Current crash score of ${Math.round(score)} indicates low risk. Volatility is contained and conditions look stable. Good time for steady, long-term investments.`;
    tone = "positive";
  } else if (score < 50) {
    headline = "Markets are cautious";
    detail = `Current crash score of ${Math.round(score)} suggests moderate risk. Some warning signs are present. Consider reviewing your portfolio for balance.`;
    tone = "neutral";
  } else if (score < 75) {
    headline = "Markets are elevated risk";
    detail = `Current crash score of ${Math.round(score)} is elevated. Multiple indicators are showing stress. Reducing exposure to risky assets may be prudent.`;
    tone = "negative";
  } else {
    headline = "Markets are in danger zone";
    detail = `Current crash score of ${Math.round(score)} is in the critical range. Historically, scores above 75 have preceded major corrections. Exercise caution.`;
    tone = "negative";
  }

  const bgColor = tone === "positive" ? `${C.green}0d` : tone === "negative" ? `${C.red}0d` : `${C.amber}0d`;
  const borderColor = tone === "positive" ? `${C.green}33` : tone === "negative" ? `${C.red}33` : `${C.amber}33`;
  const headlineColor = tone === "positive" ? C.green : tone === "negative" ? C.red : C.amber;

  return (
    <Card style={{ marginBottom: 24, background: bgColor, borderColor }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span style={{ fontSize: 24 }}>{tone === "positive" ? "✅" : tone === "negative" ? "⚠️" : "📊"}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: headlineColor, marginBottom: 6 }}>
            {headline}
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
            {detail}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: C.textMuted }}>
            Market Summary in Plain English · Switch to Intermediate or Professional for detailed data
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Professional: Dense mini-dashboard grid
// ---------------------------------------------------------------------------
function ProDenseGrid({ scores, indicators }: { scores: any[]; indicators: any[] }) {
  const topIndicators = [...indicators]
    .filter((i) => i.latestValue)
    .sort((a, b) => {
      const av = Number(a.latestValue?.normalizedValue ?? 0) * Number(a.weight ?? 0);
      const bv = Number(b.latestValue?.normalizedValue ?? 0) * Number(b.weight ?? 0);
      return bv - av;
    })
    .slice(0, 5);

  return (
    <div
      style={{
        background: "#080c13",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 20,
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        alignItems: "center",
      }}
    >
      {scores.map((s: any) => {
        const sc = Number(s.crashScore);
        const col = getScoreColor(sc);
        return (
          <div key={s.market} style={{ textAlign: "center", minWidth: 52 }}>
            <div style={{ color: C.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.market}</div>
            <div style={{ color: col, fontSize: 18, fontWeight: 800, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{sc.toFixed(1)}</div>
            <div style={{ color: C.textMuted, fontSize: 9 }}>{getScoreLabel(sc)}</div>
          </div>
        );
      })}
      <div style={{ width: 1, height: 40, background: C.border, flexShrink: 0 }} />
      {topIndicators.map((ind: any) => {
        const norm = Number(ind.latestValue?.normalizedValue ?? 0);
        const raw = Number(ind.latestValue?.value ?? 0);
        const col = getScoreColor(norm);
        return (
          <div key={ind.slug} style={{ minWidth: 72 }}>
            <div style={{ color: C.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{ind.name.slice(0, 12)}</div>
            <div style={{ color: C.textPrimary, fontSize: 12, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{raw.toFixed(2)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <div style={{ flex: 1, height: 3, background: "#1e293b", borderRadius: 2 }}>
                <div style={{ width: `${Math.min(100, norm)}%`, height: "100%", background: col, borderRadius: 2 }} />
              </div>
              <span style={{ color: col, fontSize: 9, fontFamily: "monospace" }}>{norm.toFixed(0)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Overview() {
  const { isBeginner, isProfessional } = useExpertise();
  const [dashboard, setDashboard] = useState<any>(null);
  const [regime, setRegime] = useState<any>(null);
  const [briefing, setBriefing] = useState<any>(null);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [latestSignals, setLatestSignals] = useState<any[]>([]);
  const [latestNews, setLatestNews] = useState<any[]>([]);
  const [topStrategy, setTopStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, indRes] = await Promise.all([
        getDashboard(),
        fetch("/v1/indicators").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      setDashboard(dash);
      setIndicators(Array.isArray(indRes) ? indRes : []);
      setLastUpdated(new Date());
      setSecondsAgo(0);
      setDashError(null);
    } catch (e) {
      setDashError(String(e));
    } finally {
      setLoading(false);
    }

    getRegime().then(setRegime).catch(() => setRegime(null));
    getBriefingToday().then(setBriefing).catch(() => setBriefing(null));

    // Fetch mini-panel data
    getSignals()
      .then((sigs) => {
        const active = sigs.filter((s: any) => !["expired", "closed", "cancelled"].includes((s.status ?? "").toLowerCase()));
        setLatestSignals(active.slice(0, 3));
      })
      .catch(() => {});
    getNews(5)
      .then((news) => setLatestNews(Array.isArray(news) ? news.slice(0, 3) : []))
      .catch(() => {});
    getStrategyPerformance()
      .then((perfs) => {
        if (Array.isArray(perfs) && perfs.length > 0) {
          const sorted = [...perfs].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));
          setTopStrategy(sorted[0]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // "Seconds ago" ticker
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const globalScore = dashboard?.scores?.find((s: any) => s.market === "global");

  // Build per-market regime map
  const regimeByMarket: Record<string, string> = {};
  if (regime) {
    if (Array.isArray(regime)) {
      regime.forEach((r: any) => { if (r.market) regimeByMarket[r.market] = r.regime; });
    } else if (regime.market) {
      regimeByMarket[regime.market] = regime.regime;
    } else if (regime.markets) {
      Object.entries(regime.markets).forEach(([k, v]: [string, any]) => { regimeByMarket[k] = v; });
    }
  }

  const historicalAnalog = regime?.historicalAnalog ?? regime?.similarPeriod ?? null;

  return (
    <div style={{ padding: 28, maxWidth: 1400 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Overview</h1>
          <p style={{ color: C.textMuted, marginTop: 5, fontSize: 13 }}>
            Real-time crash probability dashboard
            {lastUpdated && (
              <span style={{ marginLeft: 12, color: "#2a3a50" }}>
                Last updated {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
              </span>
            )}
          </p>
        </div>
        <ReportExport
          data={{
            globalScore: globalScore ? Number(globalScore.crashScore) : undefined,
            regime: typeof regime?.regime === "string" ? regime.regime : undefined,
            scores: dashboard?.scores ?? [],
            indicators: indicators ?? [],
            signals: latestSignals ?? [],
          }}
        />
      </div>

      {dashError && <ErrorBanner message={`Dashboard data unavailable: ${dashError}`} onRetry={load} />}

      {/* Loading skeleton */}
      {loading && !dashboard && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SkeletonBlock height={200} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <SkeletonBlock height={140} />
            <SkeletonBlock height={140} />
            <SkeletonBlock height={140} />
          </div>
          <SkeletonBlock height={320} />
        </div>
      )}

      {dashboard && (
        <>
          {/* Beginner: Plain-English Market Summary */}
          {isBeginner && globalScore && (
            <BeginnerSummaryCard score={Number(globalScore.crashScore)} />
          )}

          {/* Professional: Dense mini-dashboard */}
          {isProfessional && (
            <ProDenseGrid scores={dashboard.scores ?? []} indicators={indicators} />
          )}

          {/* Global Crash Score — HERO */}
          {globalScore && (
            <div style={{ marginBottom: 32 }}>
              <SectionTitle
                info="The Crash Probability Score aggregates 12 market indicators weighted by historical predictive power."
              >
                Global Crash Score
              </SectionTitle>
              <Card style={{ display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
                {/* Larger gauge — hero element */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <CrashScoreGauge score={Number(globalScore.crashScore)} size={280} />
                  {/* Pulsing live indicator */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: -8 }}>
                    <div
                      style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: C.green,
                        boxShadow: `0 0 8px ${C.green}`,
                        animation: "pulse 2s infinite",
                      }}
                    />
                    <span style={{ color: C.textMuted, fontSize: 11 }}>Live · updates every 60s</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  {/* Component scores */}
                  {globalScore.componentScores && (
                    <div>
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: 16,
                        }}
                      >
                        Component Breakdown
                      </div>
                      {Object.entries(globalScore.componentScores).map(([k, v]: [string, any]) =>
                        v != null ? (
                          <div key={k} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ color: C.textSecondary, fontSize: 12, textTransform: "capitalize" }}>
                                {k}
                              </span>
                              <span
                                style={{
                                  color: Number(v) >= 75 ? C.red : Number(v) >= 50 ? C.amber : C.green,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                }}
                              >
                                {Number(v).toFixed(0)}
                              </span>
                            </div>
                            <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Number(v))}%`,
                                  height: "100%",
                                  background:
                                    Number(v) >= 75 ? C.red : Number(v) >= 50 ? C.amber : C.green,
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                  {isBeginner && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: "10px 14px",
                        background: `${C.blue}11`,
                        border: `1px solid ${C.blue}33`,
                        borderRadius: 8,
                        fontSize: 12,
                        color: C.textSecondary,
                      }}
                    >
                      📚 The crash score combines volatility, sentiment, macro indicators, and credit
                      conditions. Higher = more danger.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Market Cards */}
          <div style={{ marginBottom: 32 }}>
            <SectionTitle info="Per-market crash probability scores. Click a card to see component breakdown.">
              Markets
            </SectionTitle>
            <MarketGrid scores={dashboard.scores} regimeByMarket={regimeByMarket} />
          </div>

          {/* Mini-panels: Latest Signals + Breaking News + Top Strategy */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
            {/* Latest Signals mini-panel */}
            <Card style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  📈 Latest Signals
                </span>
                <span style={{ color: C.textMuted, fontSize: 11 }}>{latestSignals.length} active</span>
              </div>
              {latestSignals.length === 0 ? (
                <div style={{ color: C.textMuted, fontSize: 12 }}>No active signals</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {latestSignals.map((sig: any) => {
                    const isLong = ["BUY", "LONG"].includes((sig.action ?? "").toUpperCase());
                    const dirColor = isLong ? C.green : C.red;
                    const confidence = sig.confidence ?? sig.strength ?? 0;
                    return (
                      <div key={sig.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                        <span
                          style={{
                            color: dirColor, background: `${dirColor}18`, border: `1px solid ${dirColor}44`,
                            padding: "1px 7px", borderRadius: 3, fontSize: 10, fontWeight: 800, flexShrink: 0,
                          }}
                        >
                          {isLong ? "LONG" : "SHORT"}
                        </span>
                        <span style={{ color: C.textPrimary, fontWeight: 700, fontFamily: "monospace", fontSize: 13, flex: 1 }}>
                          {sig.instrument ?? "—"}
                        </span>
                        <span style={{ color: confidence >= 75 ? C.green : confidence >= 50 ? C.amber : C.red, fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>
                          {confidence.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Breaking News mini-panel */}
            <Card style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  📰 Breaking News
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, boxShadow: `0 0 4px ${C.green}` }} />
                  <span style={{ color: C.textMuted, fontSize: 11 }}>Live</span>
                </div>
              </div>
              {latestNews.length === 0 ? (
                <div style={{ color: C.textMuted, fontSize: 12 }}>No news loaded</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {latestNews.map((item: any) => {
                    const sentiment = item.sentiment?.toLowerCase();
                    const sentColor = sentiment === "bullish" ? C.green : sentiment === "bearish" ? C.red : C.amber;
                    return (
                      <div key={item.id} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
                        <p style={{ color: C.textSecondary, fontSize: 12, margin: "0 0 4px", lineHeight: 1.5 }}>
                          {item.headline}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {item.source && <span style={{ color: C.textMuted, fontSize: 10 }}>{item.source}</span>}
                          {sentiment && (
                            <span style={{ color: sentColor, fontSize: 10, fontWeight: 700, textTransform: "capitalize" }}>
                              · {sentiment}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Top Strategy this week mini-panel */}
            <Card style={{ padding: "16px 18px" }}>
              <div style={{ marginBottom: 14 }}>
                <span style={{ color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  🏆 Top Strategy
                </span>
              </div>
              {!topStrategy ? (
                <div style={{ color: C.textMuted, fontSize: 12 }}>No performance data</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ color: C.textPrimary, fontWeight: 700, fontSize: 15 }}>{topStrategy.name}</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {topStrategy.winRate != null && (
                      <div>
                        <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 3 }}>WIN RATE</div>
                        <div style={{ color: topStrategy.winRate >= 50 ? C.green : C.red, fontFamily: "monospace", fontSize: 18, fontWeight: 700 }}>
                          {topStrategy.winRate.toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {topStrategy.totalPnl != null && (
                      <div>
                        <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 3 }}>TOTAL P&L</div>
                        <div style={{ color: topStrategy.totalPnl >= 0 ? C.green : C.red, fontFamily: "monospace", fontSize: 18, fontWeight: 700 }}>
                          {topStrategy.totalPnl >= 0 ? "+" : ""}{topStrategy.totalPnl.toFixed(2)}%
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                    Best performer by win rate this period
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Performance Attribution + Social Sentiment */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
            <div>
              <SectionTitle info="Which indicators are contributing most to today's crash score.">
                Performance Attribution
              </SectionTitle>
              <AttributionPanel />
            </div>
            <div>
              <SectionTitle info="Top tickers mentioned on r/WallStreetBets today with retail sentiment.">
                Social Sentiment
              </SectionTitle>
              <SocialSentimentWidget />
            </div>
          </div>

          {/* Correlation Heatmap */}
          <div style={{ marginBottom: 32 }}>
            <SectionTitle info="Pearson correlation between key indicators over the last 30 days. Hover a cell to see the relationship explained.">
              Indicator Correlations
            </SectionTitle>
            <CorrelationHeatmap />
          </div>

          {/* Today's Briefing */}
          <div style={{ marginBottom: 32 }}>
            <SectionTitle>Today's Briefing</SectionTitle>
            {briefing ? (
              <BriefingSection briefing={briefing} />
            ) : (
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.textMuted }}>
                  <span style={{ fontSize: 18 }}>🕖</span>
                  <span style={{ fontSize: 13 }}>Briefing generates daily at 07:00 UTC</span>
                </div>
              </Card>
            )}
          </div>

          {/* Historical Analog */}
          {historicalAnalog && (
            <div style={{ marginBottom: 32 }}>
              <SectionTitle info="Historical analogs compare current indicator patterns to past market phases using cosine similarity across 12 dimensions.">
                Historical Analog
              </SectionTitle>
              <HistoricalAnalogSection analog={historicalAnalog} />
            </div>
          )}

          {/* Score History + Alerts */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
            <div>
              <SectionTitle info="Historical crash probability score over time. Threshold lines mark High (50) and Critical (75) zones.">
                Score History
              </SectionTitle>
              <ScoreHistoryChart market="global" initialDays={30} />
            </div>
            <div>
              <SectionTitle>Recent Alerts</SectionTitle>
              <AlertsList alerts={dashboard.alerts ?? []} />
            </div>
          </div>

          {/* Indicators */}
          {indicators.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <SectionTitle info="Active market indicators contributing to the crash score. Higher normalized values = more risk.">
                Indicators
              </SectionTitle>
              <IndicatorTable indicators={indicators} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
