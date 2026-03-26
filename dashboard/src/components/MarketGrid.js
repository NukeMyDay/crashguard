import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { C, getScoreColor, getScoreLabel, Badge, REGIME_COLORS } from "../context.js";
const MARKET_INFO = {
    us: { label: "US Markets", flag: "🇺🇸" },
    eu: { label: "EU Markets", flag: "🇪🇺" },
    asia: { label: "Asian Markets", flag: "🇯🇵" },
    global: { label: "Global", flag: "🌐" },
};
function ComponentBar({ label, value }) {
    const color = getScoreColor(value);
    return (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 11, textTransform: "capitalize" }, children: label }), _jsx("span", { style: { color, fontSize: 11, fontWeight: 600 }, children: Math.round(value) })] }), _jsx("div", { style: { height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }, children: _jsx("div", { style: {
                        width: `${Math.min(100, Math.max(0, value))}%`,
                        height: "100%",
                        background: color,
                        borderRadius: 2,
                    } }) })] }));
}
function MarketCard({ score, regime, sparkline, }) {
    const [expanded, setExpanded] = useState(false);
    const value = Number(score.crashScore);
    const color = getScoreColor(value);
    const info = MARKET_INFO[score.market] ?? { label: score.market, flag: "🌐" };
    const regimeColor = regime ? (REGIME_COLORS[regime] ?? C.textMuted) : undefined;
    const components = score.componentScores;
    return (_jsxs("div", { onClick: () => setExpanded((v) => !v), style: {
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${expanded ? color + "55" : C.border}`,
            padding: "20px 22px",
            cursor: "pointer",
            transition: "border-color 0.15s, box-shadow 0.15s",
            boxShadow: expanded ? `0 0 16px ${color}22` : "none",
        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }, children: [_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }, children: [_jsx("span", { style: { fontSize: 20 }, children: info.flag }), _jsx("span", { style: { color: C.textSecondary, fontSize: 13, fontWeight: 500 }, children: info.label })] }), regime && (_jsx(Badge, { label: regime, color: regimeColor }))] }), sparkline && sparkline.length > 1 && (_jsx("div", { style: { width: 60, height: 28, opacity: 0.7 }, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsx(LineChart, { data: sparkline, children: _jsx(Line, { type: "monotone", dataKey: "score", stroke: color, dot: false, strokeWidth: 1.5, isAnimationActive: false }) }) }) }))] }), _jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 6 }, children: [_jsx("span", { style: {
                            fontSize: 42,
                            fontWeight: 700,
                            color,
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                        }, children: value.toFixed(0) }), _jsx("span", { style: { color: C.textMuted, fontSize: 13 }, children: getScoreLabel(value) })] }), _jsxs("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 6 }, children: ["Updated ", new Date(score.calculatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), " · ", _jsxs("span", { style: { color: C.textMuted }, children: ["click to ", expanded ? "collapse" : "expand"] })] }), expanded && components && (_jsxs("div", { style: {
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: `1px solid ${C.border}`,
                }, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Component Scores" }), Object.entries(components).map(([k, v]) => v != null ? _jsx(ComponentBar, { label: k, value: Number(v) }, k) : null)] }))] }));
}
export function MarketGrid({ scores, regimeByMarket = {}, sparklineData = {} }) {
    const marketScores = scores.filter((s) => s.market !== "global");
    if (marketScores.length === 0) {
        return (_jsx("div", { style: { color: C.textMuted, fontSize: 13, padding: "20px 0" }, children: "No per-market data available" }));
    }
    return (_jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }, children: marketScores.map((score) => (_jsx(MarketCard, { score: score, regime: regimeByMarket[score.market], sparkline: sparklineData[score.market] }, score.market))) }));
}
