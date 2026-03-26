import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function getNormColor(v) {
    if (v >= 75)
        return "#ef4444";
    if (v >= 50)
        return "#f97316";
    if (v >= 25)
        return "#eab308";
    return "#22c55e";
}
const CATEGORY_LABELS = {
    volatility: "Volatility",
    sentiment: "Sentiment",
    macro: "Macro",
    credit: "Credit",
    market: "Market",
};
export function IndicatorTable({ indicators }) {
    const sorted = [...indicators].sort((a, b) => b.weight - a.weight);
    return (_jsx("div", { style: {
            background: "#0f172a",
            borderRadius: 10,
            border: "1px solid #1e293b",
            overflow: "hidden",
        }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsx("tr", { style: { background: "#1e293b" }, children: ["Indicator", "Category", "Source", "Weight", "Raw Value", "Risk Score"].map((h) => (_jsx("th", { style: {
                                padding: "10px 16px",
                                textAlign: "left",
                                color: "#64748b",
                                fontWeight: 600,
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }, children: h }, h))) }) }), _jsx("tbody", { children: sorted.map((ind, i) => {
                        const norm = ind.latestValue ? Number(ind.latestValue.normalizedValue) : null;
                        const raw = ind.latestValue ? Number(ind.latestValue.value) : null;
                        return (_jsxs("tr", { style: {
                                borderTop: i > 0 ? "1px solid #1e293b" : undefined,
                                background: i % 2 === 0 ? "transparent" : "#0a1120",
                            }, children: [_jsx("td", { style: { padding: "10px 16px", color: "#e2e8f0", fontWeight: 500 }, children: ind.name }), _jsx("td", { style: { padding: "10px 16px", color: "#94a3b8" }, children: CATEGORY_LABELS[ind.category] ?? ind.category }), _jsx("td", { style: { padding: "10px 16px", color: "#64748b", textTransform: "uppercase", fontSize: 11 }, children: ind.source }), _jsxs("td", { style: { padding: "10px 16px", color: "#94a3b8" }, children: [(Number(ind.weight) * 100).toFixed(0), "%"] }), _jsx("td", { style: { padding: "10px 16px", color: "#94a3b8" }, children: raw !== null ? raw.toFixed(2) : _jsx("span", { style: { color: "#334155" }, children: "\u2014" }) }), _jsx("td", { style: { padding: "10px 16px" }, children: norm !== null ? (_jsx("span", { style: {
                                            color: getNormColor(norm),
                                            fontWeight: 700,
                                            fontVariantNumeric: "tabular-nums",
                                        }, children: norm.toFixed(1) })) : (_jsx("span", { style: { color: "#334155" }, children: "\u2014" })) })] }, ind.id));
                    }) })] }) }));
}
