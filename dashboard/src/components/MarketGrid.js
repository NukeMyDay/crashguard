import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function getColor(score) {
    if (score >= 75)
        return "#ef4444";
    if (score >= 50)
        return "#f97316";
    if (score >= 25)
        return "#eab308";
    return "#22c55e";
}
const MARKET_LABELS = {
    us: "🇺🇸 US Markets",
    eu: "🇪🇺 EU Markets",
    asia: "🌏 Asian Markets",
    global: "🌐 Global",
};
export function MarketGrid({ scores }) {
    const marketScores = scores.filter((s) => s.market !== "global");
    return (_jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }, children: marketScores.map((score) => {
            const value = Number(score.crashScore);
            const color = getColor(value);
            return (_jsxs("div", { style: {
                    background: "#0f172a",
                    borderRadius: 10,
                    padding: 20,
                    border: `1px solid ${color}33`,
                }, children: [_jsx("div", { style: { color: "#94a3b8", fontSize: 14, marginBottom: 8 }, children: MARKET_LABELS[score.market] || score.market }), _jsx("div", { style: { fontSize: 36, fontWeight: 700, color }, children: value.toFixed(1) }), _jsxs("div", { style: { color: "#475569", fontSize: 12, marginTop: 4 }, children: ["Updated ", new Date(score.calculatedAt).toLocaleTimeString()] })] }, score.market));
        }) }));
}
