import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, } from "recharts";
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
                }, children: strategies.map((strategy) => (_jsx(StrategyCard, { strategy: strategy }, strategy.id))) }))] }));
}
