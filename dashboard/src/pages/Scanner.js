import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { getScanner, getMomentum } from "../api.js";
import { C, Card, InfoIcon, EmptyState, ErrorBanner, SkeletonBlock, useExpertise, TH, TD, } from "../context.js";
const TABS = [
    {
        label: "Penny Stocks",
        type: "penny",
        description: 'Stocks under $5 with unusual volume spikes (>3x 30-day average). High risk, high reward.',
    },
    {
        label: "Oversold",
        type: "oversold",
        description: 'S&P 500 stocks with RSI below 30. Historically, 65% bounce within 2 weeks.',
    },
    {
        label: "Short Candidates",
        type: "short",
        description: "Stocks with RSI above 75 and declining relative strength. Candidates for put options or short selling.",
    },
    {
        label: "Options",
        type: "options",
        description: "High implied volatility situations suitable for options strategies.",
    },
];
function ScoreBar({ value, inverted = false }) {
    const pct = Math.min(100, Math.max(0, value));
    let color = C.green;
    if (inverted) {
        // For short candidates: high score = high risk
        if (pct >= 75)
            color = C.red;
        else if (pct >= 50)
            color = "#f97316";
        else if (pct >= 25)
            color = C.amber;
        else
            color = C.green;
    }
    else {
        if (pct >= 75)
            color = C.green;
        else if (pct >= 50)
            color = "#3b82f6";
        else if (pct >= 25)
            color = C.amber;
        else
            color = C.textMuted;
    }
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: {
                    width: 80,
                    height: 6,
                    background: "#1e293b",
                    borderRadius: 3,
                    overflow: "hidden",
                    flexShrink: 0,
                }, children: _jsx("div", { style: { width: `${pct}%`, height: "100%", background: color, borderRadius: 3 } }) }), _jsx("span", { style: { color, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }, children: pct.toFixed(0) })] }));
}
function getRsiColor(rsi, isShort) {
    if (isShort) {
        if (rsi > 70)
            return C.red;
        if (rsi >= 60)
            return "#f97316";
        return C.textMuted;
    }
    else {
        if (rsi < 30)
            return C.green;
        if (rsi <= 40)
            return C.amber;
        return C.textMuted;
    }
}
function TickerCell({ row }) {
    // CRITICAL: show the actual ticker symbol - check multiple field names
    const ticker = row.ticker ?? row.symbol ?? "N/A";
    const name = row.companyName ?? row.name;
    return (_jsxs("div", { children: [_jsx("div", { style: { color: C.textPrimary, fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }, children: ticker }), name && (_jsx("div", { style: { color: C.textMuted, fontSize: 11, marginTop: 2 }, children: name }))] }));
}
function PriceCell({ row }) {
    if (row.price == null)
        return _jsx("span", { style: { color: C.textMuted }, children: "\u2014" });
    const change = row.changePct ?? row.change;
    const isPos = change != null && change > 0;
    const isNeg = change != null && change < 0;
    return (_jsxs("div", { children: [_jsxs("div", { style: { color: C.textPrimary, fontSize: 13, fontVariantNumeric: "tabular-nums" }, children: ["$", Number(row.price).toFixed(2)] }), change != null && (_jsxs("div", { style: {
                    fontSize: 11,
                    color: isPos ? C.green : isNeg ? C.red : C.textMuted,
                    fontVariantNumeric: "tabular-nums",
                }, children: [isPos ? "+" : "", Number(change).toFixed(2), "%"] }))] }));
}
function ScanTable({ data, type, sortCol, onSort, }) {
    if (!data.length) {
        return (_jsx(EmptyState, { icon: "\uD83D\uDD0D", title: "No results found for this scan", subtitle: "Scanner runs hourly. Check back soon or try a different tab." }));
    }
    function SortHeader({ col, children }) {
        const isActive = sortCol === col;
        return (_jsxs("th", { style: { ...TH, cursor: "pointer", userSelect: "none" }, onClick: () => onSort(col), children: [_jsx("span", { style: { color: isActive ? C.blue : undefined }, children: children }), isActive && _jsx("span", { style: { marginLeft: 4, color: C.blue }, children: "\u2193" })] }));
    }
    if (type === "penny") {
        return (_jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: TH, children: "Ticker" }), _jsx(SortHeader, { col: "price", children: "Price" }), _jsx(SortHeader, { col: "volumeSpikePct", children: "Volume Spike" }), _jsx(SortHeader, { col: "score", children: "Score" }), _jsx("th", { style: TH, children: "Reasons" })] }) }), _jsx("tbody", { children: data.map((row) => (_jsxs("tr", { children: [_jsx("td", { style: TD, children: _jsx(TickerCell, { row: row }) }), _jsx("td", { style: TD, children: _jsx(PriceCell, { row: row }) }), _jsx("td", { style: { ...TD, color: "#6366f1", fontWeight: 600, fontVariantNumeric: "tabular-nums" }, children: row.volumeSpikePct != null ? `+${Number(row.volumeSpikePct).toFixed(1)}%` : "—" }), _jsx("td", { style: TD, children: _jsx(ScoreBar, { value: row.score ?? 0 }) }), _jsx("td", { style: { ...TD, color: C.textMuted, fontSize: 12, maxWidth: 240 }, children: row.reasons?.join(" · ") ?? "—" })] }, row.ticker ?? row.symbol))) })] }));
    }
    if (type === "oversold") {
        return (_jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: TH, children: "Ticker" }), _jsx(SortHeader, { col: "price", children: "Price" }), _jsxs(SortHeader, { col: "rsi", children: ["RSI ", _jsx(InfoIcon, { text: "Relative Strength Index measures if an asset is overbought (>70) or oversold (<30)" })] }), _jsx(SortHeader, { col: "score", children: "Score" }), _jsx("th", { style: TH, children: "Reasons" })] }) }), _jsx("tbody", { children: data.map((row) => {
                        const rsiColor = row.rsi != null ? getRsiColor(row.rsi, false) : C.textMuted;
                        return (_jsxs("tr", { children: [_jsx("td", { style: TD, children: _jsx(TickerCell, { row: row }) }), _jsx("td", { style: TD, children: _jsx(PriceCell, { row: row }) }), _jsx("td", { style: { ...TD, color: rsiColor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }, children: row.rsi != null ? Number(row.rsi).toFixed(1) : "—" }), _jsx("td", { style: TD, children: _jsx(ScoreBar, { value: row.score ?? 0 }) }), _jsx("td", { style: { ...TD, color: C.textMuted, fontSize: 12, maxWidth: 240 }, children: row.reasons?.join(" · ") ?? "—" })] }, row.ticker ?? row.symbol));
                    }) })] }));
    }
    if (type === "short") {
        return (_jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: TH, children: "Ticker" }), _jsx(SortHeader, { col: "price", children: "Price" }), _jsx(SortHeader, { col: "rsi", children: "RSI" }), _jsx(SortHeader, { col: "score", children: "Score" }), _jsx("th", { style: TH, children: "Reasons" })] }) }), _jsx("tbody", { children: data.map((row) => {
                        const rsiColor = row.rsi != null ? getRsiColor(row.rsi, true) : C.textMuted;
                        return (_jsxs("tr", { children: [_jsx("td", { style: TD, children: _jsx(TickerCell, { row: row }) }), _jsx("td", { style: TD, children: _jsx(PriceCell, { row: row }) }), _jsx("td", { style: { ...TD, color: rsiColor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }, children: row.rsi != null ? Number(row.rsi).toFixed(1) : "—" }), _jsx("td", { style: TD, children: _jsx(ScoreBar, { value: row.score ?? 0, inverted: true }) }), _jsx("td", { style: { ...TD, color: C.textMuted, fontSize: 12, maxWidth: 240 }, children: row.reasons?.join(" · ") ?? "—" })] }, row.ticker ?? row.symbol));
                    }) })] }));
    }
    // options
    return (_jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: TH, children: "Ticker" }), _jsx(SortHeader, { col: "price", children: "Price" }), _jsx(SortHeader, { col: "ivPct", children: "IV%" }), _jsx("th", { style: TH, children: "Type" }), _jsx("th", { style: TH, children: "Reasons" })] }) }), _jsx("tbody", { children: data.map((row) => {
                    const isPut = row.type?.toLowerCase().includes("put");
                    const typeColor = isPut ? C.red : C.green;
                    return (_jsxs("tr", { children: [_jsx("td", { style: TD, children: _jsx(TickerCell, { row: row }) }), _jsx("td", { style: TD, children: _jsx(PriceCell, { row: row }) }), _jsx("td", { style: { ...TD, color: "#8b5cf6", fontWeight: 600, fontVariantNumeric: "tabular-nums" }, children: row.ivPct != null ? `${Number(row.ivPct).toFixed(1)}%` : "—" }), _jsx("td", { style: TD, children: row.type ? (_jsx("span", { style: {
                                        color: typeColor,
                                        background: `${typeColor}1a`,
                                        border: `1px solid ${typeColor}44`,
                                        padding: "2px 8px",
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 700,
                                    }, children: isPut ? "PUT" : "CALL" })) : (_jsx("span", { style: { color: C.textMuted }, children: "\u2014" })) }), _jsx("td", { style: { ...TD, color: C.textMuted, fontSize: 12, maxWidth: 240 }, children: row.reasons?.join(" · ") ?? "—" })] }, row.ticker ?? row.symbol));
                }) })] }));
}
function sortData(data, col) {
    return [...data].sort((a, b) => {
        const av = a[col] ?? -Infinity;
        const bv = b[col] ?? -Infinity;
        return bv - av;
    });
}
function signalColor(signal) {
    const s = (signal ?? "").toLowerCase();
    if (s === "strong_buy")
        return "#16a34a";
    if (s === "buy")
        return "#22c55e";
    if (s === "neutral")
        return "#64748b";
    if (s === "reduce")
        return "#f59e0b";
    if (s === "avoid")
        return C.red;
    return C.textMuted;
}
function signalLabel(signal) {
    return (signal ?? "—").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function MomentumRanker() {
    const { isBeginner } = useExpertise();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState("composite");
    useEffect(() => {
        getMomentum(30)
            .then((d) => { setData(Array.isArray(d) ? d : []); setError(null); })
            .catch((e) => setError(String(e)))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return _jsx("div", { style: { padding: 20 }, children: _jsx(SkeletonBlock, { height: 300 }) });
    if (error)
        return _jsx(ErrorBanner, { message: `Failed to load momentum data: ${error}` });
    const sortKey = sortBy === "3m" ? "momentum3m" : sortBy === "6m" ? "momentum6m" : sortBy === "12m" ? "momentum12m" : "composite";
    const sorted = [...data].sort((a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity));
    const top3 = sorted.slice(0, 3).map((r) => r.ticker);
    const bottom3 = sorted.slice(-3).map((r) => r.ticker);
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 20 }, children: [isBeginner && (_jsxs("div", { style: { padding: "10px 14px", background: `${C.blue}0d`, border: `1px solid ${C.blue}22`, borderRadius: 8, fontSize: 12, color: C.textSecondary }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "Momentum investing:" }), " Stocks that have been rising tend to keep rising. This ranks assets by how strongly they've been trending upward."] })), top3.length > 0 && bottom3.length > 0 && (_jsx(Card, { style: { padding: "14px 18px", background: `${C.blue}0a`, border: `1px solid ${C.blue}22` }, children: _jsxs("div", { style: { fontSize: 12, color: C.textSecondary }, children: [_jsx("span", { style: { color: C.blue, fontWeight: 700 }, children: "Rotation Signal:" }), " ", "Consider rotating from", " ", _jsx("span", { style: { color: C.red, fontWeight: 600 }, children: bottom3.join(", ") }), " ", "into", " ", _jsx("span", { style: { color: C.green, fontWeight: 600 }, children: top3.join(", ") }), " ", "based on momentum."] }) })), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 12 }, children: "Sort by:" }), ["composite", "3m", "6m", "12m"].map((p) => (_jsx("button", { onClick: () => setSortBy(p), style: {
                            padding: "4px 12px",
                            borderRadius: 6,
                            border: `1px solid ${sortBy === p ? C.blue + "66" : C.border}`,
                            background: sortBy === p ? `${C.blue}18` : "transparent",
                            color: sortBy === p ? C.blue : C.textMuted,
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all 0.1s",
                            fontWeight: sortBy === p ? 600 : 400,
                        }, children: p === "composite" ? "Composite" : p.toUpperCase() }, p)))] }), sorted.length === 0 ? (_jsx(EmptyState, { icon: "\uD83D\uDCC8", title: "No momentum data", subtitle: "Momentum rankings will appear here once the data pipeline runs." })) : (_jsx("div", { style: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }, children: _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH, children: "Rank" }), _jsx("th", { style: TH, children: "Ticker" }), _jsx("th", { style: TH, children: "3M" }), _jsx("th", { style: TH, children: "6M" }), _jsx("th", { style: TH, children: "12M" }), _jsx("th", { style: TH, children: "Composite" }), _jsx("th", { style: TH, children: "Signal" })] }) }), _jsx("tbody", { children: sorted.map((row, i) => {
                                    const rank = i + 1;
                                    const isTop5 = rank <= 5;
                                    const isBottom5 = rank > sorted.length - 5;
                                    const rowBg = isTop5
                                        ? `${C.green}08`
                                        : isBottom5
                                            ? `${C.red}08`
                                            : i % 2 === 0 ? "transparent" : "#0a1120";
                                    const sc = signalColor(row.signal);
                                    const fmt = (v) => v != null ? `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%` : "—";
                                    return (_jsxs("tr", { style: { borderTop: i > 0 ? `1px solid ${C.border}` : undefined, background: rowBg }, children: [_jsx("td", { style: { ...TD, color: isTop5 ? C.green : isBottom5 ? C.red : C.textMuted, fontWeight: 700, width: 44, textAlign: "center" }, children: rank }), _jsxs("td", { style: { ...TD, color: C.textPrimary, fontWeight: 700, fontSize: 14 }, children: [row.ticker, row.name && _jsx("span", { style: { color: C.textMuted, fontSize: 11, fontWeight: 400, marginLeft: 6 }, children: row.name })] }), _jsx("td", { style: { ...TD, color: (row.momentum3m ?? 0) >= 0 ? C.green : C.red, fontVariantNumeric: "tabular-nums" }, children: fmt(row.momentum3m) }), _jsx("td", { style: { ...TD, color: (row.momentum6m ?? 0) >= 0 ? C.green : C.red, fontVariantNumeric: "tabular-nums" }, children: fmt(row.momentum6m) }), _jsx("td", { style: { ...TD, color: (row.momentum12m ?? 0) >= 0 ? C.green : C.red, fontVariantNumeric: "tabular-nums" }, children: fmt(row.momentum12m) }), _jsx("td", { style: { ...TD, color: (row.composite ?? 0) >= 0 ? C.green : C.red, fontWeight: 600, fontVariantNumeric: "tabular-nums" }, children: fmt(row.composite) }), _jsx("td", { style: TD, children: _jsx("span", { style: {
                                                        color: sc,
                                                        background: `${sc}1a`,
                                                        border: `1px solid ${sc}44`,
                                                        padding: "2px 8px",
                                                        borderRadius: 4,
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        whiteSpace: "nowrap",
                                                    }, children: signalLabel(row.signal) }) })] }, row.ticker));
                                }) })] }) }) }))] }));
}
export function Scanner() {
    const { isBeginner, isProfessional } = useExpertise();
    const [pageTab, setPageTab] = useState("scanner");
    const [activeTab, setActiveTab] = useState("penny");
    const [sortColMap, setSortColMap] = useState({
        penny: "score",
        oversold: "score",
        short: "score",
        options: "ivPct",
    });
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
        return () => { if (intervalRef.current)
            clearInterval(intervalRef.current); };
    }, [activeTab]);
    const currentTab = TABS.find((t) => t.type === activeTab);
    const rawData = dataMap[activeTab] ?? [];
    const sortCol = sortColMap[activeTab];
    const currentData = sortData(rawData, sortCol);
    const isLoading = loadingMap[activeTab];
    const currentError = errorMap[activeTab];
    function handleSort(col) {
        setSortColMap((prev) => ({ ...prev, [activeTab]: col }));
    }
    return (_jsxs("div", { style: { padding: 28 }, children: [_jsxs("div", { style: { marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }, children: [_jsxs("div", { children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }, children: "Market Scanner" }), _jsx("p", { style: { color: C.textMuted, marginTop: 5, fontSize: 13 }, children: "Screened opportunities \u2014 auto-refreshes every 60 seconds" })] }), _jsx("div", { style: { display: "flex", gap: 4, background: "#0f172a", border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }, children: ["scanner", "momentum"].map((t) => (_jsx("button", { onClick: () => setPageTab(t), style: {
                                padding: "7px 18px",
                                borderRadius: 7,
                                border: pageTab === t ? `1px solid ${C.blue}44` : "1px solid transparent",
                                background: pageTab === t ? `${C.blue}18` : "transparent",
                                color: pageTab === t ? C.blue : C.textMuted,
                                fontWeight: pageTab === t ? 600 : 400,
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }, children: t === "scanner" ? "Scanner" : "Momentum Ranker" }, t))) })] }), pageTab === "momentum" && _jsx(MomentumRanker, {}), pageTab === "scanner" && (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                            display: "flex",
                            gap: 4,
                            marginBottom: 20,
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            borderRadius: 12,
                            padding: 4,
                            width: "fit-content",
                            flexWrap: "wrap",
                        }, children: TABS.map((tab) => {
                            const isActive = activeTab === tab.type;
                            return (_jsx("button", { onClick: () => setActiveTab(tab.type), style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "7px 16px",
                                    borderRadius: 9,
                                    border: isActive ? `1px solid ${C.blue}44` : "1px solid transparent",
                                    background: isActive ? `${C.blue}1a` : "transparent",
                                    color: isActive ? C.blue : "#64748b",
                                    fontWeight: isActive ? 600 : 400,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    transition: "all 0.12s",
                                }, children: tab.label }, tab.type));
                        }) }), _jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 16,
                            color: C.textMuted,
                            fontSize: 13,
                        }, children: [_jsx("span", { children: currentTab.description }), _jsx(InfoIcon, { text: currentTab.description })] }), isBeginner && (_jsxs("div", { style: {
                            padding: "10px 14px",
                            background: `${C.blue}0d`,
                            border: `1px solid ${C.blue}22`,
                            borderRadius: 8,
                            fontSize: 12,
                            color: C.textSecondary,
                            marginBottom: 16,
                        }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "Click column headers to sort." }), " Scores show opportunity strength (0\u2013100).", " ", "RSI (overbought/oversold indicator) below 30 = potential bounce. RSI above 70 = potential drop.", " ", "Volume Spike means unusually high trading activity \u2014 often a sign of big news or moves."] })), _jsxs("div", { style: {
                            background: C.card,
                            borderRadius: 12,
                            border: `1px solid ${C.border}`,
                            overflow: "hidden",
                        }, children: [currentError && (_jsx(ErrorBanner, { message: `Failed to load scanner data: ${currentError}`, onRetry: () => loadTab(activeTab) })), isLoading && !rawData.length ? (_jsxs("div", { style: { padding: 20 }, children: [_jsx(SkeletonBlock, { height: 40 }), _jsx("div", { style: { marginTop: 8 }, children: [0, 1, 2, 3, 4].map((i) => (_jsx("div", { style: { height: 44, background: i % 2 === 0 ? "transparent" : "#0a1120", borderBottom: `1px solid ${C.border}` } }, i))) })] })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsx(ScanTable, { data: currentData, type: activeTab, sortCol: sortCol, onSort: handleSort }) }))] }), _jsxs("p", { style: { color: "#1e293b", fontSize: 12, marginTop: 12 }, children: [currentData.length, " result", currentData.length !== 1 ? "s" : "", " \u00B7 Sorted by ", sortCol] })] }))] }));
}
