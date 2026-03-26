import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const SEVERITY_COLORS = {
    warning: "#eab308",
    critical: "#f97316",
    extreme: "#ef4444",
};
export function AlertsList({ alerts }) {
    if (alerts.length === 0) {
        return (_jsx("div", { style: {
                background: "#0f172a",
                borderRadius: 10,
                padding: 20,
                color: "#22c55e",
                border: "1px solid #22c55e33",
            }, children: "No active alerts" }));
    }
    return (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: alerts.slice(0, 10).map((alert) => {
            const color = SEVERITY_COLORS[alert.severity] || "#94a3b8";
            return (_jsxs("div", { style: {
                    background: "#0f172a",
                    borderRadius: 8,
                    padding: "12px 16px",
                    border: `1px solid ${color}44`,
                }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { color, fontWeight: 600, fontSize: 12, textTransform: "uppercase" }, children: alert.severity }), _jsx("span", { style: { color: "#475569", fontSize: 12 }, children: alert.market.toUpperCase() })] }), _jsx("div", { style: { color: "#cbd5e1", fontSize: 13 }, children: alert.message }), _jsx("div", { style: { color: "#475569", fontSize: 11, marginTop: 4 }, children: new Date(alert.triggeredAt).toLocaleString() })] }, alert.id));
        }) }));
}
