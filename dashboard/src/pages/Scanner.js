import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { getScanner } from "../api.js";
const TABS = [
    { label: "Penny Stocks", type: "penny" },
    { label: "Oversold", type: "oversold" },
    { label: "Short Candidates", type: "short" },
    { label: "Options", type: "options" },
];
function ScoreBar({ value }) {
    const pct = Math.min(100, Math.max(0, value));
    let color = "#22c55e";
    if (pct >= 75)
        color = "#ef4444";
    else if (pct >= 50)
        color = "#f97316";
    else if (pct >= 25)
        color = "#eab308";
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: {
                    width: 80,
                    height: 6,
                    background: "#1e293b",
                    borderRadius: 3,
                    overflow: "hidden",
                    flexShrink: 0,
                }, children: _jsx("div", { style: { width: `${pct}%`, height: "100%", background: color, borderRadius: 3 } }) }), _jsx("span", { style: { color, fontSize: 12, fontWeight: 600 }, children: pct.toFixed(0) })] }));
}
function getRsiColor(rsi, isShort) {
    if (isShort) {
        if (rsi > 70)
            return "#ef4444";
        if (rsi >= 60)
            return "#f97316";
        return "#94a3b8";
    }
    else {
        if (rsi < 30)
            return "#22c55e";
        if (rsi <= 40)
            return "#eab308";
        return "#94a3b8";
    }
}
const TH = {
    padding: "10px 14px",
    textAlign: "left",
    color: "#64748b",
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
};
const TD = {
    padding: "10px 14px",
    color: "#94a3b8",
    fontSize: 13,
    verticalAlign: "middle",
};
function PennyTable({ data }) {
    if (!data.length)
        return _jsx(EmptyState, {});
    return (_jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH, children: "Ticker" }), _jsx("th", { style: { ...TH, minWidth: 140 }, children: "Score" }), _jsx("th", { style: TH, children: "Volume Spike %" }), _jsx("th", { style: TH, children: "Reasons" })] }) }), _jsx("tbody", { children: data.map((row, i) => (_jsxs("tr", { style: {
                        borderTop: i > 0 ? "1px solid #1e293b" : undefined,
                        background: i % 2 === 0 ? "transparent" : "#0a1120",
                    }, children: [_jsx("td", { style: { ...TD, color: "#e2e8f0", fontWeight: 600 }, children: row.ticker }), _jsx("td", { style: TD, children: _jsx(ScoreBar, { value: row.score ?? 0 }) }), _jsx("td", { style: { ...TD, color: "#6366f1" }, children: row.volumeSpikePct != null
                                ? `+${Number(row.volumeSpikePct).toFixed(1)}%`
                                : "—" }), _jsx("td", { style: { ...TD, color: "#64748b", fontSize: 12 }, children: row.reasons?.join(", ") ?? "—" })] }, row.ticker))) })] }));
}
function OversoldTable({ data }) {
    if (!data.length)
        return _jsx(EmptyState, {});
    return (_jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH, children: "Ticker" }), _jsx("th", { style: TH, children: "RSI" }), _jsx("th", { style: { ...TH, minWidth: 140 }, children: "Score" }), _jsx("th", { style: TH, children: "Reasons" })] }) }), _jsx("tbody", { children: data.map((row, i) => {
                    const rsiColor = row.rsi != null ? getRsiColor(row.rsi, false) : "#94a3b8";
                    return (_jsxs("tr", { style: {
                            borderTop: i > 0 ? "1px solid #1e293b" : undefined,
                            background: i % 2 === 0 ? "transparent" : "#0a1120",
                        }, children: [_jsx("td", { style: { ...TD, color: "#e2e8f0", fontWeight: 600 }, children: row.ticker }), _jsx("td", { style: { ...TD, color: rsiColor, fontWeight: 600 }, children: row.rsi != null ? Number(row.rsi).toFixed(1) : "—" }), _jsx("td", { style: TD, children: _jsx(ScoreBar, { value: row.score ?? 0 }) }), _jsx("td", { style: { ...TD, color: "#64748b", fontSize: 12 }, children: row.reasons?.join(", ") ?? "—" })] }, row.ticker));
                }) })] }));
}
function ShortTable({ data }) {
    if (!data.length)
        return _jsx(EmptyState, {});
    return (_jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH, children: "Ticker" }), _jsx("th", { style: TH, children: "RSI" }), _jsx("th", { style: { ...TH, minWidth: 140 }, children: "Score" }), _jsx("th", { style: TH, children: "Reasons" })] }) }), _jsx("tbody", { children: data.map((row, i) => {
                    const rsiColor = row.rsi != null ? getRsiColor(row.rsi, true) : "#94a3b8";
                    return (_jsxs("tr", { style: {
                            borderTop: i > 0 ? "1px solid #1e293b" : undefined,
                            background: i % 2 === 0 ? "transparent" : "#0a1120",
                        }, children: [_jsx("td", { style: { ...TD, color: "#e2e8f0", fontWeight: 600 }, children: row.ticker }), _jsx("td", { style: { ...TD, color: rsiColor, fontWeight: 600 }, children: row.rsi != null ? Number(row.rsi).toFixed(1) : "—" }), _jsx("td", { style: TD, children: _jsx(ScoreBar, { value: row.score ?? 0 }) }), _jsx("td", { style: { ...TD, color: "#64748b", fontSize: 12 }, children: row.reasons?.join(", ") ?? "—" })] }, row.ticker));
                }) })] }));
}
function OptionsTable({ data }) {
    if (!data.length)
        return _jsx(EmptyState, {});
    return (_jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH, children: "Ticker" }), _jsx("th", { style: TH, children: "IV %" }), _jsx("th", { style: TH, children: "Type" }), _jsx("th", { style: TH, children: "Reasons" })] }) }), _jsx("tbody", { children: data.map((row, i) => {
                    const isPut = row.type?.toLowerCase().includes("put");
                    const typeColor = isPut ? "#ef4444" : "#22c55e";
                    const typeLabel = isPut ? "PUT Opportunity" : "CALL Opportunity";
                    return (_jsxs("tr", { style: {
                            borderTop: i > 0 ? "1px solid #1e293b" : undefined,
                            background: i % 2 === 0 ? "transparent" : "#0a1120",
                        }, children: [_jsx("td", { style: { ...TD, color: "#e2e8f0", fontWeight: 600 }, children: row.ticker }), _jsx("td", { style: { ...TD, color: "#8b5cf6", fontWeight: 600 }, children: row.ivPct != null ? `${Number(row.ivPct).toFixed(1)}%` : "—" }), _jsx("td", { style: TD, children: row.type ? (_jsx("span", { style: {
                                        color: typeColor,
                                        background: `${typeColor}22`,
                                        border: `1px solid ${typeColor}44`,
                                        padding: "2px 8px",
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 700,
                                    }, children: typeLabel })) : (_jsx("span", { style: { color: "#475569" }, children: "\u2014" })) }), _jsx("td", { style: { ...TD, color: "#64748b", fontSize: 12 }, children: row.reasons?.join(", ") ?? "—" })] }, row.ticker));
                }) })] }));
}
function EmptyState() {
    return (_jsx("div", { style: { padding: "40px 20px", textAlign: "center", color: "#475569" }, children: _jsx("div", { style: { fontSize: 13 }, children: "No results found for this scan" }) }));
}
export function Scanner() {
    const [activeTab, setActiveTab] = useState("penny");
    const [dataMap, setDataMap] = useState({});
    const [loadingMap, setLoadingMap] = useState({});
    const [errorMap, setErrorMap] = useState({});
    const intervalRef = useRef(null);
    async function loadTab(type) {
        setLoadingMap((prev) => ({ ...prev, [type]: true }));
        try {
            const data = await getScanner(type);
            setDataMap((prev) => ({ ...prev, [type]: Array.isArray(data) ? data : [] }));
            setErrorMap((prev) => ({ ...prev, [type]: undefined }));
        }
        catch (e) {
            setErrorMap((prev) => ({ ...prev, [type]: String(e) }));
        }
        finally {
            setLoadingMap((prev) => ({ ...prev, [type]: false }));
        }
    }
    useEffect(() => {
        loadTab(activeTab);
        if (intervalRef.current)
            clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => loadTab(activeTab), 60000);
        return () => {
            if (intervalRef.current)
                clearInterval(intervalRef.current);
        };
    }, [activeTab]);
    const currentData = dataMap[activeTab] ?? [];
    const isLoading = loadingMap[activeTab];
    const currentError = errorMap[activeTab];
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: 0 }, children: "Market Scanner" }), _jsx("p", { style: { color: "#64748b", marginTop: 4, fontSize: 13 }, children: "Screened opportunities updated every 60 seconds" })] }), _jsx("div", { style: {
                    display: "flex",
                    gap: 4,
                    marginBottom: 20,
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                    padding: 4,
                    width: "fit-content",
                }, children: TABS.map((tab) => {
                    const isActive = activeTab === tab.type;
                    return (_jsx("button", { onClick: () => setActiveTab(tab.type), style: {
                            padding: "7px 18px",
                            borderRadius: 7,
                            border: isActive ? "1px solid #6366f133" : "1px solid transparent",
                            background: isActive ? "#6366f122" : "transparent",
                            color: isActive ? "#818cf8" : "#64748b",
                            fontWeight: isActive ? 600 : 400,
                            fontSize: 13,
                            cursor: "pointer",
                            transition: "all 0.15s",
                        }, children: tab.label }, tab.type));
                }) }), _jsxs("div", { style: {
                    background: "#0f172a",
                    borderRadius: 10,
                    border: "1px solid #1e293b",
                    overflow: "hidden",
                }, children: [isLoading && (_jsxs("div", { style: { padding: 40, textAlign: "center", color: "#64748b" }, children: ["Loading ", TABS.find((t) => t.type === activeTab)?.label, "..."] })), !isLoading && currentError && (_jsxs("div", { style: { padding: 24, color: "#f87171", fontSize: 13 }, children: ["Failed to load scanner data: ", currentError] })), !isLoading && !currentError && (_jsxs(_Fragment, { children: [activeTab === "penny" && _jsx(PennyTable, { data: currentData }), activeTab === "oversold" && _jsx(OversoldTable, { data: currentData }), activeTab === "short" && _jsx(ShortTable, { data: currentData }), activeTab === "options" && _jsx(OptionsTable, { data: currentData })] }))] }), _jsx("p", { style: { color: "#334155", fontSize: 12, marginTop: 12 }, children: "Auto-refreshes every 60 seconds" })] }));
}
