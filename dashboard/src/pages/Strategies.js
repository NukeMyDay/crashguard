import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { getStrategies, getStrategyPerformance } from "../api.js";
import { C, Card, EmptyState, ErrorBanner, SkeletonBlock, Badge, useExpertise, TH, TD, } from "../context.js";
const TYPE_COLORS = {
    MOMENTUM: "#6366f1",
    MEAN_REVERSION: "#8b5cf6",
    BREAKOUT: "#f97316",
    OPTIONS: "#eab308",
    TREND: C.green,
    ARBITRAGE: "#06b6d4",
    VOLATILITY: C.red,
    SECTOR_ROTATION: "#3b82f6",
    RISK_OFF: C.amber,
    SHORT: C.red,
    PENNY: "#a855f7",
};
const BEGINNER_EXPLANATIONS = {
    MOMENTUM: "Buys assets that are already going up. Like surfing — ride the wave.",
    MEAN_REVERSION: "Buys assets that dropped too far too fast. Like a rubber band snapping back.",
    SECTOR_ROTATION: "Follows where big money is flowing. If tech is hot, buy tech ETFs.",
    RISK_OFF: "When danger signals flash, move to cash and safe assets.",
    SHORT: "Profit when stocks go DOWN. Uses put options or inverse ETFs.",
    PENNY: "Cheap stocks with explosive volume. Very high risk, potential 10x returns.",
    TREND: "Follows the prevailing market direction — up in bull markets, down in bear markets.",
    BREAKOUT: "Buys when a stock breaks above a resistance level with strong volume.",
    OPTIONS: "Uses options contracts to profit from volatility or directional moves.",
    VOLATILITY: "Profits from changes in market volatility, not just price direction.",
    ARBITRAGE: "Exploits tiny price differences between similar assets for near-risk-free profit.",
};
function WinRateBar({ value }) {
    const pct = Math.min(100, Math.max(0, value));
    const color = pct >= 60 ? C.green : pct >= 50 ? C.amber : C.red;
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { width: 80, height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", flexShrink: 0 }, children: _jsx("div", { style: { width: `${pct}%`, height: "100%", background: color, borderRadius: 3 } }) }), _jsxs("span", { style: { color, fontSize: 12, fontWeight: 700, fontFamily: "monospace", minWidth: 38 }, children: [pct.toFixed(1), "%"] })] }));
}
function PnLVsBenchmark({ total, benchmark }) {
    if (total == null)
        return _jsx("span", { style: { color: C.textMuted }, children: "\u2014" });
    const color = total >= 0 ? C.green : C.red;
    const vsBench = benchmark != null ? total - benchmark : null;
    return (_jsxs("div", { children: [_jsxs("span", { style: { color, fontFamily: "monospace", fontWeight: 700, fontSize: 13 }, children: [total >= 0 ? "+" : "", total.toFixed(2), "%"] }), vsBench != null && (_jsxs("div", { style: { color: vsBench >= 0 ? C.green : C.red, fontSize: 10, marginTop: 1 }, children: [vsBench >= 0 ? "+" : "", vsBench.toFixed(2), "% vs bench"] }))] }));
}
function Sparkline({ data }) {
    if (!data || data.length < 2)
        return null;
    const lastPnl = data[data.length - 1]?.pnl ?? 0;
    const lineColor = lastPnl >= 0 ? C.green : C.red;
    return (_jsx("div", { style: { height: 40, width: 80 }, children: _jsx(ResponsiveContainer, { width: "100%", height: 40, children: _jsxs(LineChart, { data: data, margin: { top: 2, right: 2, bottom: 2, left: 2 }, children: [_jsx(Tooltip, { contentStyle: { background: "#1a2332", border: `1px solid ${C.border}`, fontSize: 11, padding: "3px 7px" }, formatter: (val) => [`${Number(val).toFixed(2)}%`, "P&L"], labelFormatter: () => "" }), _jsx(Line, { type: "monotone", dataKey: "pnl", stroke: lineColor, dot: false, strokeWidth: 1.5, isAnimationActive: false })] }) }) }));
}
function ExpandedDescription({ strategy, perf, }) {
    const { isBeginner: beginnerMode } = useExpertise();
    const typeKey = (strategy?.type ?? perf?.type ?? "").toUpperCase();
    const begExp = BEGINNER_EXPLANATIONS[typeKey];
    const desc = strategy?.description ?? perf?.description;
    if (!desc && !begExp)
        return null;
    return (_jsxs("div", { style: {
            padding: "12px 16px",
            borderTop: `1px solid ${C.border}`,
            background: "#090f1a",
        }, children: [desc && (_jsx("p", { style: { color: C.textSecondary, fontSize: 13, lineHeight: 1.7, margin: "0 0 8px" }, children: desc })), begExp && (_jsxs("div", { style: {
                    background: `${TYPE_COLORS[typeKey] ?? C.blue}0d`,
                    border: `1px solid ${TYPE_COLORS[typeKey] ?? C.blue}33`,
                    borderRadius: 8,
                    padding: "8px 12px",
                }, children: [_jsx("div", { style: { color: TYPE_COLORS[typeKey] ?? C.blue, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }, children: "How It Works" }), _jsx("div", { style: { color: C.textSecondary, fontSize: 12, lineHeight: 1.6 }, children: begExp }), beginnerMode && (_jsx("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 6, lineHeight: 1.5 }, children: "Think of this strategy as a systematic rule: when certain conditions are met, it generates a buy or sell signal automatically." }))] }))] }));
}
function PerformanceTable({ perfs, strategies, onSelect, }) {
    const [expandedName, setExpandedName] = useState(null);
    return (_jsx("div", { style: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }, children: _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { ...TH, width: 28 }, children: "#" }), _jsx("th", { style: TH, children: "Strategy" }), _jsx("th", { style: TH, children: "Type" }), _jsx("th", { style: TH, children: "Signals" }), _jsx("th", { style: { ...TH, minWidth: 130 }, children: "Win Rate" }), _jsx("th", { style: TH, children: "Avg Return" }), _jsx("th", { style: { ...TH, minWidth: 110 }, children: "Total P&L" }), _jsx("th", { style: TH, children: "Trend" })] }) }), _jsx("tbody", { children: perfs.map((p, i) => {
                            const typeKey = (p.type ?? "").toUpperCase();
                            const typeColor = TYPE_COLORS[typeKey] ?? C.textMuted;
                            const strat = strategies.find((s) => s.name === p.name);
                            const isExpanded = expandedName === p.name;
                            return (_jsxs(_Fragment, { children: [_jsxs("tr", { onClick: () => setExpandedName(isExpanded ? null : p.name), style: {
                                            cursor: "pointer",
                                            background: isExpanded ? "#0d1b2e" : i % 2 === 0 ? "transparent" : "#090e18",
                                            transition: "background 0.1s",
                                        }, onMouseEnter: (e) => { if (!isExpanded)
                                            e.currentTarget.style.background = "#111a2e"; }, onMouseLeave: (e) => { if (!isExpanded)
                                            e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "#090e18"; }, children: [_jsx("td", { style: { ...TD, color: C.textMuted, fontWeight: 600 }, children: i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}` }), _jsx("td", { style: { ...TD, color: C.textPrimary, fontWeight: 600 }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [p.name, _jsx("span", { style: { color: C.textMuted, fontSize: 10 }, children: isExpanded ? "▲" : "▼" })] }) }), _jsx("td", { style: TD, children: p.type && _jsx(Badge, { label: typeKey || p.type, color: typeColor, style: { fontSize: 10 } }) }), _jsx("td", { style: { ...TD, fontFamily: "monospace", color: C.textSecondary }, children: p.signalCount ?? p.signals ?? "—" }), _jsx("td", { style: TD, children: p.winRate != null ? _jsx(WinRateBar, { value: p.winRate }) : _jsx("span", { style: { color: C.textMuted }, children: "\u2014" }) }), _jsx("td", { style: { ...TD, fontFamily: "monospace" }, children: p.avgReturn != null ? (_jsxs("span", { style: { color: p.avgReturn >= 0 ? C.green : C.red, fontWeight: 600 }, children: [p.avgReturn >= 0 ? "+" : "", p.avgReturn.toFixed(2), "%"] })) : _jsx("span", { style: { color: C.textMuted }, children: "\u2014" }) }), _jsx("td", { style: TD, children: _jsx(PnLVsBenchmark, { total: p.totalPnl, benchmark: p.benchmarkPnl }) }), _jsx("td", { style: TD, children: strat?.performanceHistory && strat.performanceHistory.length >= 2 ? (_jsx(Sparkline, { data: strat.performanceHistory })) : (_jsx("span", { style: { color: C.textMuted }, children: "\u2014" })) })] }, p.name), isExpanded && (_jsx("tr", { children: _jsx("td", { colSpan: 8, style: { padding: 0 }, children: _jsx(ExpandedDescription, { strategy: strat, perf: p }) }) }, `${p.name}-exp`))] }));
                        }) })] }) }) }));
}
function StrategyDetail({ strategy, onBack }) {
    const { isBeginner: beginnerMode } = useExpertise();
    const typeKey = strategy.type?.toUpperCase() ?? "UNKNOWN";
    const typeColor = TYPE_COLORS[typeKey] ?? C.textMuted;
    const begExp = BEGINNER_EXPLANATIONS[typeKey];
    const hasPerf = Array.isArray(strategy.performanceHistory) && strategy.performanceHistory.length >= 2;
    return (_jsxs("div", { children: [_jsx("button", { onClick: onBack, style: {
                    display: "flex", alignItems: "center", gap: 6,
                    background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "7px 14px", color: C.textSecondary, fontSize: 13,
                    cursor: "pointer", marginBottom: 24, transition: "border-color 0.12s",
                }, children: "\u2190 Back to Strategies" }), _jsxs(Card, { style: { marginBottom: 20 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("h2", { style: { fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0, marginBottom: 8 }, children: strategy.name }), _jsx(Badge, { label: typeKey, color: typeColor })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("div", { style: {
                                            width: 10, height: 10, borderRadius: "50%",
                                            background: strategy.isActive ? C.green : C.textMuted,
                                            boxShadow: strategy.isActive ? `0 0 8px ${C.green}88` : "none",
                                        } }), _jsx("span", { style: { color: strategy.isActive ? C.green : C.textMuted, fontSize: 14, fontWeight: 500 }, children: strategy.isActive ? "Active" : "Inactive" })] })] }), strategy.description && (_jsx("p", { style: { color: C.textSecondary, fontSize: 14, lineHeight: 1.7, margin: 0, marginBottom: 16 }, children: strategy.description })), begExp && (_jsxs("div", { style: {
                            background: `${typeColor}0d`, border: `1px solid ${typeColor}44`,
                            borderRadius: 10, padding: "14px 18px", marginBottom: 16,
                        }, children: [_jsx("div", { style: { color: typeColor, fontWeight: 600, fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "How It Works" }), _jsx("div", { style: { color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }, children: begExp }), beginnerMode && (_jsx("div", { style: { color: C.textMuted, fontSize: 12, marginTop: 8, lineHeight: 1.5 }, children: "Think of this strategy as a systematic rule: when certain conditions are met, it generates a buy or sell signal automatically." }))] })), _jsxs("div", { style: { display: "flex", gap: 24, flexWrap: "wrap" }, children: [strategy.activeSignals != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 12 }, children: "Active Signals" }), _jsx("div", { style: { color: C.textPrimary, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }, children: strategy.activeSignals })] })), strategy.winRate != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 12 }, children: "Win Rate" }), _jsxs("div", { style: { color: strategy.winRate >= 50 ? C.green : C.red, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }, children: [strategy.winRate.toFixed(1), "%"] })] }))] })] }), (strategy.regimeFit ?? []).length > 0 && (_jsxs(Card, { style: { marginBottom: 20 }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }, children: "Best Market Conditions" }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: (strategy.regimeFit ?? []).map((r) => (_jsx(Badge, { label: r, color: C.blue }, r))) })] })), hasPerf && (_jsxs(Card, { style: { marginBottom: 20 }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }, children: "Historical Performance" }), _jsx("div", { style: { height: 120 }, children: _jsx(ResponsiveContainer, { width: "100%", height: 120, children: _jsxs(LineChart, { data: strategy.performanceHistory, children: [_jsx(Tooltip, { contentStyle: { background: "#1a2332", border: `1px solid ${C.border}`, fontSize: 12 }, formatter: (v) => [`${Number(v).toFixed(2)}%`, "P&L"] }), _jsx(Line, { type: "monotone", dataKey: "pnl", stroke: (strategy.performanceHistory?.at(-1)?.pnl ?? 0) >= 0 ? C.green : C.red, dot: false, strokeWidth: 2, isAnimationActive: false })] }) }) })] }))] }));
}
function StrategyCard({ strategy, onClick }) {
    const [hovered, setHovered] = useState(false);
    const typeKey = strategy.type?.toUpperCase() ?? "UNKNOWN";
    const typeColor = TYPE_COLORS[typeKey] ?? C.textMuted;
    const hasPerf = Array.isArray(strategy.performanceHistory) && strategy.performanceHistory.length >= 2;
    return (_jsxs("div", { onClick: onClick, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: {
            background: C.card,
            border: `1px solid ${hovered ? typeColor + "55" : C.border}`,
            borderRadius: 12, padding: "20px 22px",
            cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
            boxShadow: hovered ? `0 0 16px ${typeColor}18` : "none",
            display: "flex", flexDirection: "column", gap: 12,
        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { color: C.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 6 }, children: strategy.name }), _jsx(Badge, { label: strategy.type ?? "UNKNOWN", color: typeColor })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }, children: [_jsx("div", { style: { width: 8, height: 8, borderRadius: "50%", background: strategy.isActive ? C.green : C.textMuted, boxShadow: strategy.isActive ? `0 0 6px ${C.green}88` : "none" } }), _jsx("span", { style: { color: strategy.isActive ? C.green : C.textMuted, fontSize: 12 }, children: strategy.isActive ? "Active" : "Inactive" })] })] }), strategy.description && _jsx("p", { style: { color: C.textSecondary, fontSize: 13, margin: 0, lineHeight: 1.6 }, children: strategy.description }), _jsxs("div", { style: { display: "flex", gap: 20, flexWrap: "wrap" }, children: [strategy.activeSignals != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, marginBottom: 2 }, children: "Active Signals" }), _jsx("div", { style: { color: C.textPrimary, fontSize: 16, fontWeight: 600, fontFamily: "monospace" }, children: strategy.activeSignals })] })), strategy.winRate != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, marginBottom: 2 }, children: "Win Rate" }), _jsxs("div", { style: { color: strategy.winRate >= 50 ? C.green : C.red, fontSize: 16, fontWeight: 600, fontFamily: "monospace" }, children: [strategy.winRate.toFixed(1), "%"] })] }))] }), hasPerf && _jsx(Sparkline, { data: strategy.performanceHistory }), _jsx("div", { style: { color: C.textMuted, fontSize: 11, marginTop: "auto" }, children: "Click to view details \u2192" })] }));
}
export function Strategies() {
    const [strategies, setStrategies] = useState([]);
    const [perfs, setPerfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);
    const [view, setView] = useState("leaderboard");
    async function load() {
        try {
            const [strats, perfData] = await Promise.all([
                getStrategies(),
                getStrategyPerformance().catch(() => []),
            ]);
            setStrategies(Array.isArray(strats) ? strats : []);
            setPerfs(Array.isArray(perfData) ? perfData : []);
            setError(null);
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, []);
    if (selected) {
        return (_jsx("div", { style: { padding: 28 }, children: _jsx(StrategyDetail, { strategy: selected, onBack: () => setSelected(null) }) }));
    }
    // Merge perf data with strategy cards — use perfs if available, else fall back to strategy list
    const hasPerfs = perfs.length > 0;
    const displayPerfs = hasPerfs
        ? perfs
        : strategies.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            signalCount: s.activeSignals,
            winRate: s.winRate,
            description: s.description,
        }));
    return (_jsxs("div", { style: { padding: 28 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }, children: [_jsxs("div", { children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }, children: "Strategy Leaderboard" }), _jsx("p", { style: { color: C.textMuted, marginTop: 5, fontSize: 13 }, children: "Performance ranking \u00B7 click a row to expand description" })] }), _jsx("div", { style: { display: "flex", gap: 4, background: "#0d1424", borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }, children: ["leaderboard", "cards"].map((v) => (_jsx("button", { onClick: () => setView(v), style: {
                                padding: "5px 14px", borderRadius: 6, border: "none",
                                background: view === v ? C.blue : "transparent",
                                color: view === v ? "#fff" : C.textMuted,
                                fontSize: 12, fontWeight: view === v ? 600 : 400,
                                cursor: "pointer", textTransform: "capitalize", transition: "all 0.12s",
                            }, children: v === "leaderboard" ? "📊 Leaderboard" : "🃏 Cards" }, v))) })] }), error && _jsx(ErrorBanner, { message: `Failed to load strategies: ${error}`, onRetry: load }), loading ? (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [0, 1, 2, 3].map((i) => _jsx(SkeletonBlock, { height: 52 }, i)) })) : strategies.length === 0 ? (_jsx(EmptyState, { icon: "\uD83C\uDFAF", title: "No strategies configured", subtitle: "Strategies will appear here once they are set up." })) : view === "leaderboard" ? (_jsx(PerformanceTable, { perfs: displayPerfs, strategies: strategies, onSelect: (name) => {
                    const s = strategies.find((st) => st.name === name);
                    if (s)
                        setSelected(s);
                } })) : (_jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }, children: strategies.map((strategy) => (_jsx(StrategyCard, { strategy: strategy, onClick: () => setSelected(strategy) }, strategy.id))) }))] }));
}
