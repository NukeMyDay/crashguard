import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { C, Card, SectionTitle, SkeletonBlock } from "../context.js";
import { fetchJSON } from "../api.js";
function contributionColor(normalizedValue) {
    if (normalizedValue > 66)
        return C.red;
    if (normalizedValue >= 33)
        return C.amber;
    return C.green;
}
const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length)
        return null;
    const d = payload[0].payload;
    return (_jsxs("div", { style: {
            background: "#1a2235",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
        }, children: [_jsx("div", { style: { color: C.textPrimary, fontWeight: 600, marginBottom: 6 }, children: d.name }), _jsxs("div", { style: { color: C.textMuted, marginBottom: 2 }, children: ["Normalized: ", _jsx("span", { style: { color: contributionColor(d.normalizedValue), fontWeight: 600 }, children: d.normalizedValue.toFixed(1) })] }), _jsxs("div", { style: { color: C.textMuted, marginBottom: 2 }, children: ["Weight: ", _jsxs("span", { style: { color: C.textSecondary }, children: [(d.weight * 100).toFixed(1), "%"] })] }), _jsxs("div", { style: { color: C.textMuted }, children: ["Contribution: ", _jsx("span", { style: { color: C.textPrimary, fontWeight: 700 }, children: d.contribution.toFixed(2) })] })] }));
};
export function AttributionPanel() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const result = await fetchJSON("/dashboard/attribution");
                if (!cancelled) {
                    setData(result);
                    setError(null);
                }
            }
            catch (e) {
                if (!cancelled)
                    setError(String(e));
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        }
        load();
        const interval = setInterval(load, 60000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);
    if (loading)
        return _jsx(SkeletonBlock, { height: 220 });
    if (error || data.length === 0) {
        return (_jsxs(Card, { style: { padding: "20px 24px" }, children: [_jsx(SectionTitle, { info: "Which indicators are driving today's crash score, weighted by their relative importance.", children: "Performance Attribution" }), _jsx("div", { style: { color: C.textMuted, fontSize: 13, marginTop: 12 }, children: error ? "Attribution data unavailable" : "No indicator data yet" })] }));
    }
    // Show top 8 by contribution
    const chartData = data.slice(0, 8);
    return (_jsxs(Card, { style: { padding: "20px 24px" }, children: [_jsx(SectionTitle, { info: "Which indicators are driving today's crash score, weighted by their relative importance.", children: "Performance Attribution" }), _jsx("div", { style: { display: "flex", gap: 16, marginBottom: 16, marginTop: 4 }, children: [
                    { color: C.green, label: "Low risk (<33)" },
                    { color: C.amber, label: "Moderate (33–66)" },
                    { color: C.red, label: "High risk (>66)" },
                ].map(({ color, label }) => (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("div", { style: { width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 } }), _jsx("span", { style: { color: C.textMuted, fontSize: 11 }, children: label })] }, label))) }), _jsx(ResponsiveContainer, { width: "100%", height: 220, children: _jsxs(BarChart, { data: chartData, layout: "vertical", margin: { top: 0, right: 40, bottom: 0, left: 0 }, children: [_jsx(XAxis, { type: "number", domain: [0, "auto"], tick: { fill: C.textMuted, fontSize: 11 }, axisLine: { stroke: C.border }, tickLine: false, label: { value: "Contribution to crash score", fill: C.textMuted, fontSize: 10, position: "insideBottomRight", offset: -5 } }), _jsx(YAxis, { type: "category", dataKey: "name", width: 140, tick: { fill: C.textSecondary, fontSize: 11 }, axisLine: false, tickLine: false }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}), cursor: { fill: "#ffffff08" } }), _jsx(Bar, { dataKey: "contribution", radius: [0, 4, 4, 0], children: chartData.map((entry) => (_jsx(Cell, { fill: contributionColor(entry.normalizedValue) }, entry.slug))) })] }) })] }));
}
