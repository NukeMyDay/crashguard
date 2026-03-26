import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, } from "recharts";
import { getStrategies } from "../api.js";
const TYPE_COLORS = {
    MOMENTUM: "#6366f1",
    MEAN_REVERSION: "#8b5cf6",
    BREAKOUT: "#f97316",
    OPTIONS: "#eab308",
    TREND: "#22c55e",
    ARBITRAGE: "#06b6d4",
    VOLATILITY: "#ef4444",
};
function TypeBadge({ type }) {
    const color = TYPE_COLORS[type?.toUpperCase()] ?? "#94a3b8";
    return (_jsx("span", { style: {
            display: "inline-block",
            padding: "2px 9px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color,
            background: `${color}22`,
            border: `1px solid ${color}44`,
            textTransform: "uppercase",
        }, children: type }));
}
function ActiveDot({ isActive }) {
    return (_jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 5 }, children: [_jsx("span", { style: {
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isActive ? "#22c55e" : "#475569",
                    display: "inline-block",
                    boxShadow: isActive ? "0 0 6px #22c55e88" : undefined,
                } }), _jsx("span", { style: { color: isActive ? "#22c55e" : "#475569", fontSize: 12 }, children: isActive ? "Active" : "Inactive" })] }));
}
function Sparkline({ data }) {
    if (!data || data.length < 2)
        return null;
    const chartData = data.map((d) => ({ date: d.date, pnl: d.pnl }));
    const lastPnl = data[data.length - 1]?.pnl ?? 0;
    const lineColor = lastPnl >= 0 ? "#22c55e" : "#ef4444";
    return (_jsx("div", { style: { marginTop: 12, height: 50 }, children: _jsx(ResponsiveContainer, { width: "100%", height: 50, children: _jsxs(LineChart, { data: chartData, margin: { top: 2, right: 2, bottom: 2, left: 2 }, children: [_jsx(Tooltip, { contentStyle: {
                            background: "#0f172a",
                            border: "1px solid #334155",
                            color: "#e2e8f0",
                            fontSize: 11,
                            padding: "4px 8px",
                        }, formatter: (val) => [`${Number(val).toFixed(2)}%`, "P&L"], labelFormatter: () => "" }), _jsx(Line, { type: "monotone", dataKey: "pnl", stroke: lineColor, dot: false, strokeWidth: 1.5, isAnimationActive: false })] }) }) }));
}
function StrategyCard({ strategy }) {
    const regimeFit = strategy.regimeFit ?? [];
    const hasPerf = Array.isArray(strategy.performanceHistory) && strategy.performanceHistory.length >= 2;
    return (_jsxs("div", { style: {
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 10,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
        }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { color: "#e2e8f0", fontWeight: 600, fontSize: 15, marginBottom: 4 }, children: strategy.name }), _jsx(TypeBadge, { type: strategy.type ?? "UNKNOWN" })] }), _jsx(ActiveDot, { isActive: strategy.isActive ?? false })] }), strategy.description && (_jsx("p", { style: { color: "#94a3b8", fontSize: 13, margin: 0, lineHeight: 1.5 }, children: strategy.description })), regimeFit.length > 0 && (_jsxs("div", { children: [_jsx("div", { style: {
                            color: "#64748b",
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: 6,
                        }, children: "Regime Fit" }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 }, children: regimeFit.map((r) => (_jsx("span", { style: {
                                color: "#94a3b8",
                                background: "#1e293b",
                                border: "1px solid #334155",
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                            }, children: r }, r))) })] })), hasPerf && (_jsxs("div", { children: [_jsx("div", { style: {
                            color: "#64748b",
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: 4,
                        }, children: "Performance" }), _jsx(Sparkline, { data: strategy.performanceHistory })] }))] }));
}
// ---------------------------------------------------------------------------
// Signal Accuracy & Calibration
// ---------------------------------------------------------------------------
const MOCK_CALIBRATION = [
    { name: "Momentum", statedConfidence: 72, actualWinRate: 58, sampleSize: 24 },
    { name: "Mean Reversion", statedConfidence: 65, actualWinRate: 61, sampleSize: 18 },
    { name: "Breakout", statedConfidence: 70, actualWinRate: 74, sampleSize: 31 },
    { name: "Trend Follow", statedConfidence: 68, actualWinRate: 63, sampleSize: 15 },
];
function CalibrationDisplay() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        fetch("/v1/strategies/calibration")
            .then((r) => r.ok ? r.json() : null)
            .then((d) => {
            if (!cancelled) {
                const arr = Array.isArray(d?.strategies) ? d.strategies : Array.isArray(d) ? d : MOCK_CALIBRATION;
                setRows(arr);
            }
        })
            .catch(() => { if (!cancelled) setRows(MOCK_CALIBRATION); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);
    if (loading) return _jsx("div", { style: { height: 120, background: "#0f172a", borderRadius: 10, opacity: 0.5 } });
    const totalSignals = rows.reduce((a, r) => a + (r.sampleSize ?? 0), 0);
    const overconfidentCount = rows.filter((r) => r.actualWinRate < r.statedConfidence).length;
    const chartData = rows.map((r) => ({ name: r.name, Stated: r.statedConfidence, Actual: r.actualWinRate }));
    return _jsxs("div", { style: { marginTop: 36 }, children: [
        _jsx("h2", { style: { fontSize: 16, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }, children: "🎯 Signal Accuracy & Calibration" }),
        totalSignals > 0 && _jsxs("div", {
            style: {
                padding: "10px 16px",
                background: overconfidentCount > 0 ? "#f59e0b11" : "#22c55e11",
                border: `1px solid ${overconfidentCount > 0 ? "#f59e0b33" : "#22c55e33"}`,
                borderRadius: 8,
                fontSize: 13,
                color: "#94a3b8",
                marginBottom: 14,
            },
            children: [
                _jsx("span", { style: { marginRight: 6 }, children: overconfidentCount > 0 ? "⚠️" : "✅" }),
                `Based on ${totalSignals} signals, `,
                overconfidentCount > 0
                    ? `${overconfidentCount} strateg${overconfidentCount > 1 ? "ies are" : "y is"} overconfident — confidence auto-adjusted.`
                    : "all strategies are well-calibrated.",
            ],
        }),
        _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }, children: [
            _jsxs("div", { style: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden" }, children: [
                _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [
                    _jsx("thead", { children: _jsxs("tr", { children: [
                        _jsx("th", { style: { padding: "10px 14px", textAlign: "left", color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #1e293b" }, children: "Strategy" }),
                        _jsx("th", { style: { padding: "10px 14px", textAlign: "right", color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #1e293b" }, children: "Stated" }),
                        _jsx("th", { style: { padding: "10px 14px", textAlign: "right", color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #1e293b" }, children: "Actual" }),
                        _jsx("th", { style: { padding: "10px 14px", textAlign: "right", color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #1e293b" }, children: "Delta" }),
                    ] }) }),
                    _jsx("tbody", { children: rows.map((row, i) => {
                        const diff = row.actualWinRate - row.statedConfidence;
                        const isGood = diff >= 0;
                        const calColor = isGood ? "#22c55e" : "#ef4444";
                        return _jsxs("tr", { style: { background: i % 2 === 0 ? "transparent" : "#080d16" }, children: [
                            _jsx("td", { style: { padding: "10px 14px", color: "#e2e8f0", fontWeight: 600 }, children: row.name }),
                            _jsxs("td", { style: { padding: "10px 14px", textAlign: "right", fontFamily: "monospace", color: "#94a3b8" }, children: [row.statedConfidence, "%"] }),
                            _jsxs("td", { style: { padding: "10px 14px", textAlign: "right", fontFamily: "monospace", color: row.actualWinRate >= 50 ? "#22c55e" : "#ef4444", fontWeight: 700 }, children: [row.actualWinRate, "%"] }),
                            _jsx("td", { style: { padding: "10px 14px", textAlign: "right" }, children:
                                _jsxs("span", {
                                    style: { color: calColor, background: `${calColor}18`, border: `1px solid ${calColor}44`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: "monospace" },
                                    children: [isGood ? "+" : "", diff.toFixed(1), "%"],
                                }),
                            }),
                        ] }, row.name);
                    }) }),
                ] }),
            ] }),
            _jsxs("div", { style: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 18px" }, children: [
                _jsx("div", { style: { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }, children: "Stated vs Actual" }),
                _jsx(ResponsiveContainer, { width: "100%", height: 140, children:
                    _jsxs(BarChart, { data: chartData, margin: { top: 4, right: 8, bottom: 0, left: -16 }, children: [
                        _jsx(XAxis, { dataKey: "name", tick: { fill: "#64748b", fontSize: 10 }, axisLine: false, tickLine: false }),
                        _jsx(YAxis, { domain: [0, 100], tick: { fill: "#64748b", fontSize: 10 }, axisLine: false, tickLine: false }),
                        _jsx(Tooltip, { contentStyle: { background: "#0f172a", border: "1px solid #334155", fontSize: 11 }, formatter: (v, name) => [`${v}%`, name] }),
                        _jsx(Bar, { dataKey: "Stated", fill: "#3b82f6", opacity: 0.6, radius: [3, 3, 0, 0], maxBarSize: 24 }),
                        _jsx(Bar, { dataKey: "Actual", radius: [3, 3, 0, 0], maxBarSize: 24, children:
                            chartData.map((entry, i) =>
                                _jsx(Cell, { fill: entry.Actual >= entry.Stated ? "#22c55e" : "#ef4444" }, `c-${i}`)
                            ),
                        }),
                    ] }),
                }),
            ] }),
        ] }),
    ] });
}

export function Strategies() {
    const [strategies, setStrategies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    async function load() {
        try {
            const data = await getStrategies();
            setStrategies(Array.isArray(data) ? data : []);
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
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: 0 }, children: "Strategies" }), _jsx("p", { style: { color: "#64748b", marginTop: 4, fontSize: 13 }, children: "Active and available trading strategies" })] }), loading && (_jsx("p", { style: { color: "#64748b" }, children: "Loading strategies..." })), error && (_jsxs("div", { style: {
                    background: "#0f172a",
                    border: "1px solid #ef444433",
                    borderRadius: 10,
                    padding: 20,
                    color: "#f87171",
                }, children: ["Failed to load strategies: ", error] })), !loading && !error && strategies.length === 0 && (_jsxs("div", { style: {
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                    padding: 40,
                    textAlign: "center",
                    color: "#475569",
                }, children: [_jsx("div", { style: { fontSize: 36, marginBottom: 12 }, children: "\uD83C\uDFAF" }), _jsx("div", { style: { fontSize: 15 }, children: "No strategies configured" }), _jsx("div", { style: { fontSize: 13, marginTop: 6 }, children: "Strategies will appear here once they are set up" })] })), !loading && strategies.length > 0 && (_jsx("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 20,
                }, children: strategies.map((strategy) => (_jsx(StrategyCard, { strategy: strategy }, strategy.id))) })), _jsx(CalibrationDisplay, {})] }));
}
