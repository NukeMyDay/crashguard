import { useEffect, useState, useCallback } from "react";
import { getDashboard, getRegime, getBriefingToday, getScoreHistory, getSignals, getNews, getStrategyPerformance } from "../api.js";
import { CrashScoreGauge } from "../components/CrashScoreGauge.js";
import { MarketGrid } from "../components/MarketGrid.js";
import { AlertsList } from "../components/AlertsList.js";
import { ScoreHistoryChart } from "../components/ScoreHistoryChart.js";
import { IndicatorTable } from "../components/IndicatorTable.js";
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
  useBeginnerMode,
} from "../context.js";

function BriefingSection({ briefing }: { briefing: any }) {
  const { beginnerMode } = useBeginnerMode();
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

      {beginnerMode && (
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
  const { beginnerMode } = useBeginnerMode();
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
      {beginnerMode && (
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

export function Overview() {
  const { beginnerMode } = useBeginnerMode();
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
      <div style={{ marginBottom: 28 }}>
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
                  {beginnerMode && (
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
