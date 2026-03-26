import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, } from "recharts";
import { C, getScoreColor } from "../context.js";
import { getMacroEvents } from "../api.js";
const EVENT_COLORS = {
    FOMC: "#3b82f6",
    CPI: "#f59e0b",
    JOBS: "#10b981",
};
function eventColor(type) {
    return EVENT_COLORS[type?.toUpperCase()] ?? "#94a3b8";
}
const RANGE_OPTIONS = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "1y", days: 365 },
    { label: "All", days: 730 },
];
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length)
        return null;
    const score = payload[0]?.value;
    const regime = payload[0]?.payload?.regime;
    return (_jsxs("div", { style: {
            background: "#1a2332",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }, children: [_jsx("div", { style: { color: C.textSecondary, marginBottom: 4 }, children: payload[0]?.payload?.date || label }), _jsx("div", { style: { color: getScoreColor(score), fontWeight: 700, fontSize: 16 }, children: score?.toFixed(1) }), regime && (_jsxs("div", { style: { color: C.textMuted, marginTop: 2 }, children: ["Regime: ", regime] }))] }));
}
export function ScoreHistoryChart({ market = "global", initialDays = 30 }) {
    const [history, setHistory] = useState([]);
    const [days, setDays] = useState(initialDays);
    const [loading, setLoading] = useState(true);
    const [macroEvents, setMacroEvents] = useState([]);
    useEffect(() => {
        setLoading(true);
        fetch(`/v1/score/history?market=${encodeURIComponent(market)}&days=${days}`)
            .then((r) => r.json())
            .then((data) => {
            const points = [...data]
                .sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime())
                .map((s) => {
                const d = new Date(s.calculatedAt);
                return {
                    time: d.toLocaleDateString([], { month: "short", day: "numeric" }),
                    date: d.toLocaleString(),
                    isoDate: s.calculatedAt,
                    score: Number(s.crashScore),
                    regime: s.regime,
                };
            });
            setHistory(points);
        })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [market, days]);
    useEffect(() => {
        getMacroEvents(Math.max(days, 90)).then(setMacroEvents).catch(() => setMacroEvents([]));
    }, [days]);
    // Gradient color based on score
    const lastScore = history.length > 0 ? history[history.length - 1].score : 50;
    const gradColor = getScoreColor(lastScore);
    // Map macro events to chart x-axis values
    const eventLines = macroEvents
        .map((ev) => {
        const evMs = new Date(ev.date).getTime();
        let best = null;
        let bestDiff = Infinity;
        for (const p of history) {
            const diff = Math.abs(new Date(p.isoDate).getTime() - evMs);
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
    return (_jsxs("div", { style: {
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            padding: "18px 20px",
        }, children: [_jsx("div", { style: { display: "flex", justifyContent: "flex-end", gap: 4, marginBottom: 16 }, children: RANGE_OPTIONS.map((opt) => (_jsx("button", { onClick: () => setDays(opt.days), style: {
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: `1px solid ${days === opt.days ? C.blue + "66" : "transparent"}`,
                        background: days === opt.days ? C.blue + "22" : "transparent",
                        color: days === opt.days ? C.blue : C.textMuted,
                        fontSize: 12,
                        fontWeight: days === opt.days ? 600 : 400,
                        cursor: "pointer",
                        transition: "all 0.12s",
                    }, children: opt.label }, opt.label))) }), loading ? (_jsx("div", { className: "skeleton", style: { width: "100%", height: 280, borderRadius: 8 } })) : history.length === 0 ? (_jsx("div", { style: { height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }, children: "No score history available" })) : (_jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(AreaChart, { data: history, margin: { top: 10, right: 10, bottom: 0, left: -10 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "scoreGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: gradColor, stopOpacity: 0.3 }), _jsx("stop", { offset: "95%", stopColor: gradColor, stopOpacity: 0.02 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1a2436", vertical: false }), _jsx(XAxis, { dataKey: "time", stroke: "#2a3a50", tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, interval: "preserveStartEnd" }), _jsx(YAxis, { domain: [0, 100], stroke: "#2a3a50", tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, width: 28 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(ReferenceLine, { y: 75, stroke: "#ef444488", strokeDasharray: "5 3", label: { value: "Critical", fill: "#ef4444", fontSize: 10, position: "insideTopLeft" } }), _jsx(ReferenceLine, { y: 50, stroke: "#f59e0b88", strokeDasharray: "5 3", label: { value: "High", fill: "#f59e0b", fontSize: 10, position: "insideTopLeft" } }), eventLines.map((ev, i) => {
                            const color = eventColor(ev.type);
                            return (_jsx(ReferenceLine, { x: ev.xVal, stroke: color + "99", strokeDasharray: "4 3", label: { value: ev.type?.toUpperCase() ?? "", fill: color, fontSize: 9, position: "insideTopLeft" } }, i));
                        }), _jsx(Area, { type: "monotone", dataKey: "score", stroke: gradColor, strokeWidth: 2, fill: "url(#scoreGradient)", dot: false, activeDot: { r: 4, fill: gradColor, strokeWidth: 0 } })] }) }))] }));
}
