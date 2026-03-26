import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { getDashboard, getRegime, getBriefingToday, getSignals, getNews, getStrategyPerformance, fetchJSON } from "../api.js";
import { CrashScoreGauge } from "../components/CrashScoreGauge.js";
import { MarketGrid } from "../components/MarketGrid.js";
import { AlertsList } from "../components/AlertsList.js";
import { ScoreHistoryChart } from "../components/ScoreHistoryChart.js";
import { IndicatorTable } from "../components/IndicatorTable.js";
import { AttributionPanel } from "../components/AttributionPanel.js";
import { CorrelationHeatmap } from "../components/CorrelationHeatmap.js";
import { SectorHeatmap } from "../components/SectorHeatmap.js";
import { C, Card, SectionTitle, ErrorBanner, SkeletonBlock, useExpertise, getScoreColor, getScoreLabel, } from "../context.js";

// ---------------------------------------------------------------------------
// Market Regime Badge
// ---------------------------------------------------------------------------
const REGIME_CONFIG = {
  BULL: { color: "#22c55e", label: "BULL", icon: "🟢" },
  BEAR: { color: "#ef4444", label: "BEAR", icon: "🔴" },
  SIDEWAYS: { color: "#64748b", label: "SIDEWAYS", icon: "⬛" },
  CRASH: { color: "#7f1d1d", label: "CRASH", icon: "🚨", pulse: true },
  RECOVERY: { color: "#3b82f6", label: "RECOVERY", icon: "🔵" },
};

const REGIME_DESCRIPTIONS = {
  BULL: "Markets are trending upward. Momentum and growth strategies perform best.",
  BEAR: "Markets are declining. Only defensive strategies are active.",
  SIDEWAYS: "Markets are range-bound. Mean reversion strategies are preferred.",
  CRASH: "Extreme market stress. Risk management is paramount.",
  RECOVERY: "Markets are bouncing back from a downturn. Early-cycle opportunities emerging.",
};

function RegimeBadge({ regime, activeStrategies }) {
  const { isBeginner } = useExpertise();
  const [showTooltip, setShowTooltip] = useState(false);

  if (!regime) return null;

  const key = String(regime).toUpperCase();
  const config = REGIME_CONFIG[key] ?? { color: C.textMuted, label: key, icon: "📊" };
  const description = REGIME_DESCRIPTIONS[key] ?? "Current market regime";

  const strategies = Array.isArray(activeStrategies)
    ? activeStrategies.map((s) => (typeof s === "string" ? s : s.name ?? s.id ?? String(s))).join(", ")
    : typeof activeStrategies === "string"
    ? activeStrategies
    : null;

  return _jsxs("div", {
    style: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" },
    children: [
      // Pill badge with tooltip
      _jsxs("div", {
        style: { position: "relative" },
        onMouseEnter: () => setShowTooltip(true),
        onMouseLeave: () => setShowTooltip(false),
        children: [
          _jsxs("div", {
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 14px",
              borderRadius: 20,
              background: `${config.color}22`,
              border: `1px solid ${config.color}55`,
              cursor: "default",
              ...(config.pulse ? { animation: "pulse 1.5s infinite" } : {}),
            },
            children: [
              _jsx("div", {
                style: {
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: config.color,
                  flexShrink: 0,
                  ...(config.pulse ? { boxShadow: `0 0 8px ${config.color}`, animation: "pulse 1.5s infinite" } : {}),
                },
              }),
              _jsx("span", { style: { color: config.color, fontWeight: 800, fontSize: 12, letterSpacing: "0.06em" }, children: config.label }),
              _jsx("span", { style: { color: C.textMuted, fontSize: 10 }, children: "regime" }),
            ],
          }),
          showTooltip && _jsx("div", {
            style: {
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              zIndex: 100,
              background: "#0d1424",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              width: 280,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            },
            children: _jsx("p", { style: { color: C.textSecondary, fontSize: 12, margin: 0, lineHeight: 1.6 }, children: "Current regime affects which strategies are active. " + description }),
          }),
        ],
      }),
      // Active strategies
      strategies && _jsxs("div", { style: { fontSize: 11, color: C.textMuted }, children: [
        _jsx("span", { style: { color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10 }, children: "Active strategies: " }),
        _jsx("span", { style: { color: C.textSecondary }, children: strategies }),
      ] }),
      // Beginner description
      isBeginner && _jsx("div", {
        style: { padding: "8px 12px", background: `${C.blue}0d`, border: `1px solid ${C.blue}22`, borderRadius: 8, fontSize: 11, color: C.textSecondary, maxWidth: 260 },
        children: description,
      }),
    ],
  });
}
function SocialSentimentWidget() {
    const [tickers, setTickers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState(false);
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const data = await fetchJSON("/social/wsb");
                if (!cancelled) {
                    const items = Array.isArray(data)
                        ? data
                        : Array.isArray(data?.tickers)
                            ? data.tickers
                            : [];
                    setTickers(items.slice(0, 5));
                    setUnavailable(items.length === 0);
                }
            }
            catch {
                if (!cancelled)
                    setUnavailable(true);
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        }
        load();
        const interval = setInterval(load, 30 * 60000); // refresh every 30 min
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);
    const sentimentColor = (s) => s === "bullish" ? C.green : s === "bearish" ? C.red : C.amber;
    return (_jsxs(Card, { style: { padding: "16px 18px" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: [_jsx("span", { style: { color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }, children: "\uD83D\uDC38 Retail Sentiment (r/WallStreetBets)" }), _jsx("span", { style: { color: C.textMuted, fontSize: 10 }, children: "30m refresh" })] }), loading && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [1, 2, 3].map((i) => (_jsx("div", { style: { height: 28, background: "#1e293b", borderRadius: 6, opacity: 0.5 } }, i))) })), !loading && unavailable && (_jsx("div", { style: { color: C.textMuted, fontSize: 12, padding: "8px 0" }, children: "WSB sentiment feed unavailable" })), !loading && !unavailable && tickers.length > 0 && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: tickers.map((t, i) => {
                    const sColor = sentimentColor(t.sentiment);
                    return (_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 0",
                            borderBottom: i < tickers.length - 1 ? `1px solid ${C.border}` : "none",
                        }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 11, width: 16, textAlign: "right", flexShrink: 0 }, children: i + 1 }), _jsx("span", { style: { color: C.textPrimary, fontWeight: 700, fontFamily: "monospace", fontSize: 13, flex: 1 }, children: t.ticker }), t.mentions != null && (_jsxs("span", { style: { color: C.textMuted, fontSize: 11 }, children: [t.mentions, " mentions"] })), _jsx("span", { style: {
                                    color: sColor,
                                    background: `${sColor}18`,
                                    border: `1px solid ${sColor}44`,
                                    padding: "1px 8px",
                                    borderRadius: 3,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: "capitalize",
                                    flexShrink: 0,
                                }, children: t.sentiment })] }, t.ticker));
                }) }))] }));
}
function BriefingSection({ briefing }) {
    const { isBeginner, isProfessional } = useExpertise();
    const opportunities = briefing?.opportunities ?? briefing?.topOpportunities ?? [];
    const risks = briefing?.risks ?? briefing?.topRisks ?? [];
    return (_jsxs(Card, { children: [briefing.headline && (_jsx("div", { style: {
                    fontSize: 17,
                    fontWeight: 600,
                    color: C.textPrimary,
                    marginBottom: 12,
                    lineHeight: 1.4,
                }, children: briefing.headline })), briefing.summary && (_jsx("p", { style: { color: C.textSecondary, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }, children: briefing.summary })), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                    color: C.green,
                                    fontWeight: 600,
                                    fontSize: 11,
                                    marginBottom: 10,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                }, children: "Top Opportunities" }), opportunities.slice(0, 3).length > 0 ? (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: opportunities.slice(0, 3).map((item, i) => {
                                    const text = typeof item === "string" ? item : item.text ?? item.description ?? item.instrument ?? JSON.stringify(item);
                                    const reason = typeof item === "object" ? item.reason ?? item.rationale : null;
                                    return (_jsxs("div", { style: {
                                            background: `${C.green}11`,
                                            border: `1px solid ${C.green}33`,
                                            borderRadius: 8,
                                            padding: "10px 12px",
                                        }, children: [_jsx("div", { style: { color: C.textPrimary, fontSize: 13, fontWeight: 500 }, children: text }), reason && _jsx("div", { style: { color: C.textMuted, fontSize: 12, marginTop: 3 }, children: reason })] }, i));
                                }) })) : (_jsx("p", { style: { color: C.textMuted, fontSize: 13 }, children: "No opportunities identified today" }))] }), _jsxs("div", { children: [_jsx("div", { style: {
                                    color: C.red,
                                    fontWeight: 600,
                                    fontSize: 11,
                                    marginBottom: 10,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                }, children: "Top Risks" }), risks.slice(0, 3).length > 0 ? (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: risks.slice(0, 3).map((item, i) => {
                                    const text = typeof item === "string" ? item : item.text ?? item.description ?? JSON.stringify(item);
                                    return (_jsx("div", { style: {
                                            background: `${C.red}0d`,
                                            border: `1px solid ${C.red}33`,
                                            borderRadius: 8,
                                            padding: "10px 12px",
                                        }, children: _jsx("div", { style: { color: C.textSecondary, fontSize: 13 }, children: text }) }, i));
                                }) })) : (_jsx("p", { style: { color: C.textMuted, fontSize: 13 }, children: "No major risks flagged today" }))] })] }), isBeginner && (_jsxs("div", { style: {
                    marginTop: 16,
                    padding: "10px 14px",
                    background: `${C.blue}11`,
                    border: `1px solid ${C.blue}33`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: C.textSecondary,
                }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "Beginner tip:" }), " The daily briefing summarizes the most important market signals. Opportunities are potential trades to consider; risks are conditions that could cause losses."] }))] }));
}
function HistoricalAnalogSection({ analog }) {
    const { isBeginner, isProfessional } = useExpertise();
    if (!analog)
        return null;
    const label = typeof analog === "string"
        ? analog
        : analog.label ?? analog.period ?? analog.name ?? JSON.stringify(analog);
    const similarity = analog?.similarity ?? analog?.similarityScore;
    const description = analog?.description ?? analog?.context;
    return (_jsxs(Card, { children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 16 }, children: [_jsx("div", { style: { fontSize: 28 }, children: "\uD83D\uDD2D" }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { color: C.textPrimary, fontSize: 15, fontWeight: 600, marginBottom: 4 }, children: ["Similar to: ", label] }), similarity != null && (_jsxs("div", { style: { color: C.textMuted, fontSize: 12, marginBottom: 8 }, children: [(Number(similarity) > 1 ? Number(similarity) : Number(similarity) * 100).toFixed(0), "% similarity"] })), description && (_jsx("div", { style: { color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }, children: description })), !description && (_jsx("div", { style: { color: C.textMuted, fontSize: 13, lineHeight: 1.5 }, children: "Current indicator patterns closely resemble this historical period." }))] })] }), isBeginner && (_jsxs("div", { style: {
                    marginTop: 14,
                    padding: "10px 14px",
                    background: `${C.blue}11`,
                    border: `1px solid ${C.blue}33`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: C.textSecondary,
                }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "Beginner tip:" }), " Historical analogs compare current indicator patterns to past market phases using cosine similarity across 12 dimensions. This helps predict what may happen next."] }))] }));
}
// ---------------------------------------------------------------------------
// Beginner: Plain-English Market Summary card
// ---------------------------------------------------------------------------
function BeginnerSummaryCard({ score }) {
    let headline;
    let detail;
    let tone;
    if (score < 25) {
        headline = "Markets are calm";
        detail = `Current crash score of ${Math.round(score)} indicates low risk. Volatility is contained and conditions look stable. Good time for steady, long-term investments.`;
        tone = "positive";
    }
    else if (score < 50) {
        headline = "Markets are cautious";
        detail = `Current crash score of ${Math.round(score)} suggests moderate risk. Some warning signs are present. Consider reviewing your portfolio for balance.`;
        tone = "neutral";
    }
    else if (score < 75) {
        headline = "Markets are elevated risk";
        detail = `Current crash score of ${Math.round(score)} is elevated. Multiple indicators are showing stress. Reducing exposure to risky assets may be prudent.`;
        tone = "negative";
    }
    else {
        headline = "Markets are in danger zone";
        detail = `Current crash score of ${Math.round(score)} is in the critical range. Historically, scores above 75 have preceded major corrections. Exercise caution.`;
        tone = "negative";
    }
    const bgColor = tone === "positive" ? `${C.green}0d` : tone === "negative" ? `${C.red}0d` : `${C.amber}0d`;
    const borderColor = tone === "positive" ? `${C.green}33` : tone === "negative" ? `${C.red}33` : `${C.amber}33`;
    const headlineColor = tone === "positive" ? C.green : tone === "negative" ? C.red : C.amber;
    return (_jsx(Card, { style: { marginBottom: 24, background: bgColor, borderColor }, children: _jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 14 }, children: [_jsx("span", { style: { fontSize: 24 }, children: tone === "positive" ? "✅" : tone === "negative" ? "⚠️" : "📊" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 16, fontWeight: 700, color: headlineColor, marginBottom: 6 }, children: headline }), _jsx("div", { style: { fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }, children: detail }), _jsx("div", { style: { marginTop: 8, fontSize: 11, color: C.textMuted }, children: "Market Summary in Plain English \u00B7 Switch to Intermediate or Professional for detailed data" })] })] }) }));
}
// ---------------------------------------------------------------------------
// Professional: Dense mini-dashboard grid
// ---------------------------------------------------------------------------
function ProDenseGrid({ scores, indicators }) {
    const topIndicators = [...indicators]
        .filter((i) => i.latestValue)
        .sort((a, b) => {
        const av = Number(a.latestValue?.normalizedValue ?? 0) * Number(a.weight ?? 0);
        const bv = Number(b.latestValue?.normalizedValue ?? 0) * Number(b.weight ?? 0);
        return bv - av;
    })
        .slice(0, 5);
    return (_jsxs("div", { style: {
            background: "#080c13",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 20,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
        }, children: [scores.map((s) => {
                const sc = Number(s.crashScore);
                const col = getScoreColor(sc);
                return (_jsxs("div", { style: { textAlign: "center", minWidth: 52 }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em" }, children: s.market }), _jsx("div", { style: { color: col, fontSize: 18, fontWeight: 800, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }, children: sc.toFixed(1) }), _jsx("div", { style: { color: C.textMuted, fontSize: 9 }, children: getScoreLabel(sc) })] }, s.market));
            }), _jsx("div", { style: { width: 1, height: 40, background: C.border, flexShrink: 0 } }), topIndicators.map((ind) => {
                const norm = Number(ind.latestValue?.normalizedValue ?? 0);
                const raw = Number(ind.latestValue?.value ?? 0);
                const col = getScoreColor(norm);
                return (_jsxs("div", { style: { minWidth: 72 }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }, children: ind.name.slice(0, 12) }), _jsx("div", { style: { color: C.textPrimary, fontSize: 12, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }, children: raw.toFixed(2) }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4, marginTop: 2 }, children: [_jsx("div", { style: { flex: 1, height: 3, background: "#1e293b", borderRadius: 2 }, children: _jsx("div", { style: { width: `${Math.min(100, norm)}%`, height: "100%", background: col, borderRadius: 2 } }) }), _jsx("span", { style: { color: col, fontSize: 9, fontFamily: "monospace" }, children: norm.toFixed(0) })] })] }, ind.slug));
            })] }));
}
export function Overview() {
    const { isBeginner, isProfessional } = useExpertise();
    const [dashboard, setDashboard] = useState(null);
    const [regime, setRegime] = useState(null);
    const [briefing, setBriefing] = useState(null);
    const [indicators, setIndicators] = useState([]);
    const [latestSignals, setLatestSignals] = useState([]);
    const [latestNews, setLatestNews] = useState([]);
    const [topStrategy, setTopStrategy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dashError, setDashError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
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
        }
        catch (e) {
            setDashError(String(e));
        }
        finally {
            setLoading(false);
        }
        getRegime().then(setRegime).catch(() => setRegime(null));
        getBriefingToday().then(setBriefing).catch(() => setBriefing(null));
        // Fetch mini-panel data
        getSignals()
            .then((sigs) => {
            const active = sigs.filter((s) => !["expired", "closed", "cancelled"].includes((s.status ?? "").toLowerCase()));
            setLatestSignals(active.slice(0, 3));
        })
            .catch(() => { });
        getNews(5)
            .then((news) => setLatestNews(Array.isArray(news) ? news.slice(0, 3) : []))
            .catch(() => { });
        getStrategyPerformance()
            .then((perfs) => {
            if (Array.isArray(perfs) && perfs.length > 0) {
                const sorted = [...perfs].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));
                setTopStrategy(sorted[0]);
            }
        })
            .catch(() => { });
    }, []);
    useEffect(() => {
        load();
        const interval = setInterval(load, 60000);
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
    const globalScore = dashboard?.scores?.find((s) => s.market === "global");
    // Build per-market regime map
    const regimeByMarket = {};
    if (regime) {
        if (Array.isArray(regime)) {
            regime.forEach((r) => { if (r.market)
                regimeByMarket[r.market] = r.regime; });
        }
        else if (regime.market) {
            regimeByMarket[regime.market] = regime.regime;
        }
        else if (regime.markets) {
            Object.entries(regime.markets).forEach(([k, v]) => { regimeByMarket[k] = v; });
        }
    }
    const historicalAnalog = regime?.historicalAnalog ?? regime?.similarPeriod ?? null;
    return (_jsxs("div", { style: { padding: 28, maxWidth: 1400 }, children: [_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }, children: "Overview" }), _jsxs("p", { style: { color: C.textMuted, marginTop: 5, fontSize: 13 }, children: ["Real-time crash probability dashboard", lastUpdated && (_jsxs("span", { style: { marginLeft: 12, color: "#2a3a50" }, children: ["Last updated ", secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`] }))] })] }), dashError && _jsx(ErrorBanner, { message: `Dashboard data unavailable: ${dashError}`, onRetry: load }), loading && !dashboard && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 20 }, children: [_jsx(SkeletonBlock, { height: 200 }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }, children: [_jsx(SkeletonBlock, { height: 140 }), _jsx(SkeletonBlock, { height: 140 }), _jsx(SkeletonBlock, { height: 140 })] }), _jsx(SkeletonBlock, { height: 320 })] })), dashboard && (_jsxs(_Fragment, { children: [isBeginner && globalScore && (_jsx(BeginnerSummaryCard, { score: Number(globalScore.crashScore) })), isProfessional && (_jsx(ProDenseGrid, { scores: dashboard.scores ?? [], indicators: indicators })), globalScore && (_jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { info: "The Crash Probability Score aggregates 12 market indicators weighted by historical predictive power.", children: "Global Crash Score" }), _jsxs(Card, { style: { display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap" }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }, children: [_jsx(CrashScoreGauge, { score: Number(globalScore.crashScore), size: 280 }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5, marginTop: -8 }, children: [_jsx("div", { style: {
                                                            width: 6, height: 6, borderRadius: "50%",
                                                            background: C.green,
                                                            boxShadow: `0 0 8px ${C.green}`,
                                                            animation: "pulse 2s infinite",
                                                        } }), _jsx("span", { style: { color: C.textMuted, fontSize: 11 }, children: "Live \u00B7 updates every 60s" })] }), (dashboard.currentRegime || regimeByMarket.global) && _jsx(RegimeBadge, { regime: dashboard.currentRegime ?? regimeByMarket.global, activeStrategies: dashboard.activeStrategies })] }), _jsxs("div", { style: { flex: 1, minWidth: 220 }, children: [globalScore.componentScores && (_jsxs("div", { children: [_jsx("div", { style: {
                                                            color: C.textMuted,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            textTransform: "uppercase",
                                                            letterSpacing: "0.06em",
                                                            marginBottom: 16,
                                                        }, children: "Component Breakdown" }), Object.entries(globalScore.componentScores).map(([k, v]) => v != null ? (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { color: C.textSecondary, fontSize: 12, textTransform: "capitalize" }, children: k }), _jsx("span", { style: {
                                                                            color: Number(v) >= 75 ? C.red : Number(v) >= 50 ? C.amber : C.green,
                                                                            fontSize: 12,
                                                                            fontWeight: 700,
                                                                            fontFamily: "monospace",
                                                                        }, children: Number(v).toFixed(0) })] }), _jsx("div", { style: { height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }, children: _jsx("div", { style: {
                                                                        width: `${Math.min(100, Number(v))}%`,
                                                                        height: "100%",
                                                                        background: Number(v) >= 75 ? C.red : Number(v) >= 50 ? C.amber : C.green,
                                                                        borderRadius: 3,
                                                                    } }) })] }, k)) : null)] })), isBeginner && (_jsx("div", { style: {
                                                    marginTop: 16,
                                                    padding: "10px 14px",
                                                    background: `${C.blue}11`,
                                                    border: `1px solid ${C.blue}33`,
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                    color: C.textSecondary,
                                                }, children: "\uD83D\uDCDA The crash score combines volatility, sentiment, macro indicators, and credit conditions. Higher = more danger." }))] })] })] })), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { info: "Per-market crash probability scores. Click a card to see component breakdown.", children: "Markets" }), _jsx(MarketGrid, { scores: dashboard.scores, regimeByMarket: regimeByMarket })] }), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { info: "Which sectors are leading or lagging. Green = outperforming, red = underperforming. Click a tile to open Yahoo Finance.", children: "Sector Rotation" }), _jsx(SectorHeatmap, {})] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }, children: [_jsxs(Card, { style: { padding: "16px 18px" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: [_jsx("span", { style: { color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }, children: "\uD83D\uDCC8 Latest Signals" }), _jsxs("span", { style: { color: C.textMuted, fontSize: 11 }, children: [latestSignals.length, " active"] })] }), latestSignals.length === 0 ? (_jsx("div", { style: { color: C.textMuted, fontSize: 12 }, children: "No active signals" })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: latestSignals.map((sig) => {
                                            const isLong = ["BUY", "LONG"].includes((sig.action ?? "").toUpperCase());
                                            const dirColor = isLong ? C.green : C.red;
                                            const confidence = sig.confidence ?? sig.strength ?? 0;
                                            return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}` }, children: [_jsx("span", { style: {
                                                            color: dirColor, background: `${dirColor}18`, border: `1px solid ${dirColor}44`,
                                                            padding: "1px 7px", borderRadius: 3, fontSize: 10, fontWeight: 800, flexShrink: 0,
                                                        }, children: isLong ? "LONG" : "SHORT" }), _jsx("span", { style: { color: C.textPrimary, fontWeight: 700, fontFamily: "monospace", fontSize: 13, flex: 1 }, children: sig.instrument ?? "—" }), _jsxs("span", { style: { color: confidence >= 75 ? C.green : confidence >= 50 ? C.amber : C.red, fontSize: 11, fontFamily: "monospace", fontWeight: 600 }, children: [confidence.toFixed(0), "%"] })] }, sig.id));
                                        }) }))] }), _jsxs(Card, { style: { padding: "16px 18px" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: [_jsx("span", { style: { color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }, children: "\uD83D\uDCF0 Breaking News" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("div", { style: { width: 5, height: 5, borderRadius: "50%", background: C.green, boxShadow: `0 0 4px ${C.green}` } }), _jsx("span", { style: { color: C.textMuted, fontSize: 11 }, children: "Live" })] })] }), latestNews.length === 0 ? (_jsx("div", { style: { color: C.textMuted, fontSize: 12 }, children: "No news loaded" })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: latestNews.map((item) => {
                                            const sentiment = item.sentiment?.toLowerCase();
                                            const sentColor = sentiment === "bullish" ? C.green : sentiment === "bearish" ? C.red : C.amber;
                                            return (_jsxs("div", { style: { borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }, children: [_jsx("p", { style: { color: C.textSecondary, fontSize: 12, margin: "0 0 4px", lineHeight: 1.5 }, children: item.headline }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [item.source && _jsx("span", { style: { color: C.textMuted, fontSize: 10 }, children: item.source }), sentiment && (_jsxs("span", { style: { color: sentColor, fontSize: 10, fontWeight: 700, textTransform: "capitalize" }, children: ["\u00B7 ", sentiment] }))] })] }, item.id));
                                        }) }))] }), _jsxs(Card, { style: { padding: "16px 18px" }, children: [_jsx("div", { style: { marginBottom: 14 }, children: _jsx("span", { style: { color: C.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }, children: "\uD83C\uDFC6 Top Strategy" }) }), !topStrategy ? (_jsx("div", { style: { color: C.textMuted, fontSize: 12 }, children: "No performance data" })) : (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [_jsx("div", { style: { color: C.textPrimary, fontWeight: 700, fontSize: 15 }, children: topStrategy.name }), _jsxs("div", { style: { display: "flex", gap: 16, flexWrap: "wrap" }, children: [topStrategy.winRate != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, marginBottom: 3 }, children: "WIN RATE" }), _jsxs("div", { style: { color: topStrategy.winRate >= 50 ? C.green : C.red, fontFamily: "monospace", fontSize: 18, fontWeight: 700 }, children: [topStrategy.winRate.toFixed(1), "%"] })] })), topStrategy.totalPnl != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, marginBottom: 3 }, children: "TOTAL P&L" }), _jsxs("div", { style: { color: topStrategy.totalPnl >= 0 ? C.green : C.red, fontFamily: "monospace", fontSize: 18, fontWeight: 700 }, children: [topStrategy.totalPnl >= 0 ? "+" : "", topStrategy.totalPnl.toFixed(2), "%"] })] }))] }), _jsx("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 2 }, children: "Best performer by win rate this period" })] }))] })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }, children: [_jsxs("div", { children: [_jsx(SectionTitle, { info: "Which indicators are contributing most to today's crash score.", children: "Performance Attribution" }), _jsx(AttributionPanel, {})] }), _jsxs("div", { children: [_jsx(SectionTitle, { info: "Top tickers mentioned on r/WallStreetBets today with retail sentiment.", children: "Social Sentiment" }), _jsx(SocialSentimentWidget, {})] })] }), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { info: "Pearson correlation between key indicators over the last 30 days. Hover a cell to see the relationship explained.", children: "Indicator Correlations" }), _jsx(CorrelationHeatmap, {})] }), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { children: "Today's Briefing" }), briefing ? (_jsx(BriefingSection, { briefing: briefing })) : (_jsx(Card, { children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, color: C.textMuted }, children: [_jsx("span", { style: { fontSize: 18 }, children: "\uD83D\uDD56" }), _jsx("span", { style: { fontSize: 13 }, children: "Briefing generates daily at 07:00 UTC" })] }) }))] }), historicalAnalog && (_jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { info: "Historical analogs compare current indicator patterns to past market phases using cosine similarity across 12 dimensions.", children: "Historical Analog" }), _jsx(HistoricalAnalogSection, { analog: historicalAnalog })] })), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }, children: [_jsxs("div", { children: [_jsx(SectionTitle, { info: "Historical crash probability score over time. Threshold lines mark High (50) and Critical (75) zones.", children: "Score History" }), _jsx(ScoreHistoryChart, { market: "global", initialDays: 30 })] }), _jsxs("div", { children: [_jsx(SectionTitle, { children: "Recent Alerts" }), _jsx(AlertsList, { alerts: dashboard.alerts ?? [] })] })] }), indicators.length > 0 && (_jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { info: "Active market indicators contributing to the crash score. Higher normalized values = more risk.", children: "Indicators" }), _jsx(IndicatorTable, { indicators: indicators })] }))] }))] }));
}
