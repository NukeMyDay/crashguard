import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, } from "recharts";
import { getScoreHistory, getRegimeHistory, getSignals, getMacroEvents } from "../api.js";
import { C, Card, SectionTitle, EmptyState, ErrorBanner, SkeletonBlock, Badge, REGIME_COLORS, getScoreColor, useBeginnerMode, TH, TD, } from "../context.js";
const MARKET_OPTIONS = [
    { label: "Global", value: "global", flag: "🌐" },
    { label: "US", value: "us", flag: "🇺🇸" },
    { label: "EU", value: "eu", flag: "🇪🇺" },
    { label: "Asia", value: "asia", flag: "🇯🇵" },
];
const DAYS_OPTIONS = [7, 30, 90, 180];
const MARKET_COLORS = {
    global: "#6366f1",
    us: "#3b82f6",
    eu: "#8b5cf6",
    asia: "#06b6d4",
};
// Annotated crash events for context
const CRASH_EVENTS = [
    { date: "2020-03-16", label: "COVID Crash", score: 96 },
    { date: "2022-06-16", label: "Rate Shock", score: 81 },
    { date: "2023-03-10", label: "SVB Crisis", score: 74 },
];
const OUTCOME_COLORS = {
    WIN: C.green,
    LOSS: C.red,
    OPEN: C.amber,
};
const EVENT_TYPE_COLORS = {
    FOMC: "#3b82f6",
    CPI: "#f59e0b",
    JOBS: "#10b981",
};
const IMPACT_COLORS = {
    HIGH: C.red,
    MEDIUM: C.amber,
    LOW: C.green,
};
function eventColor(type) {
    return EVENT_TYPE_COLORS[type?.toUpperCase()] ?? "#94a3b8";
}
function ButtonGroup({ options, active, onSelect, labelFn, }) {
    return (_jsx("div", { style: {
            display: "flex",
            gap: 3,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 3,
        }, children: options.map((opt) => {
            const isAct = opt === active;
            return (_jsx("button", { onClick: () => onSelect(opt), style: {
                    padding: "6px 14px",
                    borderRadius: 7,
                    border: isAct ? `1px solid ${C.blue}44` : "1px solid transparent",
                    background: isAct ? `${C.blue}1a` : "transparent",
                    color: isAct ? C.blue : "#64748b",
                    fontWeight: isAct ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.12s",
                }, children: labelFn ? labelFn(opt) : String(opt) }, String(opt)));
        }) }));
}
function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length)
        return null;
    const score = payload[0]?.value;
    const date = payload[0]?.payload?.fullDate;
    return (_jsxs("div", { style: {
            background: "#1a2332",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }, children: [_jsx("div", { style: { color: C.textSecondary, marginBottom: 4 }, children: date }), _jsxs("div", { style: { color: getScoreColor(score), fontWeight: 700, fontSize: 16 }, children: ["Score: ", score?.toFixed(1)] })] }));
}
// ---------------------------------------------------------------------------
// Multi-Market Comparison Chart
// ---------------------------------------------------------------------------
const MULTI_MARKET_COLORS = {
    global: "#f1f5f9",
    us: "#3b82f6",
    eu: "#f59e0b",
    asia: "#10b981",
};
function MultiMarketTooltip({ active, payload, label }) {
    if (!active || !payload?.length)
        return null;
    return (_jsxs("div", { style: {
            background: "#1a2332",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }, children: [_jsx("div", { style: { color: C.textSecondary, marginBottom: 6 }, children: label }), payload.map((p) => (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 16 }, children: [_jsx("span", { style: { color: p.color, textTransform: "capitalize" }, children: p.dataKey }), _jsx("span", { style: { color: p.color, fontWeight: 700, fontFamily: "monospace" }, children: p.value?.toFixed(1) ?? "—" })] }, p.dataKey)))] }));
}
function MultiMarketChart({ days }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [highlighted, setHighlighted] = useState(null);
    useEffect(() => {
        setLoading(true);
        const markets = ["global", "us", "eu", "asia"];
        Promise.all(markets.map((m) => getScoreHistory(m, days).catch(() => [])))
            .then(([global, us, eu, asia]) => {
            // Merge by date label
            const map = {};
            function insert(arr, key) {
                for (const s of arr) {
                    const d = new Date(s.calculatedAt);
                    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    if (!map[label])
                        map[label] = { time: label };
                    map[label][key] = Number(s.crashScore);
                }
            }
            insert(global, "global");
            insert(us, "us");
            insert(eu, "eu");
            insert(asia, "asia");
            const merged = Object.values(map).sort((a, b) => {
                // Sort by parsing the label back — approximate
                return a.time.localeCompare(b.time);
            });
            setData(merged);
        })
            .finally(() => setLoading(false));
    }, [days]);
    if (loading)
        return _jsx("div", { style: { height: 300, background: "#1e293b", borderRadius: 8, opacity: 0.4 } });
    if (data.length === 0)
        return (_jsx(EmptyState, { icon: "\uD83D\uDCC9", title: "No comparison data", subtitle: "Historical score data not yet available for all markets." }));
    const markets = ["global", "us", "eu", "asia"];
    return (_jsxs(Card, { style: { padding: "16px 18px" }, children: [_jsx("div", { style: { display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }, children: markets.map((m) => {
                    const last = data[data.length - 1]?.[m];
                    const color = MULTI_MARKET_COLORS[m];
                    const isHigh = highlighted === m;
                    return (_jsxs("button", { onClick: () => setHighlighted(isHigh ? null : m), style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: isHigh ? `${color}18` : "transparent",
                            border: `1px solid ${isHigh ? color + "44" : C.border}`,
                            borderRadius: 8,
                            padding: "5px 12px",
                            cursor: "pointer",
                            transition: "all 0.12s",
                        }, children: [_jsx("div", { style: { width: 12, height: 3, background: color, borderRadius: 2 } }), _jsx("span", { style: { color: color, fontSize: 12, fontWeight: 600, textTransform: "capitalize" }, children: m }), last != null && (_jsx("span", { style: { color: getScoreColor(last), fontSize: 13, fontWeight: 700, fontFamily: "monospace" }, children: last.toFixed(1) }))] }, m));
                }) }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: data, margin: { top: 10, right: 10, bottom: 0, left: -10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1a2436", vertical: false }), _jsx(XAxis, { dataKey: "time", stroke: "#2a3a50", tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, interval: "preserveStartEnd" }), _jsx(YAxis, { domain: [0, 100], stroke: "#2a3a50", tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, width: 28 }), _jsx(Tooltip, { content: _jsx(MultiMarketTooltip, {}) }), _jsx(ReferenceLine, { y: 75, stroke: "#ef444855", strokeDasharray: "5 3" }), _jsx(ReferenceLine, { y: 50, stroke: "#f59e0b55", strokeDasharray: "5 3" }), markets.map((m) => {
                            const color = MULTI_MARKET_COLORS[m];
                            const dim = highlighted != null && highlighted !== m;
                            return (_jsx(Line, { type: "monotone", dataKey: m, stroke: color, strokeWidth: highlighted === m ? 3 : dim ? 1 : 2, dot: false, opacity: dim ? 0.25 : 1, activeDot: { r: 4, fill: color, strokeWidth: 0 } }, m));
                        })] }) })] }));
}
export function History() {
    const { beginnerMode } = useBeginnerMode();
    const [activeTab, setActiveTab] = useState("single");
    const [market, setMarket] = useState("global");
    const [days, setDays] = useState(30);
    const [scoreHistory, setScoreHistory] = useState([]);
    const [regimeHistory, setRegimeHistory] = useState([]);
    const [closedSignals, setClosedSignals] = useState([]);
    const [macroEvents, setMacroEvents] = useState([]);
    const [eventTypeFilter, setEventTypeFilter] = useState(new Set(["FOMC", "CPI", "JOBS"]));
    const [searchQuery, setSearchQuery] = useState("");
    const [scoreLoading, setScoreLoading] = useState(true);
    const [regimeLoading, setRegimeLoading] = useState(false);
    const [scoreError, setScoreError] = useState(null);
    const [regimeError, setRegimeError] = useState(null);
    async function loadScores(m, d) {
        setScoreLoading(true);
        try {
            const data = await getScoreHistory(m, d);
            setScoreHistory(Array.isArray(data) ? data : []);
            setScoreError(null);
        }
        catch (e) {
            setScoreError(String(e));
        }
        finally {
            setScoreLoading(false);
        }
    }
    async function loadRegimeAndSignals() {
        setRegimeLoading(true);
        try {
            const [regData, sigData] = await Promise.all([
                getRegimeHistory().catch(() => []),
                getSignals(true).catch(() => []),
            ]);
            setRegimeHistory(Array.isArray(regData) ? regData : []);
            setRegimeError(null);
            const closed = Array.isArray(sigData)
                ? sigData.filter((s) => s.status?.toLowerCase() !== "open" && s.status?.toLowerCase() !== "active")
                : [];
            setClosedSignals(closed);
        }
        catch (e) {
            setRegimeError(String(e));
        }
        finally {
            setRegimeLoading(false);
        }
    }
    useEffect(() => { loadScores(market, days); }, [market, days]);
    useEffect(() => {
        getMacroEvents(days).then(setMacroEvents).catch(() => setMacroEvents([]));
    }, [days]);
    useEffect(() => {
        loadRegimeAndSignals();
        const interval = setInterval(loadRegimeAndSignals, 60000);
        return () => clearInterval(interval);
    }, []);
    // Build chart data
    const lineColor = MARKET_COLORS[market];
    const chartData = [...scoreHistory]
        .sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime())
        .map((s) => {
        const d = new Date(s.calculatedAt);
        return {
            time: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            fullDate: d.toLocaleString(),
            score: Number(s.crashScore),
        };
    });
    // Map macro events to chart time strings
    const eventLines = macroEvents
        .map((ev) => {
        const evMs = new Date(ev.date).getTime();
        let best = null;
        let bestDiff = Infinity;
        for (const p of chartData) {
            const diff = Math.abs(new Date(p.fullDate).getTime() - evMs);
            if (diff < bestDiff) {
                bestDiff = diff;
                best = p;
            }
        }
        if (!best || bestDiff > 3 * 24 * 60 * 60 * 1000)
            return null;
        return { ...ev, xVal: best.time };
    })
        .filter(Boolean);
    // Today and upcoming 7 days for highlighting
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    // Filter signals by search
    const filteredSignals = closedSignals.filter((s) => {
        if (!searchQuery)
            return true;
        const q = searchQuery.toLowerCase();
        return (s.instrument?.toLowerCase().includes(q) ||
            s.strategy?.toLowerCase().includes(q) ||
            s.action?.toLowerCase().includes(q));
    });
    // Win rate
    const wins = closedSignals.filter((s) => s.outcome?.toUpperCase() === "WIN").length;
    const losses = closedSignals.filter((s) => s.outcome?.toUpperCase() === "LOSS").length;
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : null;
    return (_jsxs("div", { style: { padding: 28 }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }, children: "Historical Analysis" }), _jsx("p", { style: { color: C.textMuted, marginTop: 5, fontSize: 13 }, children: "Crash scores, regime changes, and signal performance over time" })] }), _jsx("div", { style: { display: "flex", gap: 3, marginBottom: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, width: "fit-content" }, children: [
                    { id: "single", label: "Score History" },
                    { id: "comparison", label: "Market Comparison" },
                ].map((tab) => {
                    const isAct = activeTab === tab.id;
                    return (_jsx("button", { onClick: () => setActiveTab(tab.id), style: {
                            padding: "7px 18px",
                            borderRadius: 7,
                            border: isAct ? `1px solid ${C.blue}44` : "1px solid transparent",
                            background: isAct ? `${C.blue}1a` : "transparent",
                            color: isAct ? C.blue : "#64748b",
                            fontWeight: isAct ? 600 : 400,
                            fontSize: 13,
                            cursor: "pointer",
                            transition: "all 0.12s",
                        }, children: tab.label }, tab.id));
                }) }), _jsxs("div", { style: { display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap", alignItems: "flex-end" }, children: [activeTab === "single" && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }, children: "Market" }), _jsx(ButtonGroup, { options: MARKET_OPTIONS.map((m) => m.value), active: market, onSelect: setMarket, labelFn: (v) => {
                                    const m = MARKET_OPTIONS.find((mo) => mo.value === v);
                                    return `${m?.flag} ${m?.label}`;
                                } })] })), _jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }, children: "Period" }), _jsx(ButtonGroup, { options: DAYS_OPTIONS, active: days, onSelect: setDays, labelFn: (v) => `${v}d` })] })] }), activeTab === "comparison" && (_jsxs("div", { style: { marginBottom: 32 }, children: [_jsxs(SectionTitle, { info: "Crash probability scores for all 4 markets over time. Click a legend item to highlight that market's line.", children: ["Multi-Market Comparison \u2014 ", days, "d"] }), _jsx(MultiMarketChart, { days: days }), beginnerMode && (_jsx("div", { style: { marginTop: 12, padding: "10px 14px", background: `${C.blue}0d`, border: `1px solid ${C.blue}22`, borderRadius: 8, fontSize: 12, color: C.textSecondary }, children: "\uD83D\uDCDA Each line shows a different region's crash probability score. When all lines rise together, a global risk event may be unfolding. When only one rises, the risk is regional." }))] })), activeTab === "single" && (_jsx(_Fragment, { children: _jsxs("div", { style: { marginBottom: 32 }, children: [_jsxs(SectionTitle, { children: ["Crash Score History \u2014 ", MARKET_OPTIONS.find((m) => m.value === market)?.label] }), scoreError && _jsx(ErrorBanner, { message: scoreError, onRetry: () => loadScores(market, days) }), scoreLoading ? (_jsx(SkeletonBlock, { height: 300 })) : chartData.length === 0 ? (_jsx(EmptyState, { icon: "\uD83D\uDCC9", title: "No historical data", subtitle: "No score history available for this market and period." })) : (_jsx(Card, { style: { padding: "16px 18px" }, children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(AreaChart, { data: chartData, margin: { top: 10, right: 10, bottom: 0, left: -10 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "histGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: lineColor, stopOpacity: 0.25 }), _jsx("stop", { offset: "95%", stopColor: lineColor, stopOpacity: 0.02 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1a2436", vertical: false }), _jsx(XAxis, { dataKey: "time", stroke: "#2a3a50", tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, interval: "preserveStartEnd" }), _jsx(YAxis, { domain: [0, 100], stroke: "#2a3a50", tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, width: 28 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(ReferenceLine, { y: 75, stroke: "#ef444888", strokeDasharray: "5 3", label: { value: "Critical (75)", fill: "#ef4444", fontSize: 10, position: "insideTopLeft" } }), _jsx(ReferenceLine, { y: 50, stroke: "#f59e0b88", strokeDasharray: "5 3", label: { value: "High (50)", fill: "#f59e0b", fontSize: 10, position: "insideTopLeft" } }), eventLines.map((ev, i) => {
                                            const color = eventColor(ev.type);
                                            return (_jsx(ReferenceLine, { x: ev.xVal, stroke: color + "99", strokeDasharray: "4 3", label: { value: ev.type?.toUpperCase() ?? "", fill: color, fontSize: 9, position: "insideTopLeft" } }, i));
                                        }), _jsx(Area, { type: "monotone", dataKey: "score", stroke: lineColor, strokeWidth: 2, fill: "url(#histGrad)", dot: false, activeDot: { r: 4, fill: lineColor, strokeWidth: 0 }, name: "Crash Score" })] }) }) })), beginnerMode && !scoreLoading && (_jsx("div", { style: {
                                marginTop: 12,
                                padding: "10px 14px",
                                background: `${C.blue}0d`,
                                border: `1px solid ${C.blue}22`,
                                borderRadius: 8,
                                fontSize: 12,
                                color: C.textSecondary,
                            }, children: "\uD83D\uDCDA The dashed lines mark danger zones. Above 50 = elevated risk. Above 75 = critical \u2014 historically preceded by sharp market drops within 1-3 months." }))] }) })), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }, children: [_jsx(SectionTitle, { children: "Macro Event Calendar" }), _jsx("div", { style: { display: "flex", gap: 8 }, children: ["FOMC", "CPI", "JOBS"].map((t) => {
                                    const active = eventTypeFilter.has(t);
                                    const color = eventColor(t);
                                    return (_jsx("button", { onClick: () => setEventTypeFilter((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(t))
                                                next.delete(t);
                                            else
                                                next.add(t);
                                            return next;
                                        }), style: {
                                            padding: "4px 10px",
                                            borderRadius: 6,
                                            border: `1px solid ${active ? color + "88" : C.border}`,
                                            background: active ? color + "18" : "transparent",
                                            color: active ? color : C.textMuted,
                                            fontSize: 11,
                                            fontWeight: active ? 600 : 400,
                                            cursor: "pointer",
                                            transition: "all 0.12s",
                                        }, children: t }, t));
                                }) })] }), macroEvents.length === 0 ? (_jsx(EmptyState, { icon: "\uD83D\uDCC5", title: "No macro events", subtitle: "Macro events will appear here when available." })) : (_jsx(Card, { style: { padding: 0, overflow: "hidden" }, children: _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: TH, children: "Date" }), _jsx("th", { style: TH, children: "Event" }), _jsx("th", { style: TH, children: "Type" }), _jsx("th", { style: TH, children: "Impact" }), _jsx("th", { style: TH, children: "Days Until" })] }) }), _jsx("tbody", { children: macroEvents
                                            .filter((ev) => eventTypeFilter.has(ev.type?.toUpperCase()))
                                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            .map((ev, i) => {
                                            const evMs = new Date(ev.date).getTime();
                                            const diffMs = evMs - now;
                                            const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
                                            const isUpcoming = diffMs >= 0 && diffMs <= week;
                                            const isPast = diffMs < 0;
                                            const color = eventColor(ev.type);
                                            const impactKey = (ev.impact ?? "").toUpperCase();
                                            const impactColor = IMPACT_COLORS[impactKey] ?? C.textMuted;
                                            return (_jsxs("tr", { style: { background: isUpcoming ? `${C.blue}08` : undefined }, children: [_jsx("td", { style: { ...TD, color: isUpcoming ? C.blue : C.textMuted, fontWeight: isUpcoming ? 600 : 400 }, children: new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }), _jsx("td", { style: { ...TD, color: C.textPrimary }, children: ev.title ?? ev.name ?? ev.type }), _jsx("td", { style: TD, children: _jsx("span", { style: {
                                                                color,
                                                                background: color + "18",
                                                                border: `1px solid ${color}44`,
                                                                padding: "2px 8px",
                                                                borderRadius: 4,
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                            }, children: ev.type?.toUpperCase() }) }), _jsx("td", { style: TD, children: _jsx("span", { style: {
                                                                color: impactColor,
                                                                background: impactColor + "18",
                                                                border: `1px solid ${impactColor}44`,
                                                                padding: "2px 8px",
                                                                borderRadius: 4,
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                            }, children: ev.impact ?? "—" }) }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums", color: isPast ? C.textMuted : isUpcoming ? C.blue : C.textSecondary }, children: isPast
                                                            ? `${Math.abs(diffDays)}d ago`
                                                            : diffDays === 0
                                                                ? "Today"
                                                                : `${diffDays}d` })] }, ev.id ?? i));
                                        }) })] }) }) }))] }), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { children: "Regime Change Timeline" }), regimeError && _jsx(ErrorBanner, { message: regimeError, onRetry: loadRegimeAndSignals }), regimeLoading ? (_jsx(SkeletonBlock, { height: 160 })) : regimeHistory.length === 0 ? (_jsx(EmptyState, { icon: "\uD83D\uDCC5", title: "No regime changes recorded", subtitle: "Regime change history will appear as market conditions evolve." })) : (_jsx(Card, { style: { padding: 0, overflow: "hidden" }, children: regimeHistory.map((event, i) => {
                            const fromKey = event.from?.toUpperCase();
                            const toKey = event.to?.toUpperCase();
                            const fromColor = REGIME_COLORS[fromKey] ?? C.textMuted;
                            const toColor = REGIME_COLORS[toKey] ?? C.textMuted;
                            return (_jsxs("div", { style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 16,
                                    padding: "14px 20px",
                                    borderBottom: i < regimeHistory.length - 1 ? `1px solid ${C.border}` : undefined,
                                }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }, children: [_jsx("div", { style: { width: 10, height: 10, borderRadius: "50%", background: toColor, boxShadow: `0 0 6px ${toColor}66` } }), i < regimeHistory.length - 1 && (_jsx("div", { style: { width: 2, height: 20, background: `${C.border}`, marginTop: 4 } }))] }), _jsx("div", { style: { color: C.textMuted, fontSize: 12, width: 90, flexShrink: 0 }, children: event.date
                                            ? new Date(event.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                                            : "—" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flex: 1 }, children: [_jsx(Badge, { label: event.from ?? "—", color: fromColor }), _jsx("span", { style: { color: C.textMuted, fontSize: 14 }, children: "\u2192" }), _jsx(Badge, { label: event.to ?? "—", color: toColor })] }), event.market && (_jsx("div", { style: { color: C.textMuted, fontSize: 12, textTransform: "uppercase", flexShrink: 0 }, children: event.market }))] }, i));
                        }) }))] }), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }, children: [_jsx("h2", { style: { fontSize: 15, fontWeight: 600, color: C.textSecondary, margin: 0 }, children: "Past Signals Performance" }), winRate != null && (_jsxs("div", { style: {
                                            background: winRate >= 50 ? `${C.green}1a` : `${C.red}1a`,
                                            border: `1px solid ${winRate >= 50 ? C.green : C.red}44`,
                                            borderRadius: 8,
                                            padding: "4px 12px",
                                            fontSize: 12,
                                            color: winRate >= 50 ? C.green : C.red,
                                            fontWeight: 600,
                                        }, children: ["Win Rate: ", winRate.toFixed(1), "% (", wins, "W / ", losses, "L)"] }))] }), closedSignals.length > 0 && (_jsx("input", { type: "text", placeholder: "Search signals...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: {
                                    background: C.card,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 8,
                                    padding: "7px 12px",
                                    color: C.textPrimary,
                                    fontSize: 12,
                                    outline: "none",
                                    width: 180,
                                } }))] }), closedSignals.length === 0 ? (_jsx(EmptyState, { icon: "\uD83D\uDCCA", title: "No closed signals", subtitle: "Completed signal performance will appear here." })) : filteredSignals.length === 0 ? (_jsx(EmptyState, { icon: "\uD83D\uDD0D", title: "No matching signals", subtitle: "Try a different search term." })) : (_jsx(Card, { style: { padding: 0, overflow: "hidden" }, children: _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: TH, children: "Date" }), _jsx("th", { style: TH, children: "Instrument" }), _jsx("th", { style: TH, children: "Action" }), _jsx("th", { style: TH, children: "Strategy" }), _jsx("th", { style: TH, children: "Target" }), _jsx("th", { style: TH, children: "Result" }), _jsx("th", { style: TH, children: "Outcome" })] }) }), _jsx("tbody", { children: filteredSignals.map((sig, i) => {
                                            const outcome = (sig.outcome ?? sig.status ?? "OPEN").toUpperCase();
                                            const outcomeColor = OUTCOME_COLORS[outcome] ?? C.textMuted;
                                            const ac = sig.action?.toUpperCase();
                                            const actionColor = ac === "BUY" || ac === "LONG" ? C.green : ac === "SHORT" ? C.red : "#f97316";
                                            return (_jsxs("tr", { children: [_jsx("td", { style: { ...TD, color: C.textMuted }, children: sig.createdAt ? new Date(sig.createdAt).toLocaleDateString() : "—" }), _jsx("td", { style: { ...TD, color: C.textPrimary, fontWeight: 700 }, children: sig.instrument ?? "—" }), _jsx("td", { style: TD, children: _jsx("span", { style: {
                                                                color: actionColor,
                                                                background: `${actionColor}1a`,
                                                                border: `1px solid ${actionColor}44`,
                                                                padding: "2px 8px",
                                                                borderRadius: 4,
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                            }, children: ac ?? "—" }) }), _jsx("td", { style: { ...TD, color: C.textSecondary, fontSize: 12 }, children: sig.strategy ?? "—" }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: sig.target != null ? `$${Number(sig.target).toFixed(2)}` : "—" }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: sig.actualResult != null
                                                            ? `$${Number(sig.actualResult).toFixed(2)}`
                                                            : sig.closePrice != null
                                                                ? `$${Number(sig.closePrice).toFixed(2)}`
                                                                : "—" }), _jsx("td", { style: TD, children: _jsx(Badge, { label: outcome, color: outcomeColor }) })] }, sig.id ?? i));
                                        }) })] }) }) }))] })] }));
}
