import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getDashboard, getRegime, getBriefingToday } from "../api.js";
import { CrashScoreGauge } from "../components/CrashScoreGauge.js";
import { MarketGrid } from "../components/MarketGrid.js";
import { AlertsList } from "../components/AlertsList.js";
import { ScoreHistoryChart } from "../components/ScoreHistoryChart.js";
import { IndicatorTable } from "../components/IndicatorTable.js";
const REGIME_COLORS = {
    BULL: "#22c55e",
    BEAR: "#ef4444",
    SIDEWAYS: "#eab308",
    CRASH: "#b91c1c",
    RECOVERY: "#3b82f6",
};
function RegimeBadge({ regime }) {
    const color = REGIME_COLORS[regime] ?? "#94a3b8";
    return (_jsx("span", { style: {
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color,
            background: `${color}22`,
            border: `1px solid ${color}55`,
            textTransform: "uppercase",
        }, children: regime }));
}
function Card({ children, style }) {
    return (_jsx("div", { style: {
            background: "#0f172a",
            borderRadius: 10,
            border: "1px solid #1e293b",
            padding: 20,
            ...style,
        }, children: children }));
}
function SectionTitle({ children }) {
    return (_jsx("h2", { style: { fontSize: 16, fontWeight: 600, color: "#cbd5e1", marginBottom: 16, marginTop: 0 }, children: children }));
}
export function Overview() {
    const [dashboard, setDashboard] = useState(null);
    const [regime, setRegime] = useState(null);
    const [briefing, setBriefing] = useState(null);
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dashError, setDashError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    async function load() {
        setLoading(true);
        // Dashboard + indicators
        try {
            const [dash, indRes] = await Promise.all([
                getDashboard(),
                fetch("/v1/indicators").then((r) => (r.ok ? r.json() : [])).catch(() => []),
            ]);
            setDashboard(dash);
            setIndicators(indRes);
            setLastUpdated(new Date());
            setDashError(null);
        }
        catch (e) {
            setDashError(String(e));
        }
        finally {
            setLoading(false);
        }
        // Regime - non-blocking
        getRegime()
            .then(setRegime)
            .catch(() => setRegime(null));
        // Briefing - non-blocking
        getBriefingToday()
            .then(setBriefing)
            .catch(() => setBriefing(null));
    }
    useEffect(() => {
        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, []);
    const globalScore = dashboard?.scores?.find((s) => s.market === "global");
    // Build per-market regime map
    const regimeByMarket = {};
    if (regime) {
        if (Array.isArray(regime)) {
            regime.forEach((r) => {
                if (r.market)
                    regimeByMarket[r.market] = r.regime;
            });
        }
        else if (regime.market) {
            regimeByMarket[regime.market] = regime.regime;
        }
        else if (regime.markets) {
            Object.entries(regime.markets).forEach(([k, v]) => {
                regimeByMarket[k] = v;
            });
        }
    }
    const historicalAnalog = regime?.historicalAnalog ?? regime?.similarPeriod ?? null;
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: 0 }, children: "Overview" }), _jsx("p", { style: { color: "#64748b", marginTop: 4, fontSize: 13 }, children: "Real-time crash probability dashboard" })] }), loading && !dashboard && (_jsx("p", { style: { color: "#64748b" }, children: "Loading data..." })), dashError && (_jsx(Card, { style: { borderColor: "#ef444433", marginBottom: 24 }, children: _jsxs("p", { style: { color: "#f87171", margin: 0 }, children: ["Dashboard data unavailable: ", dashError] }) })), dashboard && (_jsxs(_Fragment, { children: [globalScore && (_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Global Crash Score" }), _jsx(CrashScoreGauge, { score: Number(globalScore.crashScore) })] })), Object.keys(regimeByMarket).length > 0 && (_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Market Regimes" }), _jsx(Card, { children: _jsx("div", { style: { display: "flex", gap: 16, flexWrap: "wrap" }, children: Object.entries(regimeByMarket).map(([market, reg]) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { color: "#94a3b8", fontSize: 13, textTransform: "uppercase" }, children: market }), _jsx(RegimeBadge, { regime: reg })] }, market))) }) })] })), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Historical Analog" }), _jsx(Card, { children: historicalAnalog ? (_jsxs("div", { children: [_jsx("div", { style: { color: "#e2e8f0", fontSize: 15, fontWeight: 500 }, children: typeof historicalAnalog === "string"
                                                ? historicalAnalog
                                                : historicalAnalog.label ?? historicalAnalog.period ?? JSON.stringify(historicalAnalog) }), historicalAnalog.similarity != null && (_jsxs("div", { style: { color: "#64748b", fontSize: 12, marginTop: 6 }, children: ["Similarity: ", (Number(historicalAnalog.similarity) * 100).toFixed(0), "%"] }))] })) : (_jsx("p", { style: { color: "#475569", margin: 0, fontSize: 14 }, children: "No historical analog available" })) })] }), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Today's Briefing" }), briefing ? (_jsxs(Card, { children: [briefing.crashScore != null && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("span", { style: { color: "#94a3b8", fontSize: 12 }, children: "CRASH SCORE: " }), _jsx("span", { style: { color: "#e2e8f0", fontWeight: 700, fontSize: 18 }, children: Number(briefing.crashScore).toFixed(1) })] })), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }, children: [_jsxs("div", { children: [_jsx("div", { style: { color: "#22c55e", fontWeight: 600, fontSize: 12, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Top Opportunities" }), (briefing.opportunities ?? briefing.topOpportunities ?? []).slice(0, 3).length > 0 ? (_jsx("ul", { style: { margin: 0, padding: 0, listStyle: "none" }, children: (briefing.opportunities ?? briefing.topOpportunities ?? []).slice(0, 3).map((item, i) => (_jsxs("li", { style: {
                                                                color: "#e2e8f0",
                                                                fontSize: 13,
                                                                padding: "6px 0",
                                                                borderBottom: "1px solid #1e293b",
                                                                display: "flex",
                                                                gap: 8,
                                                                alignItems: "flex-start",
                                                            }, children: [_jsx("span", { style: { color: "#22c55e", marginTop: 1 }, children: "\u25B2" }), _jsx("span", { children: typeof item === "string" ? item : item.text ?? item.description ?? JSON.stringify(item) })] }, i))) })) : (_jsx("p", { style: { color: "#475569", fontSize: 13, margin: 0 }, children: "No opportunities listed" }))] }), _jsxs("div", { children: [_jsx("div", { style: { color: "#ef4444", fontWeight: 600, fontSize: 12, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Top Risks" }), (briefing.risks ?? briefing.topRisks ?? []).slice(0, 3).length > 0 ? (_jsx("ul", { style: { margin: 0, padding: 0, listStyle: "none" }, children: (briefing.risks ?? briefing.topRisks ?? []).slice(0, 3).map((item, i) => (_jsxs("li", { style: {
                                                                color: "#e2e8f0",
                                                                fontSize: 13,
                                                                padding: "6px 0",
                                                                borderBottom: "1px solid #1e293b",
                                                                display: "flex",
                                                                gap: 8,
                                                                alignItems: "flex-start",
                                                            }, children: [_jsx("span", { style: { color: "#ef4444", marginTop: 1 }, children: "\u25BC" }), _jsx("span", { children: typeof item === "string" ? item : item.text ?? item.description ?? JSON.stringify(item) })] }, i))) })) : (_jsx("p", { style: { color: "#475569", fontSize: 13, margin: 0 }, children: "No risks listed" }))] })] })] })) : (_jsx(Card, { children: _jsx("p", { style: { color: "#475569", margin: 0, fontSize: 14 }, children: "Briefing data unavailable" }) }))] }), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Markets" }), _jsx(MarketGrid, { scores: dashboard.scores })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 28 }, children: [_jsxs("div", { children: [_jsx(SectionTitle, { children: "Score History" }), _jsx(ScoreHistoryChart, {})] }), _jsxs("div", { children: [_jsx(SectionTitle, { children: "Recent Alerts" }), _jsx(AlertsList, { alerts: dashboard.alerts ?? [] })] })] }), indicators.length > 0 && (_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx(SectionTitle, { children: "Indicators" }), _jsx(IndicatorTable, { indicators: indicators })] })), _jsxs("p", { style: { color: "#334155", fontSize: 12 }, children: ["Last updated: ", lastUpdated?.toLocaleString() ?? "—"] })] }))] }));
}
