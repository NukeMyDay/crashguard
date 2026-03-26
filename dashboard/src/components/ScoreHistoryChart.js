import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
const MARKET_COLORS = {
    global: "#6366f1",
    us: "#3b82f6",
    eu: "#8b5cf6",
    asia: "#06b6d4",
};
export function ScoreHistoryChart() {
    const [history, setHistory] = useState([]);
    useEffect(() => {
        fetch("/v1/score/history?market=global&days=7")
            .then((r) => r.json())
            .then(setHistory)
            .catch(console.error);
    }, []);
    const chartData = history
        .slice(0, 168)
        .reverse()
        .map((s) => ({
        time: new Date(s.calculatedAt).toLocaleDateString(),
        score: Number(s.crashScore),
    }));
    return (_jsx("div", { style: { background: "#0f172a", borderRadius: 10, padding: 20, border: "1px solid #1e293b" }, children: _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(LineChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1e293b" }), _jsx(XAxis, { dataKey: "time", stroke: "#475569", tick: { fontSize: 11 } }), _jsx(YAxis, { domain: [0, 100], stroke: "#475569", tick: { fontSize: 11 } }), _jsx(Tooltip, { contentStyle: { background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" } }), _jsx(ReferenceLine, { y: 75, stroke: "#ef4444", strokeDasharray: "4 2", label: { value: "Critical", fill: "#ef4444", fontSize: 11 } }), _jsx(ReferenceLine, { y: 50, stroke: "#f97316", strokeDasharray: "4 2", label: { value: "High", fill: "#f97316", fontSize: 11 } }), _jsx(Line, { type: "monotone", dataKey: "score", stroke: MARKET_COLORS.global, dot: false, strokeWidth: 2, name: "Crash Score" })] }) }) }));
}
