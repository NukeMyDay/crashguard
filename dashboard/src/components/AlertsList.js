import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { C } from "../context.js";
const SEVERITY_ICONS = {
    warning: "⚠️",
    critical: "🔴",
    extreme: "💥",
};
const SEVERITY_COLORS = {
    warning: "#f59e0b",
    critical: "#f97316",
    extreme: "#ef4444",
};
const MARKET_FLAGS = {
    us: "🇺🇸",
    eu: "🇪🇺",
    asia: "🇯🇵",
    global: "🌐",
};
export function AlertsList({ alerts }) {
    if (alerts.length === 0) {
        return (_jsxs("div", { style: {
                background: C.card,
                borderRadius: 12,
                border: `1px solid #10b98133`,
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: 10,
            }, children: [_jsx("span", { style: { fontSize: 16 }, children: "\u2705" }), _jsx("span", { style: { color: "#10b981", fontSize: 13 }, children: "No alerts triggered \u2014 markets within normal parameters" })] }));
    }
    return (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: alerts.slice(0, 10).map((alert) => {
            const color = SEVERITY_COLORS[alert.severity] ?? C.textMuted;
            const icon = SEVERITY_ICONS[alert.severity] ?? "⚡";
            const flag = MARKET_FLAGS[alert.market] ?? "🌐";
            return (_jsxs("div", { style: {
                    background: C.card,
                    borderRadius: 10,
                    padding: "12px 16px",
                    border: `1px solid ${color}44`,
                    borderLeft: `3px solid ${color}`,
                }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { style: { fontSize: 14 }, children: icon }), _jsx("span", { style: {
                                            color,
                                            fontWeight: 700,
                                            fontSize: 11,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                        }, children: alert.severity })] }), _jsxs("span", { style: { color: C.textMuted, fontSize: 12 }, children: [flag, " ", alert.market.toUpperCase()] })] }), _jsx("div", { style: { color: C.textSecondary, fontSize: 13, lineHeight: 1.4 }, children: alert.message }), _jsxs("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 5 }, children: [new Date(alert.triggeredAt).toLocaleString(), alert.crashScore != null && (_jsxs("span", { style: { marginLeft: 8, color }, children: ["Score: ", Number(alert.crashScore).toFixed(1)] }))] })] }, alert.id));
        }) }));
}
