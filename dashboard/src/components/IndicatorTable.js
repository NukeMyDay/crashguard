import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { C, TH, TD, InfoIcon, Badge, getScoreColor, useExpertise } from "../context.js";
const CATEGORY_COLORS = {
    volatility: "#ef4444",
    sentiment: "#f59e0b",
    macro: "#3b82f6",
    credit: "#8b5cf6",
    market: "#10b981",
};
const INDICATOR_DESCRIPTIONS = {
    vix: "VIX measures market fear — how much traders expect prices to move. High VIX = high uncertainty.",
    "yield-curve-2y10y": "Yield curve spread (10Y minus 2Y Treasury). Negative = inverted yield curve, historically signals recession.",
    "credit-spreads-hy": "High yield credit spread — difference between junk bonds and Treasuries. Widens when investors fear defaults.",
    "put-call-ratio": "Ratio of put options to call options. High = bearish sentiment, traders betting on price drops.",
    "spx-breadth-200ma": "Percentage of S&P 500 stocks trading above their 200-day moving average. Low = broad weakness.",
    dxy: "US Dollar Index. Strong dollar often hurts risk assets like stocks and emerging markets.",
    "pmi-manufacturing": "PMI Manufacturing Index. Below 50 = contracting economy. Leading indicator for growth.",
    "consumer-confidence": "Consumer Confidence Index. High = people feel good about spending. Low = recession fears.",
    "m2-money-supply": "M2 money supply growth. Rapid expansion can fuel inflation and asset bubbles.",
    "fear-greed-index": "CNN Fear & Greed Index. Extreme fear = potential buy opportunity; extreme greed = caution.",
};
// Plain-English explanations for Beginner mode
const BEGINNER_WHY_MATTERS = {
    vix: "Measures fear in the market — the higher it is, the more scared investors are.",
    "yield-curve-2y10y": "When short-term rates exceed long-term rates, recession risk rises. It has predicted every US recession.",
    "credit-spreads-hy": "Shows how nervous lenders are about risky borrowers. Widening spreads = rising fear of defaults.",
    "put-call-ratio": "High value = traders are buying more 'insurance' against falling prices. A bearish signal.",
    "spx-breadth-200ma": "Fewer stocks trending up = weak market foundation, even if the index looks OK.",
    dxy: "A very strong dollar can hurt stocks and emerging markets by tightening global financial conditions.",
    "pmi-manufacturing": "Factory activity below 50 means the economy is shrinking — often leads to job losses.",
    "consumer-confidence": "When people feel financially insecure, they spend less. Less spending = slower economy.",
    "m2-money-supply": "Too much money growth can cause inflation and asset bubbles that eventually pop.",
    "fear-greed-index": "Extreme greed often precedes corrections. When everyone is confident, it's time to be careful.",
};
function RiskScoreBar({ value }) {
    const color = getScoreColor(value);
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: { width: 60, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }, children: _jsx("div", { style: {
                        width: `${Math.min(100, Math.max(0, value))}%`,
                        height: "100%",
                        background: color,
                        borderRadius: 2,
                    } }) }), _jsx("span", { style: { color, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 28 }, children: value.toFixed(0) })] }));
}
export function IndicatorTable({ indicators }) {
    const [sortCol, setSortCol] = useState("weight");
    const { isBeginner, isProfessional } = useExpertise();
    const sorted = [...indicators].sort((a, b) => {
        if (sortCol === "weight")
            return Number(b.weight) - Number(a.weight);
        const an = a.latestValue ? Number(a.latestValue.normalizedValue) : -1;
        const bn = b.latestValue ? Number(b.latestValue.normalizedValue) : -1;
        return bn - an;
    });
    // Professional: compact padding
    const tdStyle = isProfessional
        ? { ...TD, padding: "7px 10px", fontSize: 12 }
        : TD;
    const thStyle = isProfessional
        ? { ...TH, padding: "7px 10px", fontSize: 10 }
        : TH;
    function SortHeader({ col, children }) {
        const isActive = sortCol === col;
        return (_jsxs("th", { style: { ...thStyle, cursor: "pointer", userSelect: "none" }, onClick: () => setSortCol(col), children: [_jsx("span", { style: { color: isActive ? C.blue : undefined }, children: children }), isActive && _jsx("span", { style: { marginLeft: 4, color: C.blue }, children: "\u2193" })] }));
    }
    return (_jsx("div", { style: {
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
        }, children: _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: thStyle, children: "Indicator" }), !isProfessional && _jsx("th", { style: thStyle, children: "Category" }), isProfessional && _jsx("th", { style: thStyle, children: "Cat." }), !isProfessional && _jsx("th", { style: thStyle, children: "Source" }), _jsx(SortHeader, { col: "weight", children: "Weight" }), _jsx("th", { style: thStyle, children: "Raw Value" }), _jsxs(SortHeader, { col: "norm", children: ["Risk Score", " ", _jsx(InfoIcon, { text: "Normalized 0\u2013100 score. Higher = greater crash risk contribution from this indicator." })] }), isBeginner && _jsx("th", { style: thStyle, children: "Why it matters" })] }) }), _jsx("tbody", { children: sorted.map((ind) => {
                            const norm = ind.latestValue ? Number(ind.latestValue.normalizedValue) : null;
                            const raw = ind.latestValue ? Number(ind.latestValue.value) : null;
                            const catColor = CATEGORY_COLORS[ind.category] ?? C.textMuted;
                            const desc = INDICATOR_DESCRIPTIONS[ind.slug];
                            const whyMatters = BEGINNER_WHY_MATTERS[ind.slug];
                            return (_jsxs("tr", { children: [_jsx("td", { style: { ...tdStyle, color: C.textPrimary, fontWeight: 500 }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { children: ind.name }), desc && _jsx(InfoIcon, { text: desc })] }) }), _jsx("td", { style: tdStyle, children: _jsx(Badge, { label: isProfessional ? ind.category.slice(0, 3).toUpperCase() : ind.category, color: catColor, style: { fontSize: 10 } }) }), !isProfessional && (_jsx("td", { style: { ...tdStyle, color: C.textMuted, textTransform: "uppercase", fontSize: 11 }, children: ind.source })), _jsxs("td", { style: { ...tdStyle, fontVariantNumeric: "tabular-nums" }, children: [(Number(ind.weight) * 100).toFixed(0), "%"] }), _jsx("td", { style: { ...tdStyle, color: C.textSecondary, fontVariantNumeric: "tabular-nums" }, children: raw !== null
                                            ? isProfessional ? raw.toFixed(4) : raw.toFixed(2)
                                            : _jsx("span", { style: { color: C.textMuted }, children: "No data" }) }), _jsx("td", { style: tdStyle, children: norm !== null ? (_jsx(RiskScoreBar, { value: norm })) : (_jsx("span", { style: { color: C.textMuted, fontSize: 12 }, children: "Awaiting data" })) }), isBeginner && (_jsx("td", { style: { ...tdStyle, color: C.textSecondary, fontSize: 12, maxWidth: 260, lineHeight: 1.4 }, children: whyMatters ?? "—" }))] }, ind.id));
                        }) })] }) }) }));
}
