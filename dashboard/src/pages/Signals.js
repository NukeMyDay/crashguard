import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getSignals } from "../api.js";
const ACTION_COLORS = {
    BUY: "#22c55e",
    SELL: "#f97316",
    SHORT: "#ef4444",
};
function ConfidenceBar({ value }) {
    const pct = Math.min(100, Math.max(0, value));
    let color = "#22c55e";
    if (pct < 40)
        color = "#ef4444";
    else if (pct < 65)
        color = "#eab308";
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: {
                    flex: 1,
                    height: 6,
                    background: "#1e293b",
                    borderRadius: 3,
                    overflow: "hidden",
                    minWidth: 80,
                }, children: _jsx("div", { style: {
                        width: `${pct}%`,
                        height: "100%",
                        background: color,
                        borderRadius: 3,
                        transition: "width 0.3s ease",
                    } }) }), _jsxs("span", { style: { color, fontSize: 12, fontWeight: 600, width: 32, textAlign: "right" }, children: [pct.toFixed(0), "%"] })] }));
}
function getAge(createdAt) {
    if (!createdAt)
        return "—";
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)
        return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}
export function Signals() {
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    async function load() {
        try {
            const data = await getSignals();
            setSignals(Array.isArray(data) ? data : []);
            setError(null);
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, []);
    const COL_STYLE = {
        padding: "11px 14px",
        color: "#94a3b8",
        fontSize: 13,
        verticalAlign: "middle",
    };
    const TH_STYLE = {
        padding: "10px 14px",
        textAlign: "left",
        color: "#64748b",
        fontWeight: 600,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
    };
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: 0 }, children: "Active Signals" }), _jsx("p", { style: { color: "#64748b", marginTop: 4, fontSize: 13 }, children: "Live trade signals \u2014 click a row to expand reasoning" })] }), loading && (_jsx("p", { style: { color: "#64748b" }, children: "Loading signals..." })), error && (_jsxs("div", { style: {
                    background: "#0f172a",
                    border: "1px solid #ef444433",
                    borderRadius: 10,
                    padding: 20,
                    color: "#f87171",
                }, children: ["Failed to load signals: ", error] })), !loading && !error && signals.length === 0 && (_jsxs("div", { style: {
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                    padding: 40,
                    textAlign: "center",
                    color: "#475569",
                }, children: [_jsx("div", { style: { fontSize: 36, marginBottom: 12 }, children: "\uD83D\uDCC8" }), _jsx("div", { style: { fontSize: 15 }, children: "No active signals" }), _jsx("div", { style: { fontSize: 13, marginTop: 6 }, children: "Signals will appear here when market conditions trigger them" })] })), !loading && signals.length > 0 && (_jsx("div", { style: {
                    background: "#0f172a",
                    borderRadius: 10,
                    border: "1px solid #1e293b",
                    overflow: "hidden",
                }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH_STYLE, children: "Instrument" }), _jsx("th", { style: TH_STYLE, children: "Action" }), _jsx("th", { style: TH_STYLE, children: "Strategy" }), _jsx("th", { style: { ...TH_STYLE, minWidth: 140 }, children: "Confidence" }), _jsx("th", { style: TH_STYLE, children: "Entry" }), _jsx("th", { style: TH_STYLE, children: "Stop Loss" }), _jsx("th", { style: TH_STYLE, children: "Target" }), _jsx("th", { style: TH_STYLE, children: "R/R" }), _jsx("th", { style: TH_STYLE, children: "Timeframe" }), _jsx("th", { style: TH_STYLE, children: "Age" })] }) }), _jsx("tbody", { children: signals.map((sig, i) => {
                                const actionColor = ACTION_COLORS[sig.action?.toUpperCase()] ?? "#94a3b8";
                                const isExpanded = expandedId === sig.id;
                                return (_jsxs(_Fragment, { children: [_jsxs("tr", { onClick: () => setExpandedId(isExpanded ? null : sig.id), style: {
                                                borderTop: i > 0 ? "1px solid #1e293b" : undefined,
                                                background: isExpanded
                                                    ? "#13203a"
                                                    : i % 2 === 0
                                                        ? "transparent"
                                                        : "#0a1120",
                                                cursor: "pointer",
                                                transition: "background 0.15s",
                                            }, onMouseEnter: (e) => {
                                                if (!isExpanded)
                                                    e.currentTarget.style.background = "#111827";
                                            }, onMouseLeave: (e) => {
                                                if (!isExpanded)
                                                    e.currentTarget.style.background =
                                                        i % 2 === 0 ? "transparent" : "#0a1120";
                                            }, children: [_jsx("td", { style: { ...COL_STYLE, color: "#e2e8f0", fontWeight: 600 }, children: sig.instrument ?? "—" }), _jsx("td", { style: COL_STYLE, children: _jsx("span", { style: {
                                                            color: actionColor,
                                                            fontWeight: 700,
                                                            background: `${actionColor}22`,
                                                            border: `1px solid ${actionColor}44`,
                                                            padding: "2px 8px",
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            letterSpacing: "0.04em",
                                                        }, children: sig.action?.toUpperCase() ?? "—" }) }), _jsx("td", { style: { ...COL_STYLE, color: "#94a3b8" }, children: sig.strategy ?? "—" }), _jsx("td", { style: COL_STYLE, children: _jsx(ConfidenceBar, { value: sig.confidence ?? 0 }) }), _jsx("td", { style: { ...COL_STYLE, fontVariantNumeric: "tabular-nums" }, children: sig.entry != null ? Number(sig.entry).toFixed(2) : "—" }), _jsx("td", { style: { ...COL_STYLE, color: "#ef4444", fontVariantNumeric: "tabular-nums" }, children: sig.stopLoss != null ? Number(sig.stopLoss).toFixed(2) : "—" }), _jsx("td", { style: { ...COL_STYLE, color: "#22c55e", fontVariantNumeric: "tabular-nums" }, children: sig.target != null ? Number(sig.target).toFixed(2) : "—" }), _jsx("td", { style: { ...COL_STYLE, fontVariantNumeric: "tabular-nums" }, children: sig.rrRatio != null ? `${Number(sig.rrRatio).toFixed(1)}x` : "—" }), _jsx("td", { style: COL_STYLE, children: sig.timeframe ?? "—" }), _jsx("td", { style: { ...COL_STYLE, color: "#64748b" }, children: getAge(sig.createdAt) })] }, sig.id), isExpanded && (_jsx("tr", { style: { background: "#0d1b2e" }, children: _jsxs("td", { colSpan: 10, style: {
                                                    padding: "14px 18px",
                                                    borderTop: "1px solid #1e293b",
                                                    borderBottom: "1px solid #1e293b",
                                                }, children: [_jsx("div", { style: {
                                                            color: "#64748b",
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            textTransform: "uppercase",
                                                            letterSpacing: "0.05em",
                                                            marginBottom: 6,
                                                        }, children: "Signal Reasoning" }), _jsx("div", { style: { color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }, children: sig.reason ?? "No reasoning provided." })] }) }, `${sig.id}-expanded`))] }));
                            }) })] }) }))] }));
}
