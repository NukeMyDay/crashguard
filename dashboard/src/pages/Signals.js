import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, } from "recharts";
import { getSignals, getAlerts, getSignalAccuracy } from "../api.js";
import { C, Card, EmptyState, ErrorBanner, SkeletonBlock, Badge, useExpertise, SectionTitle, TH, TD, } from "../context.js";
function getDirectionLabel(action) {
    const a = action?.toUpperCase() ?? "";
    if (a === "BUY" || a === "LONG")
        return { label: "LONG", color: C.green };
    if (a === "SHORT" || a === "SELL")
        return { label: "SHORT", color: C.red };
    return { label: a, color: C.textMuted };
}
function getAge(ts) {
    if (!ts)
        return "—";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
function getExpiry(ts) {
    if (!ts)
        return { label: "—", color: C.textMuted };
    const diff = new Date(ts).getTime() - Date.now();
    if (diff < 0)
        return { label: "Expired", color: C.red };
    const mins = Math.floor(diff / 60000);
    if (mins < 60)
        return { label: `${mins}m`, color: C.amber };
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return { label: `${hrs}h`, color: C.textSecondary };
    return { label: `${Math.floor(hrs / 24)}d`, color: C.textMuted };
}
function ConfidenceMeter({ value }) {
    const pct = Math.min(100, Math.max(0, value));
    let color = C.green;
    if (pct < 40)
        color = C.red;
    else if (pct < 60)
        color = C.amber;
    else if (pct < 75)
        color = "#3b82f6";
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Confidence" }), _jsx("span", { style: { color, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }, children: pct.toFixed(0) })] }), _jsx("div", { style: { width: "100%", height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }, children: _jsx("div", { style: { width: `${pct}%`, height: "100%", background: color, borderRadius: 2 } }) })] }));
}
function PnLBadge({ signal }) {
    const entry = signal.entry ?? signal.entryPrice;
    const current = signal.currentPrice;
    if (!entry || !current)
        return null;
    const isShort = (signal.action?.toUpperCase() === "SHORT" || signal.action?.toUpperCase() === "SELL");
    const pnlPct = isShort ? ((entry - current) / entry) * 100 : ((current - entry) / entry) * 100;
    const color = pnlPct >= 0 ? C.green : C.red;
    return (_jsxs("span", { style: { color, fontWeight: 700, fontSize: 12, fontFamily: "monospace" }, children: [pnlPct >= 0 ? "+" : "", pnlPct.toFixed(2), "%"] }));
}
function StatusDot({ status }) {
    const s = status?.toLowerCase() ?? "active";
    let color = C.blue;
    let pulse = false;
    if (s === "triggered" || s === "filled") {
        color = C.green;
        pulse = true;
    }
    else if (s === "expired" || s === "cancelled")
        color = C.textMuted;
    else if (s === "active") {
        color = C.green;
        pulse = true;
    }
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("div", { style: {
                    width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0,
                    boxShadow: pulse ? `0 0 6px ${color}88` : "none",
                } }), _jsx("span", { style: { color: C.textMuted, fontSize: 11, textTransform: "capitalize" }, children: s })] }));
}
function SignalCard({ signal }) {
    const [expanded, setExpanded] = useState(false);
    const { isBeginner, isProfessional } = useExpertise();
    const direction = getDirectionLabel(signal.action ?? "");
    const entry = signal.entry ?? signal.entryPrice;
    const generated = signal.createdAt ?? signal.generatedAt;
    const expiry = getExpiry(signal.expiresAt);
    const confidence = signal.confidence ?? signal.strength ?? 0;
    const riskFactors = signal.riskFactors ?? signal.relatedIndicators ?? [];
    const isExpired = signal.status?.toLowerCase() === "expired";
    return (_jsxs("div", { style: {
            background: C.card,
            border: `1px solid ${expanded ? C.blue + "44" : C.border}`,
            borderLeft: `3px solid ${direction.color}`,
            borderRadius: 10,
            overflow: "hidden",
            opacity: isExpired ? 0.55 : 1,
            transition: "border-color 0.15s",
        }, children: [_jsxs("div", { onClick: () => setExpanded(!expanded), style: { padding: "14px 18px", cursor: "pointer", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "12px 20px", alignItems: "start" }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6, minWidth: 110 }, children: [_jsx("span", { style: {
                                    color: direction.color,
                                    background: `${direction.color}1a`,
                                    border: `1px solid ${direction.color}44`,
                                    padding: "3px 10px",
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    letterSpacing: "0.04em",
                                    textAlign: "center",
                                    display: "inline-block",
                                }, children: direction.label }), _jsx("span", { style: { color: C.textPrimary, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }, children: signal.instrument ?? "—" }), _jsx(StatusDot, { status: signal.status })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [_jsxs("div", { style: { display: "flex", gap: 16, flexWrap: "wrap" }, children: [entry != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, marginBottom: 2 }, children: "ENTRY" }), _jsxs("div", { style: { color: C.textPrimary, fontFamily: "monospace", fontSize: 13, fontWeight: 600 }, children: ["$", Number(entry).toFixed(2)] })] })), signal.stopLoss != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, marginBottom: 2 }, children: "STOP" }), _jsxs("div", { style: { color: C.red, fontFamily: "monospace", fontSize: 13, fontWeight: 600 }, children: ["$", Number(signal.stopLoss).toFixed(2)] })] })), signal.target != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, marginBottom: 2 }, children: "TARGET" }), _jsxs("div", { style: { color: C.green, fontFamily: "monospace", fontSize: 13, fontWeight: 600 }, children: ["$", Number(signal.target).toFixed(2)] })] })), signal.rrRatio != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, marginBottom: 2 }, children: "R/R" }), _jsxs("div", { style: {
                                                    color: "#6366f1",
                                                    fontFamily: "monospace",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    background: "#6366f122",
                                                    border: "1px solid #6366f144",
                                                    padding: "1px 6px",
                                                    borderRadius: 4,
                                                    display: "inline-block",
                                                }, children: [Number(signal.rrRatio).toFixed(1), ":1"] })] })), signal.currentPrice != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, marginBottom: 2 }, children: "CURRENT" }), _jsxs("div", { style: { color: C.textSecondary, fontFamily: "monospace", fontSize: 13 }, children: ["$", Number(signal.currentPrice).toFixed(2)] })] })), signal.currentPrice != null && entry != null && (_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, marginBottom: 2 }, children: "P&L" }), _jsx(PnLBadge, { signal: signal })] }))] }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [signal.strategy && (_jsx("span", { style: { color: C.textMuted, fontSize: 12 }, children: signal.strategy })), signal.strategyType && (_jsx(Badge, { label: signal.strategyType, color: "#6366f1", style: { fontSize: 10 } })), signal.timeframe && (_jsx("span", { style: { color: "#2a3a50", fontSize: 10, fontFamily: "monospace" }, children: signal.timeframe }))] }), _jsx("div", { style: { maxWidth: 200 }, children: _jsx(ConfidenceMeter, { value: confidence }) }), signal.positionSize != null && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 11 }, children: "Position size:" }), _jsxs("span", { style: {
                                            color: C.amber,
                                            fontFamily: "monospace",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            background: `${C.amber}18`,
                                            border: `1px solid ${C.amber}44`,
                                            padding: "1px 6px",
                                            borderRadius: 4,
                                        }, children: [Number(signal.positionSize).toFixed(1), "%"] }), _jsx("span", { style: { color: C.textMuted, fontSize: 11 }, children: "of portfolio" })] }))] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", minWidth: 80 }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 11 }, children: getAge(generated) }), _jsxs("div", { style: { textAlign: "right" }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10 }, children: "Expires" }), _jsx("div", { style: { color: expiry.color, fontSize: 11, fontFamily: "monospace" }, children: expiry.label })] }), _jsx("span", { style: {
                                    color: C.textMuted, fontSize: 11,
                                    background: "#1e293b",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                }, children: expanded ? "▲" : "▼" })] })] }), riskFactors.length > 0 && (_jsx("div", { style: { padding: "0 18px 12px", display: "flex", flexWrap: "wrap", gap: 4 }, children: riskFactors.map((rf) => (_jsxs("span", { style: {
                        background: `${C.amber}18`,
                        border: `1px solid ${C.amber}44`,
                        color: C.amber,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                    }, children: ["\u26A0 ", rf] }, rf))) })), expanded && (_jsxs("div", { style: {
                    padding: "14px 18px",
                    borderTop: `1px solid ${C.border}`,
                    background: "#090f1a",
                }, children: [(signal.reason ?? signal.rationale) && (_jsxs("div", { style: { marginBottom: 14 }, children: [_jsx("div", { style: { color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }, children: "Signal Rationale" }), _jsx("p", { style: { color: C.textSecondary, fontSize: 13, lineHeight: 1.7, margin: 0 }, children: signal.reason ?? signal.rationale })] })), isBeginner && (_jsxs("div", { style: {
                            padding: "10px 14px",
                            background: `${C.blue}0d`,
                            border: `1px solid ${C.blue}22`,
                            borderRadius: 8,
                            fontSize: 12,
                            color: C.textSecondary,
                        }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "Beginner tip:" }), " R/R ratio = Risk/Reward. A 2.5:1 means you risk $1 to potentially earn $2.50. Confidence (0\u2013100) reflects how strongly the strategy conditions are met. Higher is better."] }))] }))] }));
}
function filterAndSortSignals(signals, direction, strategyType, minConfidence, sortField) {
    let result = [...signals];
    if (direction === "long")
        result = result.filter((s) => ["BUY", "LONG"].includes(s.action?.toUpperCase() ?? ""));
    if (direction === "short")
        result = result.filter((s) => ["SELL", "SHORT"].includes(s.action?.toUpperCase() ?? ""));
    if (strategyType !== "all") {
        result = result.filter((s) => (s.strategyType ?? s.strategy ?? "").toUpperCase() === strategyType.toUpperCase());
    }
    result = result.filter((s) => (s.confidence ?? s.strength ?? 0) >= minConfidence);
    result.sort((a, b) => {
        if (sortField === "strength")
            return (b.strength ?? b.confidence ?? 0) - (a.strength ?? a.confidence ?? 0);
        if (sortField === "confidence")
            return (b.confidence ?? b.strength ?? 0) - (a.confidence ?? a.strength ?? 0);
        if (sortField === "recency") {
            const ta = new Date(a.createdAt ?? a.generatedAt ?? 0).getTime();
            const tb = new Date(b.createdAt ?? b.generatedAt ?? 0).getTime();
            return tb - ta;
        }
        return 0;
    });
    return result;
}
// Professional mode: sortable table view of signals
function ProSignalsTable({ signals }) {
    const [sortCol, setSortCol] = useState("confidence");
    const [sortAsc, setSortAsc] = useState(false);
    function handleSort(col) {
        if (sortCol === col)
            setSortAsc((v) => !v);
        else {
            setSortCol(col);
            setSortAsc(false);
        }
    }
    const sorted = [...signals].sort((a, b) => {
        let av, bv;
        if (sortCol === "confidence") {
            av = a.confidence ?? a.strength ?? 0;
            bv = b.confidence ?? b.strength ?? 0;
        }
        else if (sortCol === "instrument") {
            av = a.instrument ?? "";
            bv = b.instrument ?? "";
        }
        else if (sortCol === "action") {
            av = a.action ?? "";
            bv = b.action ?? "";
        }
        else if (sortCol === "rrRatio") {
            av = a.rrRatio ?? 0;
            bv = b.rrRatio ?? 0;
        }
        else {
            av = new Date(a.expiresAt ?? 0).getTime();
            bv = new Date(b.expiresAt ?? 0).getTime();
        }
        if (av < bv)
            return sortAsc ? -1 : 1;
        if (av > bv)
            return sortAsc ? 1 : -1;
        return 0;
    });
    function SortTH({ col, children }) {
        const active = sortCol === col;
        return (_jsxs("th", { style: { ...TH, cursor: "pointer", userSelect: "none", padding: "7px 10px", fontSize: 10 }, onClick: () => handleSort(col), children: [_jsx("span", { style: { color: active ? C.blue : undefined }, children: children }), active && _jsx("span", { style: { marginLeft: 3, color: C.blue }, children: sortAsc ? "↑" : "↓" })] }));
    }
    const compactTD = { ...TD, padding: "6px 10px", fontSize: 12 };
    return (_jsx("div", { style: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }, children: _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx(SortTH, { col: "instrument", children: "Ticker" }), _jsx(SortTH, { col: "action", children: "Dir." }), _jsx("th", { style: { ...TH, padding: "7px 10px", fontSize: 10 }, children: "Entry" }), _jsx("th", { style: { ...TH, padding: "7px 10px", fontSize: 10 }, children: "Stop" }), _jsx("th", { style: { ...TH, padding: "7px 10px", fontSize: 10 }, children: "Target" }), _jsx(SortTH, { col: "rrRatio", children: "R/R" }), _jsx(SortTH, { col: "confidence", children: "Conf." }), _jsx(SortTH, { col: "expiry", children: "Expires" }), _jsx("th", { style: { ...TH, padding: "7px 10px", fontSize: 10 }, children: "Strategy" }), _jsx("th", { style: { ...TH, padding: "7px 10px", fontSize: 10 }, children: "Status" })] }) }), _jsx("tbody", { children: sorted.map((sig) => {
                            const dir = getDirectionLabel(sig.action ?? "");
                            const entry = sig.entry ?? sig.entryPrice;
                            const conf = sig.confidence ?? sig.strength ?? 0;
                            const expiry = getExpiry(sig.expiresAt);
                            const confColor = conf >= 75 ? C.green : conf >= 50 ? C.amber : C.red;
                            const isExpired = sig.status?.toLowerCase() === "expired";
                            return (_jsxs("tr", { style: { opacity: isExpired ? 0.5 : 1 }, children: [_jsx("td", { style: { ...compactTD, color: C.textPrimary, fontWeight: 700, fontFamily: "monospace" }, children: sig.instrument ?? "—" }), _jsx("td", { style: compactTD, children: _jsx("span", { style: { color: dir.color, background: `${dir.color}1a`, border: `1px solid ${dir.color}44`, padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 800 }, children: dir.label }) }), _jsx("td", { style: { ...compactTD, fontFamily: "monospace" }, children: entry != null ? `$${Number(entry).toFixed(2)}` : "—" }), _jsx("td", { style: { ...compactTD, color: C.red, fontFamily: "monospace" }, children: sig.stopLoss != null ? `$${Number(sig.stopLoss).toFixed(2)}` : "—" }), _jsx("td", { style: { ...compactTD, color: C.green, fontFamily: "monospace" }, children: sig.target != null ? `$${Number(sig.target).toFixed(2)}` : "—" }), _jsx("td", { style: { ...compactTD, color: "#6366f1", fontFamily: "monospace", fontWeight: 700 }, children: sig.rrRatio != null ? `${Number(sig.rrRatio).toFixed(2)}:1` : "—" }), _jsx("td", { style: { ...compactTD, color: confColor, fontFamily: "monospace", fontWeight: 700 }, children: conf.toFixed(1) }), _jsx("td", { style: { ...compactTD, color: expiry.color, fontFamily: "monospace" }, children: expiry.label }), _jsx("td", { style: { ...compactTD, color: C.textMuted, fontSize: 11 }, children: sig.strategyType ?? sig.strategy ?? "—" }), _jsx("td", { style: { ...compactTD, color: C.textMuted, fontSize: 11, textTransform: "capitalize" }, children: sig.status ?? "active" })] }, sig.id));
                        }) })] }) }) }));
}
function AlertHistory() {
    const { isBeginner } = useExpertise();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [marketFilter, setMarketFilter] = useState("all");
    const [severityFilter, setSeverityFilter] = useState("all");
    async function load() {
        try {
            const data = await getAlerts();
            setAlerts(Array.isArray(data) ? data : []);
        }
        catch {
            // silently fail
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
    async function acknowledge(id) {
        try {
            await fetch(`/v1/alerts/${id}/acknowledge`, { method: "PATCH" });
            setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledgedAt: new Date().toISOString() } : a));
        }
        catch {
            // best-effort
        }
    }
    const filtered = alerts.filter((a) => {
        if (marketFilter !== "all" && a.market !== marketFilter)
            return false;
        if (severityFilter !== "all" && (a.severity ?? "").toLowerCase() !== severityFilter)
            return false;
        return true;
    });
    const severityColor = (sev) => {
        const s = sev?.toLowerCase();
        if (s === "extreme")
            return "#7f1d1d";
        if (s === "critical")
            return C.red;
        return C.amber;
    };
    const severityBg = (sev) => {
        const s = sev?.toLowerCase();
        if (s === "extreme")
            return "#7f1d1d33";
        if (s === "critical")
            return `${C.red}18`;
        return `${C.amber}18`;
    };
    function formatTime(ts) {
        if (!ts)
            return "—";
        const d = new Date(ts);
        const diff = Date.now() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60)
            return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24)
            return `${hrs}h ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    const MARKET_OPTS = ["all", "global", "us", "eu", "asia"];
    const SEV_OPTS = ["all", "warning", "critical", "extreme"];
    return (_jsxs("div", { style: { marginTop: 36 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }, children: [_jsx("h2", { style: { fontSize: 15, fontWeight: 600, color: C.textSecondary, margin: 0 }, children: "Alert History" }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx("div", { style: { display: "flex", gap: 3, background: "#0d1424", borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }, children: MARKET_OPTS.map((m) => (_jsx("button", { onClick: () => setMarketFilter(m), style: {
                                        padding: "3px 10px",
                                        borderRadius: 6,
                                        border: "none",
                                        background: marketFilter === m ? C.blue : "transparent",
                                        color: marketFilter === m ? "#fff" : C.textMuted,
                                        fontSize: 11,
                                        fontWeight: marketFilter === m ? 600 : 400,
                                        cursor: "pointer",
                                        textTransform: "capitalize",
                                    }, children: m === "all" ? "All Markets" : m.toUpperCase() }, m))) }), _jsx("div", { style: { display: "flex", gap: 3, background: "#0d1424", borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }, children: SEV_OPTS.map((s) => {
                                    const color = s === "all" ? C.textMuted : severityColor(s);
                                    const isAct = severityFilter === s;
                                    return (_jsx("button", { onClick: () => setSeverityFilter(s), style: {
                                            padding: "3px 10px",
                                            borderRadius: 6,
                                            border: "none",
                                            background: isAct ? (s === "all" ? C.blue : color) : "transparent",
                                            color: isAct ? "#fff" : s === "all" ? C.textMuted : color,
                                            fontSize: 11,
                                            fontWeight: isAct ? 600 : 400,
                                            cursor: "pointer",
                                            textTransform: "capitalize",
                                        }, children: s }, s));
                                }) })] })] }), loading ? (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [0, 1, 2].map((i) => _jsx(SkeletonBlock, { height: 72 }, i)) })) : filtered.length === 0 ? (_jsx(EmptyState, { icon: "\uD83D\uDD14", title: "No alerts in this period", subtitle: "Alerts appear when crash scores cross Warning (75) or Critical (90) thresholds." })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: filtered.map((alert) => {
                    const sev = alert.severity ?? "warning";
                    const color = severityColor(sev);
                    const bg = severityBg(sev);
                    const isExtreme = sev.toLowerCase() === "extreme";
                    const isAcked = !!alert.acknowledgedAt;
                    return (_jsxs(Card, { style: {
                            padding: "12px 16px",
                            borderLeft: `3px solid ${color}`,
                            background: bg,
                            opacity: isAcked ? 0.6 : 1,
                            position: "relative",
                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 14 }, children: [_jsx("span", { style: {
                                            color,
                                            background: `${color}22`,
                                            border: `1px solid ${color}55`,
                                            padding: "2px 8px",
                                            borderRadius: 4,
                                            fontSize: 10,
                                            fontWeight: 800,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.06em",
                                            flexShrink: 0,
                                            animation: isExtreme && !isAcked ? "pulse 2s infinite" : undefined,
                                        }, children: sev }), _jsx("span", { style: { color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", flexShrink: 0 }, children: alert.market ?? "—" }), _jsx("div", { style: { flex: 1, color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }, children: alert.message ?? "Alert triggered" }), alert.crashScore != null && (_jsx("span", { style: { color, fontFamily: "monospace", fontWeight: 700, fontSize: 14, flexShrink: 0 }, children: Number(alert.crashScore).toFixed(1) })), _jsx("span", { style: { color: C.textMuted, fontSize: 11, flexShrink: 0 }, children: formatTime(alert.triggeredAt ?? alert.createdAt) }), !isAcked && (_jsx("button", { onClick: () => acknowledge(alert.id), style: {
                                            padding: "3px 10px",
                                            borderRadius: 5,
                                            border: `1px solid ${C.border}`,
                                            background: "transparent",
                                            color: C.textMuted,
                                            fontSize: 11,
                                            cursor: "pointer",
                                            flexShrink: 0,
                                        }, children: "Ack" })), isAcked && (_jsx("span", { style: { color: C.textMuted, fontSize: 10, flexShrink: 0 }, children: "\u2713 acked" }))] }), isBeginner && (_jsxs("div", { style: { marginTop: 8, fontSize: 11, color: C.textMuted }, children: [sev === "warning" && "⚠ Warning: Crash score crossed 75. Monitor positions.", sev === "critical" && "🚨 Critical: Crash score crossed 90. High risk of drawdown.", sev === "extreme" && "‼️ Extreme: Market in extreme stress. Consider defensive positioning."] }))] }, alert.id));
                }) })), _jsxs("p", { style: { color: "#1e293b", fontSize: 12, marginTop: 10 }, children: [filtered.length, " of ", alerts.length, " alert", alerts.length !== 1 ? "s" : ""] })] }));
}
function hitRateColor(rate) {
    if (rate > 50)
        return C.green;
    if (rate >= 35)
        return "#f59e0b";
    return C.red;
}
function AccuracyReport() {
    const { isBeginner, isProfessional } = useExpertise();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        getSignalAccuracy()
            .then((d) => { setData(d); setError(null); })
            .catch((e) => setError(String(e)))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return _jsx(SkeletonBlock, { height: 300 });
    if (error)
        return _jsx(ErrorBanner, { message: `Failed to load accuracy data: ${error}` });
    const summary = data?.summary ?? {};
    const strategies = data?.byStrategy ?? [];
    const calibPts = (data?.calibration ?? []).map((p) => ({ x: p.confidence, y: p.accuracy }));
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 20 }, children: [isBeginner && (_jsxs("div", { style: { padding: "10px 14px", background: `${C.blue}0d`, border: `1px solid ${C.blue}22`, borderRadius: 8, fontSize: 12, color: C.textSecondary }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "Target hit rate" }), " shows how often our predicted price levels were actually reached. Higher is better."] })), _jsxs(Card, { style: { display: "flex", gap: 32, flexWrap: "wrap", padding: "16px 20px" }, children: [_jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }, children: "Target Hit Rate" }), _jsx("div", { style: { color: summary.targetHitRate != null ? hitRateColor(summary.targetHitRate * 100) : C.textPrimary, fontSize: 22, fontWeight: 700 }, children: summary.targetHitRate != null ? `${(summary.targetHitRate * 100).toFixed(0)}%` : "—" })] }), _jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }, children: "Avg Target Accuracy" }), _jsx("div", { style: { color: C.textPrimary, fontSize: 22, fontWeight: 700 }, children: summary.avgAccuracy != null ? `${(summary.avgAccuracy * 100).toFixed(0)}%` : "—" })] }), _jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }, children: "Avg MFE" }), _jsx("div", { style: { color: C.green, fontSize: 22, fontWeight: 700 }, children: summary.avgMfe != null ? `+${(summary.avgMfe * 100).toFixed(1)}%` : "—" })] }), _jsxs("div", { children: [_jsx("div", { style: { color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }, children: "Total Signals Tracked" }), _jsx("div", { style: { color: C.textPrimary, fontSize: 22, fontWeight: 700 }, children: summary.totalSignals ?? "—" })] })] }), strategies.length > 0 && (_jsxs("div", { children: [_jsx(SectionTitle, { children: "Strategy Breakdown" }), _jsx("div", { style: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }, children: _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH, children: "Strategy" }), _jsx("th", { style: TH, children: "Signals" }), _jsx("th", { style: TH, children: "Target Hit Rate" }), _jsx("th", { style: TH, children: "Avg Accuracy" }), isProfessional && _jsx("th", { style: TH, children: "Avg MFE" }), isProfessional && _jsx("th", { style: TH, children: "Avg MAE" })] }) }), _jsx("tbody", { children: strategies.map((row, i) => {
                                            const hitPct = row.targetHitRate * 100;
                                            const color = hitRateColor(hitPct);
                                            return (_jsxs("tr", { style: { borderTop: i > 0 ? `1px solid ${C.border}` : undefined }, children: [_jsx("td", { style: { ...TD, color: C.textPrimary, fontWeight: 600 }, children: row.strategy }), _jsx("td", { style: { ...TD, color: C.textMuted }, children: row.signals }), _jsxs("td", { style: TD, children: [_jsxs("span", { style: { color, fontWeight: 700 }, children: [hitPct.toFixed(0), "%"] }), _jsx("span", { style: { marginLeft: 6, fontSize: 10, color: color === C.green ? "#166534" : color === C.red ? "#7f1d1d" : "#78350f", background: `${color}22`, padding: "1px 6px", borderRadius: 4, border: `1px solid ${color}44` }, children: hitPct > 50 ? "Good" : hitPct >= 35 ? "Fair" : "Poor" })] }), _jsxs("td", { style: { ...TD, color: C.textSecondary }, children: [(row.avgAccuracy * 100).toFixed(0), "%"] }), isProfessional && _jsxs("td", { style: { ...TD, color: C.green }, children: ["+", (row.avgMfe * 100).toFixed(1), "%"] }), isProfessional && _jsxs("td", { style: { ...TD, color: C.red }, children: [(row.avgMae * 100).toFixed(1), "%"] })] }, row.strategy));
                                        }) })] }) }) })] })), calibPts.length > 0 && (_jsxs("div", { children: [_jsx(SectionTitle, { info: "A well-calibrated system shows dots along the diagonal \u2014 stated confidence matches actual accuracy.", children: "Calibration Chart" }), _jsxs(Card, { children: [_jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(ScatterChart, { margin: { top: 10, right: 20, bottom: 20, left: -10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1a2436" }), _jsx(XAxis, { type: "number", dataKey: "x", name: "Stated Confidence", domain: [0, 100], tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, label: { value: "Stated Confidence (%)", position: "insideBottom", offset: -12, fill: C.textMuted, fontSize: 11 } }), _jsx(YAxis, { type: "number", dataKey: "y", name: "Actual Accuracy", domain: [0, 100], tick: { fill: C.textMuted, fontSize: 11 }, axisLine: false, tickLine: false, label: { value: "Actual Accuracy (%)", angle: -90, position: "insideLeft", offset: 16, fill: C.textMuted, fontSize: 11 } }), _jsx(Tooltip, { cursor: { strokeDasharray: "3 3" }, contentStyle: { background: "#1a2332", border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 12 }, formatter: (val, name) => [`${Number(val).toFixed(1)}%`, name] }), _jsx(ReferenceLine, { segment: [{ x: 0, y: 0 }, { x: 100, y: 100 }], stroke: "#334155", strokeDasharray: "6 3", label: { value: "Perfect", fill: "#334155", fontSize: 10 } }), _jsx(Scatter, { name: "Signals", data: calibPts, fill: C.blue, opacity: 0.7 })] }) }), _jsx("p", { style: { color: C.textMuted, fontSize: 11, marginTop: 4, textAlign: "center" }, children: "Dots on the diagonal line = perfectly calibrated confidence scores" })] })] })), strategies.length === 0 && calibPts.length === 0 && (_jsx(EmptyState, { icon: "\uD83D\uDCCA", title: "No accuracy data yet", subtitle: "Accuracy data is collected as signals expire and are evaluated against outcomes." }))] }));
}
export function Signals() {
    const { isBeginner, isProfessional } = useExpertise();
    const [pageTab, setPageTab] = useState("signals");
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Filters
    const [direction, setDirection] = useState("all");
    const [strategyType, setStrategyType] = useState("all");
    const [minConfidence, setMinConfidence] = useState(0);
    const [sortField, setSortField] = useState("recency");
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
    // Derive strategy types for filter dropdown
    const strategyTypes = Array.from(new Set(signals.map((s) => s.strategyType ?? s.strategy).filter(Boolean)));
    const filtered = filterAndSortSignals(signals, direction, strategyType, minConfidence, sortField);
    const activeCount = signals.filter((s) => !["expired", "closed", "cancelled"].includes(s.status?.toLowerCase() ?? "")).length;
    const longCount = signals.filter((s) => ["BUY", "LONG"].includes(s.action?.toUpperCase() ?? "")).length;
    const shortCount = signals.filter((s) => ["SELL", "SHORT"].includes(s.action?.toUpperCase() ?? "")).length;
    const DIRECTION_TABS = [
        { id: "all", label: "All", count: signals.length },
        { id: "long", label: "Long ↑", count: longCount },
        { id: "short", label: "Short ↓", count: shortCount },
    ];
    return (_jsxs("div", { style: { padding: 28 }, children: [_jsxs("div", { style: { marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }, children: [_jsxs("div", { children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }, children: "Trading Signals" }), _jsxs("p", { style: { color: C.textMuted, marginTop: 5, fontSize: 13 }, children: [activeCount, " active \u00B7 ", signals.length, " total \u00B7 auto-refreshes every 60s"] })] }), _jsx("div", { style: { display: "flex", gap: 4, background: "#0f172a", border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }, children: ["signals", "accuracy"].map((t) => (_jsx("button", { onClick: () => setPageTab(t), style: {
                                padding: "7px 18px",
                                borderRadius: 7,
                                border: pageTab === t ? `1px solid ${C.blue}44` : "1px solid transparent",
                                background: pageTab === t ? `${C.blue}18` : "transparent",
                                color: pageTab === t ? C.blue : C.textMuted,
                                fontWeight: pageTab === t ? 600 : 400,
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.15s",
                                textTransform: "capitalize",
                            }, children: t === "signals" ? "Active Signals" : "Accuracy Report" }, t))) })] }), pageTab === "accuracy" && _jsx(AccuracyReport, {}), pageTab === "signals" && (_jsxs(_Fragment, { children: [error && _jsx(ErrorBanner, { message: `Failed to load signals: ${error}`, onRetry: load }), _jsxs("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }, children: [_jsx("div", { style: { display: "flex", gap: 3, background: "#0d1424", borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }, children: DIRECTION_TABS.map((tab) => (_jsxs("button", { onClick: () => setDirection(tab.id), style: {
                                        padding: "5px 14px",
                                        borderRadius: 6,
                                        border: "none",
                                        background: direction === tab.id ? C.blue : "transparent",
                                        color: direction === tab.id ? "#fff" : C.textMuted,
                                        fontWeight: direction === tab.id ? 600 : 400,
                                        fontSize: 12,
                                        cursor: "pointer",
                                        transition: "all 0.12s",
                                    }, children: [tab.label, _jsx("span", { style: {
                                                marginLeft: 5,
                                                opacity: 0.8,
                                                fontSize: 11,
                                                background: direction === tab.id ? "rgba(255,255,255,0.2)" : "#1e293b",
                                                padding: "0px 5px",
                                                borderRadius: 8,
                                            }, children: tab.count })] }, tab.id))) }), strategyTypes.length > 0 && (_jsxs("select", { value: strategyType, onChange: (e) => setStrategyType(e.target.value), style: {
                                    padding: "6px 10px",
                                    borderRadius: 8,
                                    border: `1px solid ${C.border}`,
                                    background: "#0d1424",
                                    color: C.textSecondary,
                                    fontSize: 12,
                                    cursor: "pointer",
                                }, children: [_jsx("option", { value: "all", children: "All Strategies" }), strategyTypes.map((t) => (_jsx("option", { value: t, children: t }, t)))] })), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 12 }, children: "Min confidence:" }), _jsxs("select", { value: minConfidence, onChange: (e) => setMinConfidence(Number(e.target.value)), style: {
                                            padding: "6px 10px",
                                            borderRadius: 8,
                                            border: `1px solid ${C.border}`,
                                            background: "#0d1424",
                                            color: C.textSecondary,
                                            fontSize: 12,
                                            cursor: "pointer",
                                        }, children: [_jsx("option", { value: 0, children: "Any" }), _jsx("option", { value: 50, children: "50+" }), _jsx("option", { value: 65, children: "65+" }), _jsx("option", { value: 75, children: "75+" }), _jsx("option", { value: 85, children: "85+" })] })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }, children: [_jsx("span", { style: { color: C.textMuted, fontSize: 12 }, children: "Sort:" }), ["recency", "strength", "confidence"].map((field) => (_jsx("button", { onClick: () => setSortField(field), style: {
                                            padding: "4px 10px",
                                            borderRadius: 6,
                                            border: `1px solid ${sortField === field ? C.blue + "66" : C.border}`,
                                            background: sortField === field ? `${C.blue}18` : "transparent",
                                            color: sortField === field ? C.blue : C.textMuted,
                                            fontSize: 11,
                                            cursor: "pointer",
                                            textTransform: "capitalize",
                                            transition: "all 0.1s",
                                        }, children: field }, field)))] })] }), isBeginner && (_jsxs("div", { style: {
                            padding: "10px 14px",
                            background: `${C.blue}0d`,
                            border: `1px solid ${C.blue}22`,
                            borderRadius: 8,
                            fontSize: 12,
                            color: C.textSecondary,
                            marginBottom: 16,
                        }, children: ["\uD83D\uDCDA ", _jsx("strong", { children: "What is a signal?" }), " A signal is a recommendation to buy (Long) or sell short (Short) an asset. Confidence (0\u2013100) shows how strongly conditions are met. Click any card to see full reasoning."] })), loading && !signals.length ? (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [0, 1, 2, 3].map((i) => _jsx(SkeletonBlock, { height: 130 }, i)) })) : !filtered.length ? (_jsx(EmptyState, { icon: "\uD83D\uDCC8", title: "No signals match filters", subtitle: "Try adjusting direction, strategy type, or minimum confidence." })) : isProfessional ? (_jsx(ProSignalsTable, { signals: filtered })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: filtered.map((sig) => (_jsx(SignalCard, { signal: sig }, sig.id))) })), _jsxs("p", { style: { color: "#1e293b", fontSize: 12, marginTop: 14 }, children: [filtered.length, " of ", signals.length, " signal", signals.length !== 1 ? "s" : ""] }), _jsx(AlertHistory, {})] }))] }));
}
