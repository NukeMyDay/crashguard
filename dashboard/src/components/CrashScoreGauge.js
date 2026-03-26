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
function getLabel(score) {
    if (score >= 90)
        return "EXTREME";
    if (score >= 75)
        return "CRITICAL";
    if (score >= 50)
        return "HIGH";
    if (score >= 25)
        return "MODERATE";
    return "LOW";
}
export function CrashScoreGauge({ score }) {
    const color = getColor(score);
    const label = getLabel(score);
    return (_jsxs("div", { style: {
            display: "flex",
            alignItems: "center",
            gap: 24,
            background: "#0f172a",
            borderRadius: 12,
            padding: "24px 32px",
            border: `1px solid ${color}33`,
        }, children: [_jsxs("div", { style: {
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    border: `6px solid ${color}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${color}11`,
                }, children: [_jsx("span", { style: { fontSize: 32, fontWeight: 700, color }, children: score.toFixed(0) }), _jsx("span", { style: { fontSize: 11, color: "#64748b" }, children: "/ 100" })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 24, fontWeight: 700, color }, children: label }), _jsx("div", { style: { color: "#64748b", marginTop: 4 }, children: "Crash Probability" })] })] }));
}
