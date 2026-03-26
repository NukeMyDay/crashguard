import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer, } from "recharts";
import { getScoreHistory, getRegimeHistory, getSignals } from "../api.js";
const MARKET_OPTIONS = [
    { label: "Global", value: "global" },
    { label: "US", value: "us" },
    { label: "EU", value: "eu" },
    { label: "Asia", value: "asia" },
];
const DAYS_OPTIONS = [7, 30, 90, 180];
const MARKET_COLORS = {
    global: "#6366f1",
    us: "#3b82f6",
    eu: "#8b5cf6",
    asia: "#06b6d4",
};
const REGIME_COLORS = {
    BULL: "#22c55e",
    BEAR: "#ef4444",
    SIDEWAYS: "#eab308",
    CRASH: "#b91c1c",
    RECOVERY: "#3b82f6",
};
const OUTCOME_COLORS = {
    WIN: "#22c55e",
    LOSS: "#ef4444",
    OPEN: "#eab308",
};
function ButtonGroup({ options, active, onSelect, labelFn, }) {
    return (_jsx("div", { style: {
            display: "flex",
            gap: 3,
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: 3,
        }, children: options.map((opt) => {
            const isActive = opt === active;
            return (_jsx("button", { onClick: () => onSelect(opt), style: {
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: isActive ? "1px solid #6366f133" : "1px solid transparent",
                    background: isActive ? "#6366f122" : "transparent",
                    color: isActive ? "#818cf8" : "#64748b",
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                }, children: labelFn ? labelFn(opt) : String(opt) }, String(opt)));
        }) }));
}
function SectionTitle({ children }) {
    return (_jsx("h2", { style: {
            fontSize: 16,
            fontWeight: 600,
            color: "#cbd5e1",
            marginBottom: 14,
            marginTop: 0,
        }, children: children }));
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
export function History() {
    const [market, setMarket] = useState("global");
    const [days, setDays] = useState(30);
    const [scoreHistory, setScoreHistory] = useState([]);
    const [regimeHistory, setRegimeHistory] = useState([]);
    const [closedSignals, setClosedSignals] = useState([]);
    const [scoreLoading, setScoreLoading] = useState(true);
    const [regimeLoading, setRegimeLoading] = useState(true);
    const [signalsLoading, setSignalsLoading] = useState(true);
    const [scoreError, setScoreError] = useState(null);
    const [regimeError, setRegimeError] = useState(null);
    async function loadScores(m, d) {
        setScoreLoading(true);
        try {
            const data = await getScoreHistory(m, d);
            setScoreHistory(Array.isArray(data) ? data : []);
            setScoreError(null);
        }
        catch (e) {
            setScoreError(String(e));
        }
        finally {
            setScoreLoading(false);
        }
    }
    async function loadRegime() {
        setRegimeLoading(true);
        try {
            const data = await getRegimeHistory();
            setRegimeHistory(Array.isArray(data) ? data : []);
            setRegimeError(null);
        }
        catch (e) {
            setRegimeError(String(e));
        }
        finally {
            setRegimeLoading(false);
        }
    }
    async function loadSignals() {
        setSignalsLoading(true);
        try {
            const data = await getSignals(true);
            setClosedSignals(Array.isArray(data) ? data.filter((s) => s.status !== "open") : []);
        }
        catch {
            setClosedSignals([]);
        }
        finally {
            setSignalsLoading(false);
        }
    }
    useEffect(() => {
        loadScores(market, days);
    }, [market, days]);
    useEffect(() => {
        loadRegime();
        loadSignals();
        const interval = setInterval(() => {
            loadRegime();
            loadSignals();
        }, 60000);
        return () => clearInterval(interval);
    }, []);
    // Refresh scores on interval too
    useEffect(() => {
        const interval = setInterval(() => loadScores(market, days), 60000);
        return () => clearInterval(interval);
    }, [market, days]);
    // Build chart data
    const chartData = [...scoreHistory]
        .reverse()
        .map((s) => ({
        time: new Date(s.calculatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        }),
        score: Number(s.crashScore),
    }));
    const lineColor = MARKET_COLORS[market];
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: 0 }, children: "History" }), _jsx("p", { style: { color: "#64748b", marginTop: 4, fontSize: 13 }, children: "Historical crash scores, regime changes, and signal performance" })] }), _jsxs("div", { style: { display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }, children: [_jsxs("div", { children: [_jsx("div", { style: { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }, children: "Market" }), _jsx(ButtonGroup, { options: MARKET_OPTIONS.map((m) => m.value), active: market, onSelect: setMarket, labelFn: (v) => MARKET_OPTIONS.find((m) => m.value === v)?.label ?? v })] }), _jsxs("div", { children: [_jsx("div", { style: { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }, children: "Period" }), _jsx(ButtonGroup, { options: DAYS_OPTIONS, active: days, onSelect: setDays, labelFn: (v) => `${v}d` })] })] }), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsxs(SectionTitle, { children: ["Crash Score History \u2014 ", MARKET_OPTIONS.find((m) => m.value === market)?.label] }), scoreLoading && (_jsx("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            padding: 40,
                            textAlign: "center",
                            color: "#64748b",
                        }, children: "Loading chart data..." })), !scoreLoading && scoreError && (_jsxs("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #ef444433",
                            borderRadius: 10,
                            padding: 20,
                            color: "#f87171",
                        }, children: ["Score history unavailable: ", scoreError] })), !scoreLoading && !scoreError && chartData.length === 0 && (_jsx("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            padding: 40,
                            textAlign: "center",
                            color: "#475569",
                            fontSize: 14,
                        }, children: "No historical data for this market / period" })), !scoreLoading && !scoreError && chartData.length > 0 && (_jsx("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            padding: 20,
                        }, children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1e293b" }), _jsx(XAxis, { dataKey: "time", stroke: "#475569", tick: { fontSize: 11 }, interval: "preserveStartEnd" }), _jsx(YAxis, { domain: [0, 100], stroke: "#475569", tick: { fontSize: 11 } }), _jsx(Tooltip, { contentStyle: {
                                            background: "#0f172a",
                                            border: "1px solid #334155",
                                            color: "#e2e8f0",
                                            fontSize: 12,
                                        } }), _jsx(Legend, { wrapperStyle: { color: "#94a3b8", fontSize: 12 } }), _jsx(ReferenceLine, { y: 75, stroke: "#ef4444", strokeDasharray: "4 2", label: { value: "Critical (75)", fill: "#ef4444", fontSize: 11 } }), _jsx(ReferenceLine, { y: 50, stroke: "#f97316", strokeDasharray: "4 2", label: { value: "High (50)", fill: "#f97316", fontSize: 11 } }), _jsx(Line, { type: "monotone", dataKey: "score", stroke: lineColor, dot: false, strokeWidth: 2, name: "Crash Score" })] }) }) }))] }), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { children: "Regime Change Timeline" }), regimeLoading && _jsx("p", { style: { color: "#64748b" }, children: "Loading regime history..." }), !regimeLoading && regimeError && (_jsx("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            padding: 16,
                            color: "#475569",
                            fontSize: 14,
                        }, children: "Regime history unavailable" })), !regimeLoading && !regimeError && regimeHistory.length === 0 && (_jsx("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            padding: 32,
                            textAlign: "center",
                            color: "#475569",
                            fontSize: 14,
                        }, children: "No regime changes recorded" })), !regimeLoading && regimeHistory.length > 0 && (_jsx("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            overflow: "hidden",
                        }, children: _jsx("div", { style: { display: "flex", flexDirection: "column" }, children: regimeHistory.map((event, i) => {
                                const fromColor = REGIME_COLORS[event.from?.toUpperCase()] ?? "#94a3b8";
                                const toColor = REGIME_COLORS[event.to?.toUpperCase()] ?? "#94a3b8";
                                return (_jsxs("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 16,
                                        padding: "12px 20px",
                                        borderBottom: i < regimeHistory.length - 1 ? "1px solid #1e293b" : undefined,
                                        background: i % 2 === 0 ? "transparent" : "#0a1120",
                                    }, children: [_jsx("div", { style: { color: "#64748b", fontSize: 12, width: 100, flexShrink: 0 }, children: event.date
                                                ? new Date(event.date).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })
                                                : "—" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flex: 1 }, children: [_jsx("span", { style: {
                                                        color: fromColor,
                                                        fontWeight: 700,
                                                        fontSize: 12,
                                                        background: `${fromColor}22`,
                                                        border: `1px solid ${fromColor}44`,
                                                        padding: "2px 8px",
                                                        borderRadius: 4,
                                                        textTransform: "uppercase",
                                                    }, children: event.from ?? "—" }), _jsx("span", { style: { color: "#475569", fontSize: 13 }, children: "\u2192" }), _jsx("span", { style: {
                                                        color: toColor,
                                                        fontWeight: 700,
                                                        fontSize: 12,
                                                        background: `${toColor}22`,
                                                        border: `1px solid ${toColor}44`,
                                                        padding: "2px 8px",
                                                        borderRadius: 4,
                                                        textTransform: "uppercase",
                                                    }, children: event.to ?? "—" })] }), event.market && (_jsx("div", { style: { color: "#475569", fontSize: 12, textTransform: "uppercase" }, children: event.market }))] }, i));
                            }) }) }))] }), _jsxs("div", { style: { marginBottom: 32 }, children: [_jsx(SectionTitle, { children: "Past Signals Performance" }), signalsLoading && _jsx("p", { style: { color: "#64748b" }, children: "Loading signal history..." }), !signalsLoading && closedSignals.length === 0 && (_jsx("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            padding: 32,
                            textAlign: "center",
                            color: "#475569",
                            fontSize: 14,
                        }, children: "No closed signals to review" })), !signalsLoading && closedSignals.length > 0 && (_jsx("div", { style: {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 10,
                            overflow: "hidden",
                        }, children: _jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: "#1e293b" }, children: [_jsx("th", { style: TH, children: "Date" }), _jsx("th", { style: TH, children: "Instrument" }), _jsx("th", { style: TH, children: "Action" }), _jsx("th", { style: TH, children: "Strategy" }), _jsx("th", { style: TH, children: "Target" }), _jsx("th", { style: TH, children: "Actual Result" }), _jsx("th", { style: TH, children: "Outcome" })] }) }), _jsx("tbody", { children: closedSignals.map((sig, i) => {
                                        const outcome = (sig.outcome ?? sig.status ?? "OPEN").toUpperCase();
                                        const outcomeColor = OUTCOME_COLORS[outcome] ?? "#94a3b8";
                                        const actionColor = sig.action === "BUY"
                                            ? "#22c55e"
                                            : sig.action === "SHORT"
                                                ? "#ef4444"
                                                : "#f97316";
                                        return (_jsxs("tr", { style: {
                                                borderTop: i > 0 ? "1px solid #1e293b" : undefined,
                                                background: i % 2 === 0 ? "transparent" : "#0a1120",
                                            }, children: [_jsx("td", { style: { ...TD, color: "#64748b" }, children: sig.createdAt
                                                        ? new Date(sig.createdAt).toLocaleDateString()
                                                        : "—" }), _jsx("td", { style: { ...TD, color: "#e2e8f0", fontWeight: 600 }, children: sig.instrument ?? "—" }), _jsx("td", { style: TD, children: _jsx("span", { style: { color: actionColor, fontWeight: 700, fontSize: 11 }, children: sig.action?.toUpperCase() ?? "—" }) }), _jsx("td", { style: TD, children: sig.strategy ?? "—" }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: sig.target != null ? Number(sig.target).toFixed(2) : "—" }), _jsx("td", { style: { ...TD, fontVariantNumeric: "tabular-nums" }, children: sig.actualResult != null
                                                        ? Number(sig.actualResult).toFixed(2)
                                                        : sig.closePrice != null
                                                            ? Number(sig.closePrice).toFixed(2)
                                                            : "—" }), _jsx("td", { style: TD, children: _jsx("span", { style: {
                                                            color: outcomeColor,
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            background: `${outcomeColor}22`,
                                                            border: `1px solid ${outcomeColor}44`,
                                                            padding: "2px 8px",
                                                            borderRadius: 4,
                                                        }, children: outcome }) })] }, sig.id ?? i));
                                    }) })] }) }))] })] }));
}
